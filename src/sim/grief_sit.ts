// Rules 263 (the social scenes stream, bundle D, part 10 of `docs/SOCIAL_SCENES_PLAN.md`): sitting with the grieving. Somebody who has lost a partner, a parent,
// a child or a sibling is not left alone: a relative or a friend who knows of it comes and sits beside them for a few hundred ticks, with a word each.
//
// What stood before: only a lost PARTNER made anybody bereaved (lifechanges.ts onPartnerLost: a `lifeEvent` of ten days and a concern raised in the kin and
// the fond within eight tiles). A lost parent, child or sibling gave only a thought (death_knowledge.ts learnDeath). The look-in that followed (welfare.ts) was
// a stand of twelve ticks with no words and no line in the feed, and it was never made if the bereaved person was already in sight (the concern was dropped on
// the next sight of them, and the visit was skipped).
//
// One part, `grief` (switched in kin_scenes.ts, with `age`, coming_of_age.ts, and `settle`, settle_child.ts). From rules 263:
//
//   who          Whoever learns that their parent, child or sibling has died is bereaved exactly as a widow or widower is (lifechanges.ts onKinLost, called from
//                death_knowledge.ts learnDeath): a bereaved `lifeEvent` for ten days whose `of` says whom they lost, and the same concern raised in those near
//                who are kin or fond. The life event is read by everything that read it before (the lean on kin, the pull of company, the inspector), and its
//                words say truthfully whom was lost ("has lost their mother, Mara, and leans on those close to them").
//   the cue      The look-in becomes a sit, and it may be made even if the bereaved is already in sight: a concern of kind `bereaved` is no longer dropped on seeing
//                the person, and the offer is no longer skipped (welfare.ts). Not offered if the bereaved is seen asleep or somebody is seen sitting beside them.
//                Worth what the look-in was worth (welfare.ts), less the walk.
//   the sit      An ordinary `rest` activity marked `data.grief` beside them, sticky: only danger or a critical need ends it from outside. It lasts GRIEF_SIT_MIN to
//                GRIEF_SIT_MIN + GRIEF_SIT_SPREAD ticks (chosen by a hash of who and when, never the shared stream). On reaching them the visitor finds them awake, in
//                the same place and with nobody beside them (else turns back, and nothing is written), and says a line; a little later the bereaved answers with
//                one (if they are not already speaking). It ends at its length, or when the visitor has to see to a need of their own (thirst under 35, hunger
//                under 30, warmth under 25, energy under 12) or falls ill, or loses sight of the bereaved, or they fall asleep.
//   the count    A sit that has lasted GRIEF_MIN ticks counts, once: ONE line in the feed, "B sat with A, who has lost her mother." (the true relation: partner,
//                mother, father, son, daughter, sister, brother; "parent", "child" or "sibling" if the name says nothing of sex), the two grow a little closer (the
//                values of welfare.ts's look-in, onLookedInOnBereaved), both are a little glad, and the bereaved person's grief is eased as a visit to a grave
//                eases it (the remaining `lost:` thought times GRIEF_SHARE), at most once a day for each bereaved person however many come. A sit that did not
//                last long enough writes nothing to the feed (a line in the visitor's own log only).
//   caps         One sitter at a time for each bereaved person (checked at the place, as vigil.ts does). A visitor sits with the same person at most once a day
//                (the look-in's own rest of GRIEF_VISIT_REST ticks after a sit that counted).
//   not built    "Going to the grave together". People who share a roof share a room, but nobody enters another household's home (habitation.ts), so a visitor from
//                another household sits with somebody out of doors only.
//
// Nothing here reads anybody's true state: a visitor acts on the concern they hold (seen, or told) and on what they see of the bereaved when they get there. Deaths
// are rare at current rules (none in six settlements over 25 days, `docs/SOCIAL_SCENES_PLAN.md`): this is proven by staged tests only. Saved: `LifeEvent.of`
// (parent, child or sibling; absent for a partner), the sit's own record in the activity's data (`grief`: whom, since when, ticks sat, how long, whether it has begun and
// counted), and the bereaved person's ordinary `cooldowns` (the day's easing); all in the fingerprint (world.ts) and checked on loading (validateGriefSit). Rich
// worlds at rules 263 and later only; rules 262 and earlier, authored worlds and a part switched off keep the old behaviour.
import { faceToward, newActivity, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { GRIEF_SIT_LINES, GRIEF_SIT_REPLIES, saying } from './dialogue';
import { addEvent, addLog, say } from './events';
import { hasHabitation, sameSpace } from './habitation';
import { KIN_FROM, hasGriefSitting } from './kin_scenes';
import { lostWord, peekLifeEvent } from './lifechanges';
import { think } from './mood';
import { addOption } from './optutil';
import type { Ctx, Scorer } from './optutil';
import { senseRadius } from './perception';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import { deceasedById } from './historical_index';
import { personOf } from './social';
import type { Activity, Concern, Person, World } from './types';
import { hyp } from './util';

/** how long a sit lasts at least, and how much longer it may last by the draw of the hash: "about 200 to 300 ticks" */
export const GRIEF_SIT_MIN = 200;
export const GRIEF_SIT_SPREAD = 100;
/** near enough to be beside them (the visitor follows if they move); somebody seen sitting this near the bereaved is a sitter already */
export const GRIEF_NEAR = 3.2;
export const SITTER_NEAR = 4;
/** the shortest sit that counts (written, the grief eased, the two closer): "about 90 ticks" */
export const GRIEF_MIN = 90;
/** how soon after the visitor has spoken the bereaved answers (ticks sat) */
export const GRIEF_REPLY_AT = 24;
/** the needs under which the visitor leaves to see to themselves (as vigil.ts) */
export const LEAVE_THIRST = 35;
export const LEAVE_HUNGER = 30;
export const LEAVE_WARMTH = 25;
export const LEAVE_ENERGY = 12;
/** the remaining grief is cut to this share, as a visit to a grave cuts it (options_places.ts), at most once in GRIEF_EASE_EVERY ticks for each bereaved person */
export const GRIEF_SHARE = 0.7;
export const GRIEF_EASE_EVERY = DAY;
/** what a sit does, the values of lifechanges.ts onLookedInOnBereaved: the bereaved is fonder of the visitor, trusts them more and knows them better, and is glad of it; the visitor is a little fonder and glad */
export const GRIEF_AFFINITY = 3;
export const GRIEF_TRUST = 2;
export const GRIEF_FAMILIARITY = 1;
export const GRIEF_VISITOR_AFFINITY = 1;
export const GRIEF_GLAD = 6;
export const GRIEF_GLAD_FOR = DAY;
export const GRIEF_VISITOR_GLAD = 2;
export const GRIEF_VISITOR_GLAD_FOR = DAY / 2;
/** after a sit that counted the visitor does not come again for this long (the look-in's own rest, 1.2 days, which is more than a day); after a turning back or a short one, this long */
export const GRIEF_VISIT_REST = Math.round(DAY * 1.2);
export const GRIEF_RETRY = Math.round(DAY * 0.3);

export interface GriefData {
  /** the bereaved person sat with */
  for: number;
  /** when it was chosen, how many ticks the visitor has sat beside them, and how many ticks it is meant to last */
  since: number;
  sat: number;
  len: number;
  /** they have sat down (the first arrival); and the line has been written and the rest done */
  began?: true;
  counted?: true;
}

const griefOf = (a: Activity | null | undefined): GriefData | undefined => (a && a.kind === 'rest' ? (a.data.grief as GriefData | undefined) : undefined);
export const isGriefSit = (a: Activity | null | undefined): boolean => griefOf(a) !== undefined;
const her = (q: Person): string => (q.sex === 'f' ? 'her' : 'his');

// ───────────────────────── the cue (welfare.ts welfareOptions) ─────────────────────────
/**
 * The visit to a bereaved person, made a sit (called by welfare.ts for a concern of kind `bereaved` once it has the worth `sc` and the walk `e` worked out, and
 * `loc`, where the visitor believes them to be). Not offered if the bereaved is in sight and asleep, or somebody is in sight sitting beside them.
 */
export function griefSitOption(ctx: Ctx, c: Concern, name: string, loc: { x: number; y: number }, sc: Scorer, e: number): void {
  const { world, p } = ctx;
  const b = personOf(world, c.about);
  if (!b || ctx.dangers.length || p.activity?.data.grief !== undefined || p.activity?.data.settle !== undefined) return; // a danger believed about: not now (the sit itself is ended by danger too)
  const s = ctx.seenPersons.find((x) => x.id === c.about);
  if (s && (s.asleep || s.act === 'sleep')) return;
  if (s && ctx.seenPersons.some((o) => o.sittingWith && o.id !== p.id && hyp(o.x - s.x, o.y - s.y) <= SITTER_NEAR)) return;
  // in the same room, the visitor stays where they are; else they walk to where they believe the person is (or stand beside them if they can see them)
  const inRoom = !!s && hasHabitation(world) && !!p.indoors;
  const spot = s ? (inRoom ? { x: p.x, y: p.y } : standSpotFor(world, p, b) ?? loc) : loc;
  addOption(ctx, {
    kind: 'rest',
    label: `Sit with ${name}`,
    goal: `to sit with ${name}, who has lost someone`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + GRIEF_SIT_MIN,
    key: `grief:${c.about}`,
    targetId: c.about,
    tag: 'care',
    make: () => {
      const len = GRIEF_SIT_MIN + Math.floor(hashUnit(p.id, c.about, world.tick) * (GRIEF_SIT_SPREAD + 1));
      const data: GriefData = { for: c.about, since: world.tick, sat: 0, len };
      return newActivity(world, p, {
        kind: 'rest',
        label: `Going to sit with ${name}`,
        goal: `to sit with ${name}, who has lost someone`,
        targetId: inRoom ? p.indoors : c.about,
        ...(inRoom ? {} : { targetType: 'person' }),
        tx: s ? s.x : loc.x,
        ty: s ? s.y : loc.y,
        spotX: spot.x,
        spotY: spot.y,
        amount: len + 60,
        utility: sc.total,
        minCommit: 60,
        maxTicks: Math.ceil(e) + len + 400,
        data: { grief: data, sticky: true },
      });
    },
  });
}

// ───────────────────────── the sit (act_misc.ts rest handler) ─────────────────────────
/** somebody else is sitting beside this person, in work, in the same place: seen by anybody who is there */
function otherSitter(world: World, b: Person, except: Person): Person | null {
  for (const q of world.persons) {
    if (q === except || !q.alive || q.activity?.phase !== 'work') continue;
    const v = griefOf(q.activity);
    if (v && v.for === b.id && sameSpace(world, q, b) && hyp(q.x - b.x, q.y - b.y) <= SITTER_NEAR) return q;
  }
  return null;
}

/** the rest activity marked `grief` has reached them: they sit down, or find them asleep, gone or already sat with, and turn back with nothing written */
export function griefBegin(world: World, p: Person, a: Activity): string | undefined {
  const v = griefOf(a)!;
  const b = personOf(world, v.for);
  if (!b) return 'they are no longer around';
  if (!hasGriefSitting(world)) return 'it was not to be';
  if (v.began) {
    a.targetType = ''; // they have gone after them and caught up: nothing new
    return undefined;
  }
  const turnBack = (why: string): string => {
    delete p.whereabouts[b.id]; // as the look-in does: the old place is forgotten, and nobody looks for them again at once
    p.cooldowns['check' + b.id] = world.tick + GRIEF_RETRY;
    return why;
  };
  if (peekLifeEvent(world, b)?.kind !== 'bereaved') return 'it was not to be';
  if (!sameSpace(world, p, b) || hyp(b.x - p.x, b.y - p.y) > senseRadius(world, p)) return turnBack(`${b.name} was not where I expected`);
  if (b.pose === 'sleep') return turnBack(`${b.name} was asleep`);
  const other = otherSitter(world, b, p);
  if (other) return turnBack(`${other.name} was already sitting with ${b.name}`);
  v.began = true;
  a.duration = v.len + 60;
  a.label = `Sitting with ${b.name}`; // entering a home relabels a rest as resting inside it
  a.targetType = ''; // the walk chased them; sitting beside them, the visitor is not held to their every move (griefWork follows)
  faceToward(p, b.x, b.y);
  say(world, p, saying(GRIEF_SIT_LINES, p.id, b.id, world.tick), 'say', 120);
  return undefined;
}

/** the sit counts: the line, the two a little closer, glad, and the grief eased (once a day) */
function counted(world: World, p: Person, b: Person, v: GriefData): void {
  const e = peekLifeEvent(world, b);
  const word = lostWord(world, b);
  if (!e || !word) return;
  v.counted = true;
  const lost = deceasedById(world, e.about)?.name ?? '';
  addEvent(world, 'social', `${p.name} sat with ${b.name}, who has lost ${her(b)} ${word}.`, [p.id, b.id], b.x, b.y);
  addLog(world, p, 'social', `Sat with ${b.name}, who has lost ${her(b)} ${word}.`);
  addLog(world, b, 'social', `${p.name} sat with me.`);
  adjustRel(b, p.id, world.tick, { aff: GRIEF_AFFINITY, trust: GRIEF_TRUST, fam: GRIEF_FAMILIARITY, note: `${p.name} sat with me after ${lost || 'my loss'}` });
  adjustRel(p, b.id, world.tick, { aff: GRIEF_VISITOR_AFFINITY, fam: GRIEF_FAMILIARITY, note: `sat with ${b.name} after ${lost || 'their loss'}` });
  think(world, b, 'looked_in', GRIEF_GLAD, GRIEF_GLAD_FOR, `${p.name} sat with me`);
  think(world, p, 'looked_in', GRIEF_VISITOR_GLAD, GRIEF_VISITOR_GLAD_FOR, `sat with ${b.name}`);
  // grief eased as a visit to a grave eases it, once a day for each bereaved person however many come
  const loss = b.mood?.thoughts.find((t) => t.kind === 'lost:' + e.about && t.until > world.tick);
  if (loss && (b.cooldowns.griefEased ?? 0) <= world.tick) {
    loss.until = world.tick + Math.round((loss.until - world.tick) * GRIEF_SHARE);
    b.cooldowns.griefEased = world.tick + GRIEF_EASE_EVERY;
  }
}

/** One tick of the sit. */
export function griefWork(world: World, p: Person, a: Activity): WorkResult {
  const v = griefOf(a)!;
  const b = personOf(world, v.for);
  if (!b) return 'partial:they are gone';
  if (!hasGriefSitting(world)) return 'partial:it was not to be';
  if (!sameSpace(world, p, b)) return 'partial:they are not in the same place now';
  const d = hyp(b.x - p.x, b.y - p.y);
  if (d > senseRadius(world, p)) return 'partial:lost sight of them';
  faceToward(p, b.x, b.y);
  if (d > GRIEF_NEAR) {
    // they have moved: follow
    a.tx = b.x;
    a.ty = b.y;
    a.spotX = b.x;
    a.spotY = b.y;
    a.phase = 'travel';
    a.path = [];
    a.pi = 0;
    a.pathTries = 0; // so that the walk is planned again (stepTravel plans only when no try has been made)
    return 'continue';
  }
  v.sat++;
  const n = p.needs;
  if (p.illness) return 'partial:I am ill myself';
  if (n.thirst < LEAVE_THIRST || n.hunger < LEAVE_HUNGER || n.warmth < LEAVE_WARMTH || n.energy < LEAVE_ENERGY) return 'partial:I had to see to myself';
  if (b.pose === 'sleep') return 'partial:they fell asleep';
  if (v.sat === GRIEF_REPLY_AT && !(b.speech && b.speech.until > world.tick)) say(world, b, saying(GRIEF_SIT_REPLIES, b.id, p.id, world.tick), 'say', 120);
  if (v.sat === GRIEF_MIN && !v.counted) counted(world, p, b, v);
  a.progress++;
  return v.sat >= v.len ? 'done' : 'continue';
}

/** The sit has ended, however it ended (act_misc.ts rest handler onEnd): the visitor waits before coming again, and the worry is settled if the sit counted. */
export function griefEnd(world: World, p: Person, a: Activity, outcome: string, detail: string): void {
  const v = griefOf(a);
  if (!v || !v.began) return;
  const b = personOf(world, v.for);
  p.cooldowns['check' + v.for] = world.tick + (v.counted ? GRIEF_VISIT_REST : GRIEF_RETRY);
  if (v.counted) p.concerns = p.concerns.filter((c) => c.about !== v.for);
  else if (b && v.sat > 0) addLog(world, p, 'social', `Sat with ${b.name} for a little, then ${detail || (outcome === 'interrupted' ? 'had to go' : 'left')}.`);
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 263, rich only); anything else is refused on loading. */
export function validateGriefSit(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, KIN_FROM);
  const int = (n: unknown, min: number, max: number): boolean => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  for (const p of w.persons) {
    const e = p.lifeEvent;
    if (e && e.of !== undefined && (!allowed || e.kind !== 'bereaved' || (e.of !== 'parent' && e.of !== 'child' && e.of !== 'sibling'))) throw new Error('Invalid bereavement');
    for (const a of [p.activity, p.suspended]) {
      if (!a || a.data.grief === undefined) continue;
      const v = a.data.grief as GriefData;
      if (!allowed || a.kind !== 'rest' || !v || !int(v.for, 1, Number.MAX_SAFE_INTEGER) || !int(v.since, 0, w.tick) || !int(v.len, GRIEF_SIT_MIN, GRIEF_SIT_MIN + GRIEF_SIT_SPREAD)
        || !int(v.sat, 0, v.len + 60) || (v.began !== undefined && v.began !== true) || (v.counted !== undefined && (v.counted !== true || !v.began))) throw new Error('Invalid sitting with the grieving');
    }
  }
}
