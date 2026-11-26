// Rules 262 (the social scenes stream, bundle C, part 8 of `docs/SOCIAL_SCENES_PLAN.md`): a reunion. Somebody who sees their partner, their own child or
// their own parent, close to home, after more than a day and a half apart, runs to meet them.
//
// What stood before: a sighting of anybody was a note of where and when (perception.ts, `Person.whereabouts`), and two people who passed close enough
// might wave (social.ts passingGreetings). Nobody went to meet anybody, and nothing was said of a long absence.
//
// One part, `reunion` (switched in company_scenes.ts, with `song`, song.ts, and `dance`, dance.ts). From rules 262:
//
//   the cue     In the sighting itself (perception.ts, outdoors): the person's OWN last first-hand sighting of somebody they hold as partner, child or parent
//               (their own record of kin) is more than REUNION_GAP ticks old (a day and a half). The previous sighting is read before the new one replaces
//               it. A record that came by hearsay (it has a `from`) says nothing of when they last SAW them, so it is no cue. Neither is asleep. The pair have
//               not had a reunion in the last two days. What is kept is `Person.reunion`: who, how long the gap was, when it was seen; it lapses after
//               REUNION_PENDING ticks.
//   the offer   Within those ticks, if the person is still outdoors and awake, has no critical need and no danger believed about, can still SEE them (awake, not
//               in a talk) and is within REUNION_HOME tiles of the door of their own household's home (of the nearest settlement centre if they have none: a
//               homecoming), the run to meet them is an option worth REUNION_BASE (more for a partner), less the walk (options_social.ts, reunionOption).
//   the scene   An ordinary 'wander' activity marked `data.reunion` with `data.run`, so they run (the speed fleeing uses) toward them, following them while
//               they are in sight. On reaching them (within REUNION_NEAR) it is a reunion: both wave and each says a line, one line is written, both are glad
//               of it and a little fonder (REUNION_AFFINITY each way) and the pair have a rest of two days from another. The runner then stands facing them for
//               REUNION_STAND ticks and goes on. The other is not stopped or taken from what they are doing. About a hundred ticks in all.
//   failure     If they cannot be found where they were seen, are asleep, have gone indoors or are in danger or need, nothing happens and nothing is written
//               (the inspector shows the way it ended, as for any activity). A pair do not both run: the one who sets out holds the pair for 300 ticks.
//   the line    "C ran to meet A, back after two days." The days are the real gap in the runner's own record, floored to the half day.
//
// Nothing here reads anybody's true state: the gap is the runner's own record, and the other's being near, awake and free is what the runner sees. No draw
// from the shared stream is made. Saved: Person.reunion (the pending cue), the scene's own record in the activity's data (`reunion`). Rich worlds at rules
// 262 and later only; rules 261 and earlier, authored worlds and a part switched off keep the old behaviour.
import { faceToward, newActivity } from './activities';
import { DAY } from './constants';
import { addEvent, addLog, say } from './events';
import { COMPANY_FROM, hasReunion } from './company_scenes';
import { sameSpace } from './habitation';
import { think } from './mood';
import { Scorer, addOption, pen } from './optutil';
import type { Ctx } from './optutil';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Building, Person, World } from './types';
import { hyp } from './util';

// ── the cue ──
/** more than this many ticks since their own last first-hand sighting: a day and a half */
export const REUNION_GAP = 3600;
/** how long a cue is kept, in ticks */
export const REUNION_PENDING = 150;
/** how near the home door (or the settlement centre) the runner is: it is a homecoming */
export const REUNION_HOME = 12;
/** a pair has no second reunion for this long once they have had one, and the one who sets out holds the pair for the shorter time while they run */
export const REUNION_REST = 2 * DAY;
export const REUNION_HOLD = 300;
// ── the offer ──
export const REUNION_BASE = 60;
export const REUNION_PARTNER = 4;
// ── the scene ──
/** met when this near; the runner stands this long afterwards */
export const REUNION_NEAR = 2.5;
export const REUNION_STAND = 50;
/** what a reunion does for both: fonder (each way), better acquainted, and glad for half a day */
export const REUNION_AFFINITY = 2;
export const REUNION_FAMILIARITY = 0.5;
export const REUNION_GLAD = 4;
export const REUNION_GLAD_FOR = DAY / 2;

/** what each says (chosen from a hash of who and when, never from the shared stream) */
export const GREETINGS = ['There you are!', 'You are back!', 'I saw you coming!', 'At last, you are home!'];
export const REPLIES = ['It is good to see you.', 'I am back.', 'Look at you, running!', 'I missed you too.'];

export interface ReunionData {
  /** whom the runner is going to */
  with: number;
  /** the gap, in ticks, in the runner's own record */
  gap: number;
  /** when they set out, and when they met (absent until they do) */
  since: number;
  met?: number;
}

const kinOf = (p: Person, id: number): string | undefined => p.relations[id]?.kin;
const closeKin = (kin: string | undefined): boolean => kin === 'partner' || kin === 'child' || kin === 'parent';
const personOf = (w: World, id: number): Person | null => {
  const e = w.byId.get(id);
  return e && e.ent === 'person' && e.alive ? e : null;
};
export const isReunion = (a: Activity): boolean => a.kind === 'wander' && !!a.data.reunion;

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const num = (k: number): string => (k < WORDS.length ? WORDS[k] : String(k));
/** a gap in plain words, floored to the half day: "a day and a half", "two days", "two and a half days" */
export function daysApart(gap: number): string {
  const halves = Math.max(0, Math.floor(gap / (DAY / 2)));
  const whole = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  if (whole <= 1 && !half) return 'a day';
  if (whole === 0) return 'half a day';
  if (whole === 1) return 'a day and a half';
  return half ? `${num(whole)} and a half days` : `${num(whole)} days`;
}

// ───────────────────────── the cue (perception.ts) ─────────────────────────
/**
 * `p` has just seen `q` first-hand, outdoors (perception.ts, before the sighting is written over the old one: `prev` is what they held until now). If their own
 * last first-hand sighting is more than a day and a half old and `q` is their partner, child or parent, it is noted.
 */
export function noteReunion(w: World, p: Person, q: Person, prev: { tick: number; from?: number } | undefined): void {
  if (!prev || prev.from !== undefined || w.tick - prev.tick <= REUNION_GAP || !hasReunion(w)) return;
  if (!closeKin(kinOf(p, q.id)) || p.pose === 'sleep' || q.pose === 'sleep') return;
  if ((p.cooldowns['reunion' + q.id] ?? 0) > w.tick) return;
  // one cue at a time: a fresh one for somebody else is kept
  if (p.reunion && p.reunion.with !== q.id && w.tick - p.reunion.at <= REUNION_PENDING) return;
  p.reunion = { with: q.id, gap: w.tick - prev.tick, at: w.tick };
}

/** A cue that has lapsed is let go (perception.ts, each sighting round). */
export function lapseReunion(w: World, p: Person): void {
  if (p.reunion && w.tick - p.reunion.at > REUNION_PENDING) delete p.reunion;
}

// ───────────────────────── the offer (options_social.ts) ─────────────────────────
/** the settlement centres a person might call home, if their household has no home: the camp and any further settlement */
function nearestCentre(w: World, p: Person): { x: number; y: number } {
  let best = w.camp;
  let bd = hyp(w.camp.x - p.x, w.camp.y - p.y);
  for (const c of w.extraSettlements ?? []) {
    const d = hyp(c.x - p.x, c.y - p.y);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}
/** within REUNION_HOME tiles of the door of their own household's home, or of the settlement centre if they have none */
export function nearHome(w: World, p: Person, home: Building | null): boolean {
  const at = home ? { x: home.doorX + 0.5, y: home.doorY + 0.5 } : nearestCentre(w, p);
  return hyp(at.x - p.x, at.y - p.y) <= REUNION_HOME;
}

/** Offered to a person with a cue who is free, near home and can still see them (options_social.ts socialOptions). */
export function reunionOption(ctx: Ctx): void {
  const { world: w, p } = ctx;
  const r = p.reunion;
  if (!r || !hasReunion(w) || w.tick - r.at > REUNION_PENDING) return;
  if (ctx.criticals.length || ctx.dangers.length || p.indoors || p.pose === 'sleep' || p.convId !== 0) return;
  if ((p.cooldowns['reunion' + r.with] ?? 0) > w.tick || !closeKin(kinOf(p, r.with)) || !nearHome(w, p, ctx.home)) return;
  const s = ctx.seenPersons.find((x) => x.id === r.with);
  const q = personOf(w, r.with);
  if (!s || !q || s.asleep || s.busyTalking || s.act === 'sleep') return;
  const d = hyp(s.x - p.x, s.y - p.y);
  const e = (d * 1.18) / Math.max(0.03, ctx.speed * 1.42);
  const apart = daysApart(r.gap);
  const sc = new Scorer().add(`${q.name} is back after ${apart}`, REUNION_BASE);
  if (kinOf(p, q.id) === 'partner') sc.add('my partner', REUNION_PARTNER);
  sc.add('walking', -pen(e));
  addOption(ctx, {
    kind: 'wander',
    label: `Run to meet ${q.name}`,
    goal: `to greet ${q.name}, who is back after ${apart}`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + REUNION_STAND,
    key: `reunion:${q.id}`,
    targetId: q.id,
    tag: 'social',
    make: () => {
      const dx = p.x - s.x, dy = p.y - s.y, dd = hyp(dx, dy) || 1;
      const data: ReunionData = { with: q.id, gap: r.gap, since: w.tick };
      // the one who sets out holds the pair, so the other does not set out too; the cue is used
      p.cooldowns['reunion' + q.id] = w.tick + REUNION_HOLD;
      q.cooldowns['reunion' + p.id] = Math.max(q.cooldowns['reunion' + p.id] ?? 0, w.tick + REUNION_HOLD);
      if (q.reunion?.with === p.id) delete q.reunion;
      delete p.reunion;
      return newActivity(w, p, {
        kind: 'wander',
        label: `Running to meet ${q.name}`,
        goal: `to greet ${q.name}, who is back after ${apart}`,
        targetId: q.id,
        targetType: 'person',
        tx: s.x,
        ty: s.y,
        spotX: s.x + (dx / dd) * 1.2,
        spotY: s.y + (dy / dd) * 1.2,
        utility: sc.total,
        minCommit: 100,
        maxTicks: Math.ceil(e) + REUNION_STAND + 120,
        data: { reunion: data, run: true, sticky: true, logged: true },
      });
    },
  });
}

// ───────────────────────── the scene (act_misc.ts wander handler) ─────────────────────────
/** They have got to them (or not): a reunion, or a failure that writes nothing. Returns the reason if it is a failure. */
export function reunionBegin(w: World, p: Person, a: Activity): string | undefined {
  const r = a.data.reunion as ReunionData;
  const q = personOf(w, r.with);
  if (!q) return 'they are no longer around';
  if (!hasReunion(w)) return 'it was not to be';
  if (q.pose === 'sleep' || !sameSpace(w, p, q) || q.indoors) return `${q.name} was not there to meet`;
  if (hyp(q.x - p.x, q.y - p.y) > REUNION_NEAR) return `${q.name} was gone before I got there`;
  if ((q.cooldowns['reunion' + p.id] ?? 0) > w.tick + REUNION_HOLD) return `${q.name} had already met me`;
  const apart = daysApart(r.gap);
  r.met = w.tick;
  a.duration = REUNION_STAND;
  a.label = `Greeting ${q.name}`;
  a.goal = `to greet ${q.name}, who is back after ${apart}`;
  faceToward(p, q.x, q.y);
  p.wave = w.tick + 34;
  if (q.wave < w.tick) q.wave = w.tick + 30;
  say(w, p, GREETINGS[Math.floor(hashUnit(p.id, w.tick, 0x72) * GREETINGS.length)], 'happy', 100);
  say(w, q, REPLIES[Math.floor(hashUnit(q.id, w.tick, 0x65) * REPLIES.length)], 'happy', 100);
  addEvent(w, 'social', `${p.name} ran to meet ${q.name}, back after ${apart}.`, [p.id, q.id], q.x, q.y);
  for (const [x, y] of [[p, q], [q, p]] as [Person, Person][]) {
    adjustRel(x, y.id, w.tick, { aff: REUNION_AFFINITY, fam: REUNION_FAMILIARITY, note: x === p ? `ran to meet ${y.name} after ${apart}` : `${p.name} ran to meet me after ${apart}` });
    think(w, x, 'reunion', REUNION_GLAD, REUNION_GLAD_FOR, x === p ? `${y.name} is back` : `${p.name} ran to meet me`);
    x.cooldowns['reunion' + y.id] = w.tick + REUNION_REST;
  }
  if (q.reunion?.with === p.id) delete q.reunion;
  addLog(w, p, 'social', `Ran to meet ${q.name}, back after ${apart}.`);
  addLog(w, q, 'social', `${p.name} ran to meet me after ${apart} apart.`);
  return undefined;
}

/** One tick of standing with them. */
export function reunionWork(w: World, p: Person, a: Activity): 'continue' | 'done' {
  const r = a.data.reunion as ReunionData;
  const q = personOf(w, r.with);
  if (q) faceToward(p, q.x, q.y);
  a.progress++;
  return a.progress >= a.duration ? 'done' : 'continue';
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 262, rich only); anything else is refused on loading. */
export function validateReunion(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, COMPANY_FROM);
  const int = (n: unknown, min: number, max: number): boolean => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  for (const p of w.persons) {
    const r = p.reunion;
    if (r !== undefined && (!allowed || !r || !int(r.with, 1, Number.MAX_SAFE_INTEGER) || !int(r.gap, REUNION_GAP + 1, Math.max(REUNION_GAP + 1, w.tick)) || !int(r.at, 0, w.tick) || w.tick - r.at > REUNION_PENDING + 60)) throw new Error('Invalid reunion cue');
    for (const a of [p.activity, p.suspended]) {
      if (!a || a.data.reunion === undefined) continue;
      const k = a.data.reunion as ReunionData;
      if (!allowed || a.kind !== 'wander' || !k || !int(k.with, 1, Number.MAX_SAFE_INTEGER) || !int(k.gap, REUNION_GAP + 1, Math.max(REUNION_GAP + 1, w.tick)) || !int(k.since, 0, w.tick) || (k.met !== undefined && !int(k.met, 0, w.tick))) throw new Error('Invalid reunion');
    }
  }
}
