// Rules 260 (the social scenes stream, bundle A, part 1 of `docs/SOCIAL_SCENES_PLAN.md`): courting. Two unpartnered grown people who
// have grown close walk out together, more than once, before one of them proposes.
//
// What stood before: affinity grew through chats (social.ts), and then one conversation decided it (case 'propose'). There was no
// lead-up a viewer could see, and a proposal weighed nothing but the proposer's own feelings and the answerer's.
//
// One part, `courting` (switched in meeting.ts, with `welcome`, welcome.ts, and `praise`, praise.ts). From rules 260:
//
//   the ask     A person at ease (hunger and thirst drives 25 or less, not worn out, no danger believed about, not after dark) may ask an
//               unpartnered grown person they can see within 10 tiles, who is no kin and with whom there is a spark, and whom they know
//               well enough (familiarity 10, affinity 15, trust 12 on their own record: they cannot read the other's regard, rules 164),
//               to walk out. Not somebody at their work (rules 227). Worth 30 and a little more the fonder they are, the sociable, and
//               of an evening (options_social.ts optCourt). Once asked, and again after a refusal, the same person is not asked for a day.
//   the answer  The one asked says yes if they are free and unpartnered, no kin, with a spark, fond enough (affinity 15), not hungry or
//               thirsty (drives 40) or worn out, and a roll from their ids and the time comes under 0.7 plus 0.3 for the sociable
//               (social.ts, case 'court'). Otherwise "not today": the asker waits a day, and on the third refusal running (and each one
//               after) their affinity falls by 6 and they wait three. A yes clears the count of refusals.
//   the walk    On a yes both set out together, an ordinary 'wander' marked `data.walk`, to one place the asker chose when asking from what
//               they know (a haunt of theirs within 20 tiles, else water they know, else a point about 6 tiles from a fire they know),
//               stand side by side there for WALK_TICKS, and come away. The activity is sticky: only danger or a critical need ends it
//               early, and then neither is counted. It counts only if the two spent at least half the standing time within 3 tiles.
//   a counted walk  For both: affinity +4, trust +2, familiarity +2, want of company eased by 10, a glad thought for a day, a log line,
//               the pair's count (`Relation.courted`: how many walks and when the last, on both sides), a day's rest from asking each
//               other, and half a day from asking anybody; the place is noted as a haunt when it was one of theirs. A line in the feed ("walked out together";
//               "for the first time" the first, which the chronicle keeps). A walk cut short is a line in the feed too.
//   a proposal  The pair's count bears on a proposal (options_social.ts optPropose, social.ts case 'propose'): -4 to the proposer's
//               score until two walks, +6 from two, and the answerer needs affinity 24 and not 28 from two. Courting is not a
//               requirement for proposing.
//
// Two people visibly out walking together are left to their walk by the mechanism that leaves somebody at their work alone (rules 227,
// finish_job.ts leftToWork, reading `SeenEntity.walkingOut`): nobody is asked by a third person for a chat, family time or a game, or
// for a walk. Danger and a critical need still end it. The starting values were set from the first ordinary-world measurement: with 18 and
// 20 the ask never ranked first (work by day, the evening fire by evening), so the base was raised to 26 and then, with the ask still seldom the best thing to do, to 30, and the fondness it needs to 15; the proposal's
// -4 holds a proposal back less while walks are uncommon. A person out walking with another takes no talk but a warning (social.ts acceptsTalk).
//
// Nothing here reads anybody's true state beyond what `propose` already reads. Draws come from a hash of the two ids and the tick.
// Saved: Relation.courted, Relation.courtRefused, the walk's own record in the activity's data (and, while a conversation lasts, the
// place chosen, in its data). Rich worlds at rules 260 and later only; rules 257 and earlier, authored worlds and a part switched off
// keep the old behaviour.
import { endActivity, endSuspended, faceToward, newActivity, startActivity, suspendActivity } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { drive } from './needs';
import { addEvent, addLog } from './events';
import { hauntsFor, noteHaunt, pickHaunt } from './leisure';
import { MEETING_FROM, hasCourting } from './meeting';
import { think } from './mood';
import { beliefsByKind, dangerAt, spotNear } from './optutil';
import type { Ctx } from './optutil';
import { stageOf } from './people';
import { isWalkable } from './registry';
import { adjustRel, relOf, spark } from './relations';
import { hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import { T } from './types';
import type { Activity, Person, Relation, World } from './types';
import { hyp } from './util';

// ── the ask (options_social.ts optCourt) ──
/** how near the other must be seen */
export const COURT_REACH = 10;
/** what the asker must already know of the other, on their own record */
export const ASK_FAMILIARITY = 10;
export const ASK_AFFINITY = 15;
export const ASK_TRUST = 12;
/** hunger and thirst drives the asker may have (the test optPropose uses) */
export const ASK_DRIVE_MAX = 25;
/** the energy drive over which anybody is worn out (the line evening_fire.ts uses) */
export const WORN_OUT_DRIVE = 60;
/** the ask's score: a base, per point of affinity over ASK_AFFINITY, per point of sociability, and of an evening */
export const ASK_BASE = 30;
export const ASK_PER_AFFINITY = 0.3;
export const ASK_SOCIABLE = 4;
export const ASK_EVENING = 8;

// ── the answer (social.ts case 'court') ──
/** the other's own affinity toward the asker, and the hunger and thirst drives they may have */
export const YES_AFFINITY = 15;
export const YES_DRIVE_MAX = 40;
/** the roll: under YES_ROLL plus YES_ROLL_SOCIABLE times the answerer's sociability */
export const YES_ROLL = 0.7;
export const YES_ROLL_SOCIABLE = 0.3;
/** a refusal: the asker waits this long, and after REFUSALS_RUNNING running their affinity falls and they wait longer */
export const REFUSED_WAIT = DAY;
export const REFUSALS_RUNNING = 3;
export const REFUSALS_AFFINITY = 6;
export const REFUSALS_WAIT = 3 * DAY;

// ── the walk ──
/** how long they stand together at the place (the walk there is on top of it) */
export const WALK_TICKS = 150;
/** how near each other counts as together, and what share of the standing time it must be */
export const WALK_NEAR = 3;
export const WALK_SHARE = 0.5;
/** how far from the asker the place may be, and how far from a known fire the last-resort point is */
export const WALK_RANGE = 20;
export const WALK_FIRE_DISTANCE = 6;
/** slack on top of the walk and the standing before an outing is given up as too long */
const WALK_SLACK = 240;
/** the worth a walk is held at when somebody takes a second look (it is sticky, so only danger and a critical need can end it) */
const WALK_HOLD = 30;

// ── what a counted walk changes, for both ──
export const GAIN_AFFINITY = 4;
export const GAIN_TRUST = 2;
export const GAIN_FAMILIARITY = 2;
export const GAIN_COMPANY = 10;
export const GLAD = 3;
export const GLAD_FOR = DAY;
/** after a counted walk: the pair do not ask each other for this long, and the asker asks nobody for the shorter time */
export const WALKED_PAIR_WAIT = DAY;
export const WALKED_ANY_WAIT = DAY / 2;
/** after a walk cut short the pair wait this long (rules 260 names no value: a short rest, so they are not at it again at once) */
export const CUT_SHORT_WAIT = DAY / 4;
/** the most walks a pair's count shows */
export const COURTED_MAX = 99;

// ── what the count does to a proposal ──
/** walks from which a pair "have walked out together" */
export const WALKS_FOR_PROPOSAL = 2;
export const PROPOSE_NOT_YET = -4;
export const PROPOSE_WALKED = 6;
/** the affinity the answerer needs to accept a partner proposal: with and without the walks */
export const PROPOSE_AFFINITY_WALKED = 24;
export const PROPOSE_AFFINITY = 28;

/** where an outing goes: a point, and what kind of place (a haunt's key, 'water' or 'fire') */
export interface WalkPlace {
  x: number;
  y: number;
  at: string;
  /** it was one of the asker's haunts (leisure.ts), so the walk is noted as time at it; water and a fire they merely know are not */
  haunt?: boolean;
}

/** a walk in an activity's data, the same shape on both sides */
export interface WalkData {
  /** the conversation that made it, shared by both */
  id: number;
  with: number;
  /** 'a' asked and leads (and settles the outing when it ends), 'b' follows */
  role: 'a' | 'b';
  /** ticks both stood at the place within WALK_NEAR of each other (counted on the leader) */
  near: number;
  /** what kind of place, and whether it was one of the asker's haunts (only then is it noted as one) */
  at: string;
  haunt?: boolean;
  /** set once the outing has been settled, so it is settled once */
  done?: boolean;
}

/** how many walks this person's record of the other shows */
export const courtedCount = (p: Person, otherId: number): number => p.relations[otherId]?.courted?.n ?? 0;

const personOf = (w: World, id: number): Person | null => {
  const e = w.byId.get(id);
  return e && e.ent === 'person' && e.alive ? e : null;
};

// ───────────────────────── the ask ─────────────────────────
/** Is the asker, as they are now, in a state to ask anybody to walk out? Nothing is read but their own needs, cooldowns and what they believe. */
export function mayCourtNow(ctx: Ctx): boolean {
  const { world: w, p } = ctx;
  if (!hasCourting(w) || w.settings.scene !== 'natural') return false;
  if (ctx.stage !== 'adult' && ctx.stage !== 'elder') return false;
  if (ctx.drives.hunger > ASK_DRIVE_MAX || ctx.drives.thirst > ASK_DRIVE_MAX || ctx.drives.energy > WORN_OUT_DRIVE) return false;
  // nobody sets out to walk with danger believed about, with a need critical, or after dark
  if (ctx.critical || ctx.night || ctx.dangers.length) return false;
  return p.partnerId === 0 && (p.cooldowns.court ?? 0) <= w.tick;
}

/** May the asker (who is in a state to, mayCourtNow) ask this person, seen `d` tiles away? Their own record of them only (rules 164). */
export function mayAskToWalk(ctx: Ctx, q: Person, d: number): boolean {
  return canAskToWalk(ctx.world, ctx.p, q, d);
}

/**
 * The test of `mayAskToWalk`, from the two people and the world alone (the dance, dance.ts rules 262, asks it of two who are dancing, with no decision in hand): neither
 * partnered, both grown, and each holds the other as somebody they might walk out with, on their own record, the way `mayAskToWalk` reads it. Not the hunger and the
 * hour of `mayCourtNow`: they are dancing, not setting out.
 */
export function mayWalkOutTogether(w: World, p: Person, q: Person): boolean {
  if (p.partnerId !== 0 || q.partnerId !== 0) return false;
  for (const x of [p, q]) {
    const st = stageOf(w, x);
    if (st !== 'adult' && st !== 'elder') return false;
  }
  return canAskToWalk(w, p, q, 0) && canAskToWalk(w, q, p, 0);
}

function canAskToWalk(w: World, p: Person, q: Person, d: number): boolean {
  if (d > COURT_REACH || q.partnerId !== 0 || (p.cooldowns['court' + q.id] ?? 0) > w.tick) return false;
  const st = stageOf(w, q);
  if (st === 'child' || st === 'youth') return false;
  const rel = p.relations[q.id];
  if (!rel || rel.kin || rel.familiarity < ASK_FAMILIARITY || rel.affinity < ASK_AFFINITY || rel.trust < ASK_TRUST) return false;
  return spark(p, q);
}

/** The place the asker would walk to, from what they know: a haunt of theirs within WALK_RANGE, else water, else near a fire. Null if none. */
export function courtDestination(ctx: Ctx): WalkPlace | null {
  const { world: w, p } = ctx;
  const within = (x: number, y: number): boolean => hyp(x - p.x, y - p.y) <= WALK_RANGE;
  // one of their haunts (leisure.ts), not their own door
  const haunts = hauntsFor(ctx).filter((h) => h.key !== 'home' && within(h.x, h.y));
  if (haunts.length) {
    const h = pickHaunt(ctx, haunts).h;
    const at = standingPoint(w, h.x, h.y);
    if (at && dangerAt(ctx, at.x, at.y, 12) === 0) return { ...at, at: h.key, haunt: true };
  }
  // else water or the shore they know
  let water: { x: number; y: number } | null = null;
  let wd = 1e9;
  for (const b of beliefsByKind(p, ['water'])) {
    const d = hyp(b.x - p.x, b.y - p.y);
    if (d > WALK_RANGE || d >= wd) continue;
    const spot = spotNear(w, p, b);
    if (!spot || dangerAt(ctx, spot.x, spot.y, 12) > 0) continue;
    wd = d;
    water = spot;
  }
  if (water) return { ...water, at: 'water' };
  // else a point about 6 tiles from the nearest fire they know
  let fire: { x: number; y: number } | null = null;
  let fd = 1e9;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype !== 'fire') continue;
    const d = hyp(b.x - p.x, b.y - p.y);
    if (d < fd) {
      fd = d;
      fire = { x: b.x + 0.5, y: b.y + 0.5 };
    }
  }
  if (!fire) return null;
  const turn = hashUnit(p.id, w.tick >> 6, 61) * 8;
  for (let k = 0; k < 8; k++) {
    const ang = ((turn + k) / 8) * Math.PI * 2;
    const at = standingPoint(w, fire.x + Math.cos(ang) * WALK_FIRE_DISTANCE, fire.y + Math.sin(ang) * WALK_FIRE_DISTANCE, 1);
    if (at && within(at.x, at.y) && dangerAt(ctx, at.x, at.y, 12) === 0) return { ...at, at: 'fire' };
  }
  return null;
}

/** the nearest open ground to a point that a person can stand on (not water, not built over), within `maxR` tiles */
function standingPoint(w: World, x: number, y: number, maxR = 3): { x: number; y: number } | null {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        if (isWalkable(w, tx, ty) && w.terrain[ty * w.W + tx] !== T.SHALLOW) return { x: tx + 0.5, y: ty + 0.5 };
      }
    }
  }
  return null;
}

/** a point beside the first, close enough to count as side by side */
function besideSpot(w: World, x: number, y: number, salt: number): { x: number; y: number } {
  for (let k = 0; k < 8; k++) {
    const ang = (((k + salt) % 8) * Math.PI) / 4;
    const px = x + Math.cos(ang) * 1.3;
    const py = y + Math.sin(ang) * 1.3;
    const tx = Math.floor(px);
    const ty = Math.floor(py);
    if (isWalkable(w, tx, ty) && w.terrain[ty * w.W + tx] !== T.SHALLOW) return { x: px, y: py };
  }
  return { x: x + 0.3, y };
}

// ───────────────────────── the answer ─────────────────────────
/** Why this person will not walk out with the asker today, or '' if they will (the roll included). The answerer's own state and record only. */
export function courtRefusal(w: World, A: Person, B: Person): string {
  if (A.partnerId !== 0 || B.partnerId !== 0) return 'one of them was already partnered';
  const rel = B.relations[A.id];
  if (rel?.kin) return 'they are kin';
  if (!spark(A, B)) return 'no spark';
  if (!rel || rel.affinity < YES_AFFINITY) return 'not fond enough';
  if (drive(B.needs.hunger, 'hunger', w) > YES_DRIVE_MAX || drive(B.needs.thirst, 'thirst', w) > YES_DRIVE_MAX) return 'hungry or thirsty';
  if (drive(B.needs.energy, 'energy', w) > WORN_OUT_DRIVE) return 'worn out';
  // a roll from the two ids and the time, as propose does: no draw from the shared stream
  if (hashUnit(B.id, A.id, (w.tick >> 6) + 0x636f7274) >= YES_ROLL + YES_ROLL_SOCIABLE * B.traits.sociability) return 'not in the mood';
  return '';
}

/** A yes: the asker's count of refusals running is cleared. */
export function noteCourtYes(A: Person, B: Person): void {
  const r = A.relations[B.id];
  if (r) delete r.courtRefused;
}

/** A refusal: the asker waits a day (three after the third running, and then their affinity falls too), and it is written. */
export function noteCourtRefusal(w: World, A: Person, B: Person): void {
  const r = relOf(A, B.id);
  const n = Math.min(REFUSALS_RUNNING, (r.courtRefused ?? 0) + 1);
  r.courtRefused = n;
  let wait = REFUSED_WAIT;
  if (n >= REFUSALS_RUNNING) {
    adjustRel(A, B.id, w.tick, { aff: -REFUSALS_AFFINITY, note: `${B.name} would not walk out with me` });
    wait = REFUSALS_WAIT;
  }
  A.cooldowns['court' + B.id] = w.tick + wait;
  addEvent(w, 'social', `${A.name} asked ${B.name} to walk out; ${B.name} said not today.`, [A.id, B.id], A.x, A.y);
  addLog(w, A, 'social', `Asked ${B.name} to walk out; they said not today.`);
  addLog(w, B, 'social', `${A.name} asked me to walk out; I said not today.`);
}

// ───────────────────────── the walk ─────────────────────────
/** Both set out together (social.ts finishConversation, on a yes). The asker's own work is not touched: each held job is set aside as for a talk. */
export function beginCourtWalk(w: World, id: number, A: Person, B: Person, place: WalkPlace | undefined): void {
  if (!A.alive || !B.alive || !place) return;
  const bSpot = besideSpot(w, place.x, place.y, id);
  const spots: [Person, Person, 'a' | 'b', { x: number; y: number }][] = [[A, B, 'a', place], [B, A, 'b', bSpot]];
  let travel = 0;
  for (const [p, , , spot] of spots) travel = Math.max(travel, (hyp(spot.x - p.x, spot.y - p.y) * 1.18) / 0.06);
  const maxTicks = Math.ceil(travel) + WALK_TICKS + WALK_SLACK;
  for (const [p, q, role, spot] of spots) {
    if (p.activity) suspendActivity(w, p);
    const walk: WalkData = { id, with: q.id, role, near: 0, at: place.at, ...(place.haunt ? { haunt: true } : {}) };
    const a = newActivity(w, p, { kind: 'wander', label: `Walking out with ${q.name}`, goal: 'to walk out together', spotX: spot.x, spotY: spot.y, tx: spot.x, ty: spot.y, utility: WALK_HOLD, minCommit: maxTicks, maxTicks, data: { walk, sticky: true } });
    startActivity(w, p, a);
  }
}

export const isCourtWalk = (a: Activity): boolean => !!a.data.walk;
export const courtWalkBegin = (a: Activity): void => { a.duration = WALK_TICKS; };

/** a person's walk with this id: the one in hand, or one held while they talk */
function findWalk(p: Person, id: number): { a: Activity; held: boolean } | null {
  if ((p.activity?.data.walk as WalkData | undefined)?.id === id) return { a: p.activity!, held: false };
  if ((p.suspended?.data.walk as WalkData | undefined)?.id === id) return { a: p.suspended!, held: true };
  return null;
}

/** One tick of standing at the place. The follower stays as long as the leader does; the leader counts the time together and finishes. */
export function courtWalkWork(w: World, p: Person, a: Activity): WorkResult {
  const walk = a.data.walk as WalkData;
  const q = personOf(w, walk.with);
  const theirs = q ? findWalk(q, walk.id) : null;
  if (!q || !theirs || theirs.held || walk.done) return `partial:${q ? `${q.name} was called away` : 'they were gone'}`;
  faceToward(p, q.x, q.y);
  a.progress++;
  if (walk.role === 'b') return 'continue';
  if (theirs.a.phase === 'work' && hyp(q.x - p.x, q.y - p.y) <= WALK_NEAR) walk.near++;
  return a.progress >= a.duration ? 'done' : 'continue';
}

/** The walk ended, however it ended. The leader settles the outing; a follower pulled away ends the leader's too. */
export function courtWalkEnd(w: World, p: Person, a: Activity, outcome: string): void {
  const walk = a.data.walk as WalkData;
  if (walk.done) return;
  walk.done = true;
  if (walk.role === 'b') {
    const lead = personOf(w, walk.with);
    const theirs = lead ? findWalk(lead, walk.id) : null;
    if (lead && theirs) endWalk(w, lead, theirs, 'partial', `${p.name} was called away`);
    return;
  }
  const B = personOf(w, walk.with);
  const theirs = B ? findWalk(B, walk.id) : null;
  const counted = p.alive && !!B && !!theirs && !theirs.held && outcome === 'success' && walk.near >= WALK_TICKS * WALK_SHARE;
  if (B && theirs) endWalk(w, B, theirs, counted ? 'success' : 'partial', counted ? 'walked out together' : 'the walk was cut short');
  if (!p.alive || !B) return;
  if (counted) outingCounted(w, p, B, walk);
  else outingCutShort(w, p, B);
}

/**
 * end somebody's walk wherever it sits (in hand, or held through a talk). A follower's is marked settled first, so that it does not call the
 * leader back; a leader's is not, because its own ending is where the outing is settled.
 */
function endWalk(w: World, p: Person, found: { a: Activity; held: boolean }, outcome: 'success' | 'partial', detail: string): void {
  const walk = found.a.data.walk as WalkData;
  if (walk.role === 'b') walk.done = true;
  if (found.held) {
    p.suspended = null;
    endSuspended(w, p, found.a, 'partial', detail);
  } else endActivity(w, p, outcome, detail);
}

function outingCounted(w: World, A: Person, B: Person, walk: WalkData): void {
  const first = courtedCount(A, B.id) === 0 && courtedCount(B, A.id) === 0;
  for (const [p, q] of [[A, B], [B, A]] as [Person, Person][]) {
    adjustRel(p, q.id, w.tick, { aff: GAIN_AFFINITY, trust: GAIN_TRUST, fam: GAIN_FAMILIARITY, note: `walked out with ${q.name}` });
    const r: Relation = relOf(p, q.id);
    r.courted = { n: Math.min(COURTED_MAX, (r.courted?.n ?? 0) + 1), last: w.tick };
    p.needs.social = Math.min(100, p.needs.social + GAIN_COMPANY);
    think(w, p, 'walked_out', GLAD, GLAD_FOR, `walked out with ${q.name}`);
    p.cooldowns['court' + q.id] = w.tick + WALKED_PAIR_WAIT;
    addLog(w, p, 'social', `Walked out with ${q.name}.`);
    if (walk.haunt) noteHaunt(w, p, walk.at);
  }
  A.cooldowns.court = w.tick + WALKED_ANY_WAIT;
  addEvent(w, 'social', `${A.name} and ${B.name} walked out together${first ? ' for the first time' : ''}.`, [A.id, B.id], A.x, A.y);
}

function outingCutShort(w: World, A: Person, B: Person): void {
  for (const [p, q] of [[A, B], [B, A]] as [Person, Person][]) {
    p.cooldowns['court' + q.id] = w.tick + CUT_SHORT_WAIT;
    addLog(w, p, 'social', `Set out to walk with ${q.name} and turned back.`);
  }
  addEvent(w, 'social', `${A.name} and ${B.name} set out to walk together and turned back.`, [A.id, B.id], A.x, A.y);
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 260, rich only); anything else is refused on loading. */
export function validateCourting(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, MEETING_FROM);
  for (const p of w.persons) {
    for (const r of Object.values(p.relations)) {
      if (r.courted !== undefined) {
        const c = r.courted;
        if (!allowed || !c || !Number.isSafeInteger(c.n) || c.n < 1 || c.n > COURTED_MAX || !Number.isSafeInteger(c.last) || c.last < 0 || c.last > w.tick) throw new Error('Invalid courting record');
      }
      if (r.courtRefused !== undefined && (!allowed || !Number.isSafeInteger(r.courtRefused) || r.courtRefused < 1 || r.courtRefused > REFUSALS_RUNNING)) throw new Error('Invalid courting refusals');
    }
    for (const a of [p.activity, p.suspended]) {
      const k = a?.data.walk as WalkData | undefined;
      if (!k) continue;
      if (!allowed || a!.kind !== 'wander' || (k.role !== 'a' && k.role !== 'b') || !Number.isSafeInteger(k.id) || !Number.isSafeInteger(k.with) || !Number.isSafeInteger(k.near) || k.near < 0 || k.near > WALK_TICKS || typeof k.at !== 'string' || (k.haunt !== undefined && k.haunt !== true)) throw new Error('Invalid walk out');
    }
  }
  for (const c of w.conversations) if (c.purpose === 'court' && !allowed) throw new Error('Invalid courting conversation');
}
