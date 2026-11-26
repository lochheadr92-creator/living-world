// Rules 264 (the social scenes stream, bundle E, part 15 of `docs/SOCIAL_SCENES_PLAN.md`): standing up for someone. Somebody who comes upon two people quarrelling
// and is kin or fond of exactly one of them walks over and speaks up for that one.
//
// What stood before: a quarrel (social.ts startArgument, from the loss of the last of some food) is a 90-tick `argue` activity for each side, with a conflict line in the feed.
// Anybody who saw it (witness()) thought a little less of the one who started it. Somebody close to BOTH sides may step in after it has cooled (mediation.ts). Nobody took a side.
//
// One part, `side` (switched in together_scenes.ts, with `speech`, speak_for.ts, and `fetch`, fetch_home.ts). From rules 264:
//
//   the cue     A person who is not a child, is not one of the two, has no critical need and believes in no danger, and SEES a quarrel (two people whose visible act is
//               `argue`, within SIDE_PAIR tiles of one another) with the nearer of them within SIDE_SEE tiles, and who by their OWN record is kin or fond (affinity SIDE_FOND
//               or more) of exactly one of the two, may go and speak up for that one. Not if they have stood up for anybody in the last day, nor if it is further than they
//               could walk in SIDE_WALK_MAX ticks (a quarrel is a short thing). Worth SIDE_SCORE less the walk (options_social.ts via standUpOption), and the moment a quarrel
//               starts those who could would take it up are made to think again within a few ticks (noticeQuarrel, called from startArgument), because a quarrel is over in
//               about forty ticks and the ordinary rest of forty-five ticks between one thought and the next would let nearly every one of them miss it.
//   the scene   An ordinary `rest` activity marked `data.side`, sticky, that walks to the one stood up for. On reaching them (within SIDE_REACH) the supporter finds them still
//               arguing, with nobody else having spoken up (the quarrel's two `argue` activities carry `data.sided`, the one who did): one spoken line (dialogue.ts SIDE_LINES),
//               and they stay beside them SIDE_STAND ticks. One supporter for each quarrel: the first to arrive.
//   the effect  The one stood up for has a glad thought (SIDE_GLAD for half a day) and grows closer to (SIDE_AFFINITY) and more trusting of (SIDE_TRUST) the supporter; the other side
//               thinks a little less of the supporter (SIDE_OTHER_AFFINITY, with a note in their record of them). The quarrel itself is NOT touched: its length, its grievances, the
//               relations it changed and what it was over are as they were, and mediation.ts finds the same quarrel to step into afterwards. Nobody is hurt, and no second quarrel
//               is started.
//   the line    One line in the feed, kind `social`: "B stood up for A against C."
//   failure     If the quarrel is over before the supporter arrives, or somebody has spoken up already, or the one stood up for is not where they were, they turn back and
//               nothing is said or written anywhere (not even in their own log).
//
// Nothing here reads anybody's true state beyond what is physically there to be found on arrival (that the quarrel is still going on, and that somebody has just spoken):
// the cue is the supporter's own sight and their own record of the two. No draw from the shared stream is made. Saved: the supporter's own record in the activity's data
// (`side`: whom, against whom, since when, whether they have spoken), the quarrel's `sided` (the supporter's id, on both sides' `argue` activities) and the supporter's
// ordinary `cooldowns` (the day's rest); all in the fingerprint (world.ts) and checked on loading (validateTakingSides). Rich worlds at rules 264 and later only; rules 263
// and earlier, authored worlds and a part switched off keep the old behaviour.
import { faceToward, newActivity, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { SIDE_LINES, saying } from './dialogue';
import { addEvent, addLog, say } from './events';
import { sameSpace } from './habitation';
import { think } from './mood';
import { Scorer, addOption, pen } from './optutil';
import type { Ctx } from './optutil';
import { stageOf } from './people';
import { senseRadius } from './perception';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import { personOf } from './social';
import { TOGETHER_FROM, hasTakingSides } from './together_scenes';
import type { Activity, Person, SeenEntity, World } from './types';
import { couldWitness } from './witness_sight';
import { hyp } from './util';

// ── the cue ──
/** how far the nearer of the two may be from the one who sees it ("within about 8 tiles") */
export const SIDE_SEE = 8;
/** the two seen quarrelling are one quarrel when they stand this near one another (a quarrel is begun within 7 tiles, social.ts contestLost) */
export const SIDE_PAIR = 7;
/** liking this much, or kin, is close enough to take a side: the affinity mediation.ts and the rest of the code call a friend is 28 to 32; the plan's figure is 30 */
export const SIDE_FOND = 30;
/** a quarrel is over in about forty ticks: nobody sets out for one that is further than they can walk in this long */
export const SIDE_WALK_MAX = 40;
/** what standing up for somebody is worth before the walk (above ordinary work, 20 to 45; below any pressing need) */
export const SIDE_SCORE = 56;
/** a person stands up for somebody at most once in this long */
export const SIDE_REST = DAY;
/** a supporter who turned back waits this long before going to the same person again */
export const SIDE_RETRY = 300;
// ── the scene ──
/** near enough to be heard by the one stood up for */
export const SIDE_REACH = 3.2;
/** the supporter stays beside them this many ticks after speaking */
export const SIDE_STAND = 24;
// ── what it does ──
export const SIDE_GLAD = 4;
export const SIDE_GLAD_FOR = DAY / 2;
export const SIDE_AFFINITY = 3;
export const SIDE_TRUST = 2;
export const SIDE_FAMILIARITY = 1;
export const SIDE_OTHER_AFFINITY = -2;
/** a person made to think again by a quarrel they could take up does so within this many ticks (perception runs every third tick) */
export const SIDE_NOTICE = 4;

export interface SideData {
  /** the one stood up for, and the other side */
  for: number;
  against: number;
  /** when it was chosen */
  since: number;
  /** the line has been said */
  said?: true;
}

const sideOf = (a: Activity | null | undefined): SideData | undefined => (a && a.kind === 'rest' ? (a.data.side as SideData | undefined) : undefined);
export const isStandingUp = (a: Activity | null | undefined): boolean => sideOf(a) !== undefined;

/** by this person's own record: kin, or fond enough */
export const kinOrFond = (p: Person, q: Person): boolean => {
  const r = p.relations[q.id];
  return !!r && (!!r.kin || r.affinity >= SIDE_FOND);
};

/** the two a seen quarrel is between: two seen people whose visible act is `argue` and who stand near one another, the pair nearest to the watcher */
function quarrelSeen(p: Person, seen: SeenEntity[]): { a: SeenEntity; b: SeenEntity } | null {
  let best: { a: SeenEntity; b: SeenEntity; d: number } | null = null;
  for (const s of seen) {
    if (s.ent !== 'person' || s.act !== 'argue' || s.id === p.id) continue;
    for (const t of seen) {
      if (t.ent !== 'person' || t.act !== 'argue' || t.id <= s.id || t.id === p.id || hyp(s.x - t.x, s.y - t.y) > SIDE_PAIR) continue;
      const d = Math.min(hyp(s.x - p.x, s.y - p.y), hyp(t.x - p.x, t.y - p.y));
      if (d <= SIDE_SEE && (!best || d < best.d)) best = { a: s, b: t, d };
    }
  }
  return best;
}

/** who a person who has come upon this quarrel would stand up for, if anybody: the one of the two they are kin or fond of, when it is exactly one */
function sideTaken(world: World, p: Person, s: SeenEntity, t: SeenEntity): { A: Person; C: Person; s: SeenEntity } | null {
  const q = world.byId.get(s.id), r = world.byId.get(t.id);
  if (!q || q.ent !== 'person' || !q.alive || !r || r.ent !== 'person' || !r.alive) return null;
  const fq = kinOrFond(p, q), fr = kinOrFond(p, r);
  if (fq === fr) return null;
  return fq ? { A: q, C: r, s } : { A: r, C: q, s: t };
}

// ───────────────────────── the cue (options_social.ts socialOptions) ─────────────────────────
/** Offered to a person who sees a quarrel and is kin or fond of exactly one side. */
export function standUpOption(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!hasTakingSides(world) || ctx.stage === 'child' || ctx.criticals.length || ctx.dangers.length || p.convId || p.indoors || p.activity?.kind === 'argue') return;
  if ((p.cooldowns.sided ?? 0) > world.tick || p.activity?.data.side !== undefined) return;
  const pair = quarrelSeen(p, ctx.seenPersons);
  if (!pair) return;
  const taken = sideTaken(world, p, pair.a, pair.b);
  if (!taken) return;
  const { A, C, s } = taken;
  if ((p.cooldowns['side' + A.id] ?? 0) > world.tick) return;
  const e = (hyp(s.x - p.x, s.y - p.y) * 1.18) / Math.max(0.03, ctx.speed);
  if (e > SIDE_WALK_MAX) return;
  const sc = new Scorer().add(`${A.name} is being quarrelled with`, SIDE_SCORE).add('walking', -pen(e));
  const spot = standSpotFor(world, p, A) ?? { x: s.x, y: s.y };
  addOption(ctx, {
    kind: 'rest',
    label: `Stand up for ${A.name}`,
    goal: `to speak up for ${A.name} in the quarrel with ${C.name}`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + SIDE_STAND,
    key: `side:${A.id}`,
    targetId: A.id,
    tag: 'social',
    make: () => {
      const data: SideData = { for: A.id, against: C.id, since: world.tick };
      return newActivity(world, p, {
        kind: 'rest',
        label: `Going to stand up for ${A.name}`,
        goal: `to speak up for ${A.name} in the quarrel with ${C.name}`,
        targetId: A.id,
        targetType: 'person',
        tx: s.x,
        ty: s.y,
        spotX: spot.x,
        spotY: spot.y,
        amount: SIDE_STAND + 60,
        utility: sc.total,
        minCommit: 40,
        maxTicks: Math.ceil(e) + SIDE_STAND + 120,
        data: { side: data, sticky: true },
      });
    },
  });
}

/**
 * A quarrel has just begun (social.ts startArgument): anybody near who could take it up is made to think again within a few ticks. This writes nothing and decides nothing
 * for them: it only brings forward the moment they next look at their options, as a witnessed quarrel would catch the eye. Those it concerns are those who are awake, out
 * of doors, in sight of it, not a child, not rested from a day's standing up, and kin or fond of exactly one of the two by their own record.
 */
export function noticeQuarrel(world: World, a: Person, b: Person): void {
  if (!hasTakingSides(world)) return;
  for (const q of world.persons) {
    if (!q.alive || q === a || q === b || q.pose === 'sleep' || q.indoors || q.convId || (q.cooldowns.sided ?? 0) > world.tick) continue;
    if (!couldWitness(world, q, a, a.x, a.y, SIDE_SEE) || stageOf(world, q) === 'child') continue;
    if (kinOrFond(q, a) === kinOrFond(q, b)) continue;
    if (q.nextThink > world.tick + SIDE_NOTICE) q.nextThink = world.tick + SIDE_NOTICE;
  }
}

// ───────────────────────── the scene (act_misc.ts rest handler) ─────────────────────────
const arguingWith = (a: Person, c: Person): boolean => a.activity?.kind === 'argue' && a.activity.data.other === c.id;

/** the rest activity marked `side` has reached them: the quarrel is still going and nobody has spoken up, or they turn back and nothing is written */
export function sideBegin(world: World, p: Person, a: Activity): string | undefined {
  const v = sideOf(a)!;
  const A = personOf(world, v.for), C = personOf(world, v.against);
  if (!A || !C) return 'they are no longer around';
  const turnBack = (why: string): string => {
    p.cooldowns['side' + A.id] = world.tick + SIDE_RETRY;
    a.data.logged = true; // nothing is written: no "gave up" line in their own log either
    return why;
  };
  if (!hasTakingSides(world) || v.said) return turnBack('it was not to be');
  if (!sameSpace(world, p, A) || hyp(A.x - p.x, A.y - p.y) > Math.min(SIDE_REACH + 1, senseRadius(world, p))) return turnBack(`${A.name} was not where I expected`);
  const sign = p.seen.find((x) => x.id === A.id);
  if (!sign || sign.act !== 'argue' || !arguingWith(A, C) || !arguingWith(C, A)) return turnBack('the quarrel was over');
  if (A.activity!.data.sided !== undefined || C.activity!.data.sided !== undefined) return turnBack('somebody had spoken up already');
  // the first to arrive speaks up: the quarrel carries who did
  A.activity!.data.sided = p.id;
  C.activity!.data.sided = p.id;
  v.said = true;
  p.cooldowns.sided = world.tick + SIDE_REST;
  a.duration = SIDE_STAND;
  a.label = `Standing up for ${A.name}`;
  a.targetType = '';
  faceToward(p, A.x, A.y);
  say(world, p, saying(SIDE_LINES, p.id, A.id, world.tick), 'say', 90);
  think(world, A, 'stood_up_for', SIDE_GLAD, SIDE_GLAD_FOR, `${p.name} stood up for me`);
  adjustRel(A, p.id, world.tick, { aff: SIDE_AFFINITY, trust: SIDE_TRUST, fam: SIDE_FAMILIARITY, note: `${p.name} stood up for me against ${C.name}` });
  adjustRel(C, p.id, world.tick, { aff: SIDE_OTHER_AFFINITY, note: `${p.name} took ${A.name}'s side against me` });
  addEvent(world, 'social', `${p.name} stood up for ${A.name} against ${C.name}.`, [p.id, A.id, C.id], A.x, A.y);
  addLog(world, p, 'social', `Stood up for ${A.name} against ${C.name}.`);
  addLog(world, A, 'social', `${p.name} stood up for me against ${C.name}.`);
  addLog(world, C, 'social', `${p.name} took ${A.name}'s side against me.`);
  return undefined;
}

/** One tick of the standing beside them (act_misc.ts rest handler). */
export function sideWork(world: World, p: Person, a: Activity): WorkResult {
  const v = sideOf(a)!;
  const A = personOf(world, v.for);
  if (!A) return 'partial:they are gone';
  faceToward(p, A.x, A.y);
  a.progress++;
  return a.progress >= SIDE_STAND ? 'done' : 'continue';
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 264, rich only); anything else is refused on loading. */
export function validateTakingSides(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, TOGETHER_FROM);
  const int = (n: unknown, min: number, max: number): boolean => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  for (const p of w.persons) {
    for (const a of [p.activity, p.suspended]) {
      if (!a) continue;
      if (a.data.side !== undefined) {
        const v = a.data.side as SideData;
        if (!allowed || a.kind !== 'rest' || !v || !int(v.for, 1, Number.MAX_SAFE_INTEGER) || !int(v.against, 1, Number.MAX_SAFE_INTEGER) || v.for === v.against || !int(v.since, 0, w.tick) || (v.said !== undefined && v.said !== true)) throw new Error('Invalid standing up');
      }
      if (a.data.sided !== undefined && (!allowed || a.kind !== 'argue' || !int(a.data.sided, 1, Number.MAX_SAFE_INTEGER))) throw new Error('Invalid quarrel side');
    }
  }
}
