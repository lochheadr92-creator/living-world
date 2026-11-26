// Rules 263 (the social scenes stream, bundle D, part 12 of `docs/SOCIAL_SCENES_PLAN.md`): settling a child for the night. In the evening a parent who sees
// their own small child tired or lying down to sleep, at home, goes and sits beside them until they have been asleep a little while, with a word.
//
// What stood before: a child went to bed exactly as an adult does (options_survival.ts optSleep): by its own body clock and its own choice, with no parent
// involved, nothing said and nothing written. What shows of a tired person is the sign `tired` (energy under 25) or being asleep (perception.ts); nobody can
// read another's body clock.
//
// One part, `settle` (switched in kin_scenes.ts, with `grief`, grief_sit.ts, and `age`, coming_of_age.ts). From rules 263:
//
//   the cue     In the evening (from EVENING_FROM of the day to SETTLE_UNTIL), a person who is not a child, is at ease (hunger and thirst drives 30 or less,
//               energy drive 60 or less, no critical need, no danger believed about, not laid up themselves), sees a child of their own household whom
//               their own record holds as their child, under eight years old, within twelve tiles of their home door (of the settlement centre if the household
//               has no home), VISIBLY TIRED or lying down to sleep (the sign `tired`, or asleep, or in the sleep activity). Same room or same open ground:
//               somebody indoors sees only those indoors with them, as everywhere. One parent at a time: not if somebody is seen sitting beside the child, and
//               not if the child was settled this evening (the one flag read that is not a sight: the child's own `cooldowns.settled`, which the household shares:
//               the parents of a home know whether the little one was put to bed tonight. Deviation from the strict rule "act only on what was seen", written down).
//               Worth SETTLE_BASE, less the walk (options_social.ts via settleOption).
//   the sit     An ordinary `rest` activity marked `data.settle` beside them, sticky: only danger or a critical need ends it from outside. Outdoors, on a free
//               tile beside them; indoors, where the parent already is, in the same room. On reaching them the parent finds them still tired or asleep (else turns
//               back, and nothing is written), says one bedtime line (dialogue.ts BEDTIME_LINES), and the child is marked settled for the evening (SETTLE_REST).
//               The sit ends when the child has been asleep SETTLE_ASLEEP_FOR ticks in a row, or after SETTLE_MAX ticks, or when the parent has to see to a need of
//               their own, falls ill, or loses sight of the child, or when the child has been neither tired nor asleep for SETTLE_PATIENCE ticks (not ready for bed).
//   the end     A sit that lasted SETTLE_MIN ticks or more counts: the child and the parent are each glad (SETTLE_GLAD) and a little closer, and each has a line in
//               their own log. The FEED line, "A settled little C for the night.", is written at most once for each household in two days
//               (`Household.settled`, the tick of the last), because a settlement of a hundred and thirty people holds fourteen to thirty-eight children under eight and
//               it would otherwise write dozens of lines every evening. A sit that did not last long enough writes nothing.
//   not changed It does not change when or how well the child sleeps: nothing in the simulation would let it honestly do so. The glad thought is a mood thought
//               like any other, and the cost is the parent's own evening.
//
// Nothing here reads anybody's true state but the child's age, which a parent knows of their own child. No draw is made (the line is chosen by a hash). Saved:
// the sit's own record in the activity's data (`settle`: whom, since when, ticks sat, how long they have been asleep, how long not ready), Household.settled and
// the child's ordinary `cooldowns`; all in the fingerprint (world.ts) and checked on loading (validateSettling). Rich worlds at rules 263 and later only; rules
// 262 and earlier, authored worlds and a part switched off keep the old behaviour.
import { faceToward, newActivity, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { saying, BEDTIME_LINES } from './dialogue';
import { dayFraction } from './environment';
import { addEvent, addLog, say } from './events';
import { EVENING_FROM } from './evening_fire';
import { hasHabitation, sameSpace } from './habitation';
import { householdById } from './households';
import { KIN_FROM, hasSettling } from './kin_scenes';
import { think } from './mood';
import { Scorer, addOption, pen } from './optutil';
import type { Ctx } from './optutil';
import { ageYears } from './people';
import { senseRadius } from './perception';
import { adjustRel } from './relations';
import { nearHome } from './reunion';
import { laidUp } from './responsibilities';
import { runsRulesVersion } from './rulesversion';
import { personOf } from './social';
import type { Activity, Person, SeenEntity, World } from './types';
import { hyp } from './util';

// ── the cue ──
/** a child is settled while they are under this age (years): the age of the children who are put to bed by somebody, not yet by themselves */
export const SETTLE_AGE = 8;
/** the evening runs from EVENING_FROM to this fraction of the day */
export const SETTLE_UNTIL = 0.97;
/**
 * the drives the parent may have: hunger and thirst as in the gates welfare.ts and vigil.ts use, and energy as far as the foot of the energy band (60: energy 20 and over). The
 * energy gate is looser than vigil.ts's 45 because the evening is when parents are tired: at bedtime most are, and a gate of 45 would keep out nearly every parent who is awake when a
 * child lies down (a look at the first two evenings of an ordinary world: the three parents awake at that moment were at energy 44, 23 and 22).
 */
export const SETTLE_HUNGER_DRIVE_MAX = 30;
export const SETTLE_THIRST_DRIVE_MAX = 30;
export const SETTLE_ENERGY_DRIVE_MAX = 60;
/** the child is this near home (tiles) when the parent sees them; somebody seen sitting this near the child is a parent there already */
export const SETTLE_HOME = 12;
export const SITTER_NEAR = 4;
/**
 * what a settling is worth before the walk. It is set to beat the parent's own bedtime: sleep is worth its drive, or 26 + (100 - energy) / 2 (and 8 more in the dark) at a late hour, times 1
 * for a hut, 1.04 for a house and 0.74 at a fire, so at a fire about 40 to 55 and at a home 55 to 75; at 70 a parent sits first and goes to bed after (the plan's "a slightly later bedtime")
 * except at home in the dark with energy under about 35, when the parent's own sleep is worth more and they go to bed. It was first set at 40 (under a vigil's 52, over the evening fire's
 * 22): in a look at the first two evenings of an ordinary world (all sleeping at fires: nobody had a home yet) the settling was offered 110 times and never chosen, every parent being
 * asleep. Pressing needs are gated out here, so nothing above 50 competes but sleep.
 */
export const SETTLE_BASE = 70;
/** the child is not offered a second settling for this long once one has begun: the rest of an evening */
export const SETTLE_REST = DAY / 2;
/** a parent who turned back waits this long before trying again for the same child */
export const SETTLE_RETRY = 300;

// ── the sit ──
/** near enough to be beside them (the parent follows if they move) */
export const SETTLE_NEAR = 3.2;
/** the sit ends when the child has been asleep this many ticks in a row ("until the child has been asleep about 60 ticks") */
export const SETTLE_ASLEEP_FOR = 60;
/** the longest a sit lasts, in ticks ("at most about 240 ticks") */
export const SETTLE_MAX = 240;
/** the shortest sit that counts */
export const SETTLE_MIN = 60;
/** how long the child may be neither tired nor asleep before the parent gives it up: they were not ready for bed */
export const SETTLE_PATIENCE = 90;
/** the needs under which the parent leaves to see to themselves (as vigil.ts) */
export const LEAVE_THIRST = 35;
export const LEAVE_HUNGER = 30;
export const LEAVE_WARMTH = 25;
export const LEAVE_ENERGY = 12;
// ── what it does ──
/** a glad thought for each, and what they remember of it */
export const SETTLE_GLAD = 4;
export const SETTLE_GLAD_CHILD = 4;
export const SETTLE_GLAD_FOR = DAY / 2;
export const SETTLE_AFFINITY = 1.5;
export const SETTLE_TRUST = 1;
export const SETTLE_FAMILIARITY = 0.5;
export const SETTLE_PARENT_AFFINITY = 1;
/** the feed line is written at most once for each household in this many ticks (two days) */
export const SETTLE_LINE_EVERY = 2 * DAY;

export interface SettleData {
  /** the child sat with */
  for: number;
  /** when it was chosen, and how many ticks the parent has sat beside them */
  since: number;
  sat: number;
  /** ticks in a row the child has been asleep, and ticks in a row neither tired nor asleep */
  asleep?: number;
  idle?: number;
  /** they have sat down (the first arrival); a second arrival after following them is nothing new */
  began?: true;
}

const settleOf = (a: Activity | null | undefined): SettleData | undefined => (a && a.kind === 'rest' ? (a.data.settle as SettleData | undefined) : undefined);
export const isSettling = (a: Activity | null | undefined): boolean => settleOf(a) !== undefined;

// ───────────────────────── the cue ─────────────────────────
/** Offered to a parent who sees their own small child tired or lying down in the evening, at home (options_social.ts socialOptions). */
export function settleOption(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!hasSettling(world) || ctx.stage === 'child' || ctx.criticals.length || ctx.dangers.length || laidUp(world, p)) return;
  if (p.activity?.data.settle !== undefined || p.activity?.data.grief !== undefined) return;
  const frac = dayFraction(world.tick);
  if (frac < EVENING_FROM || frac >= SETTLE_UNTIL) return;
  if (ctx.drives.hunger > SETTLE_HUNGER_DRIVE_MAX || ctx.drives.thirst > SETTLE_THIRST_DRIVE_MAX || ctx.drives.energy > SETTLE_ENERGY_DRIVE_MAX) return;
  let best: { s: SeenEntity; q: Person; d: number } | null = null;
  for (const s of ctx.seenPersons) {
    if (s.ent !== 'person' || !s.child || !(s.asleep || s.act === 'sleep' || s.tired)) continue;
    if (p.relations[s.id]?.kin !== 'child' || !ctx.members.some((m) => m.id === s.id)) continue;
    const q = world.byId.get(s.id);
    if (!q || q.ent !== 'person' || !q.alive || ageYears(world, q) >= SETTLE_AGE) continue;
    if ((q.cooldowns.settled ?? 0) > world.tick || (p.cooldowns['settle' + q.id] ?? 0) > world.tick) continue;
    if (!nearHome(world, q, ctx.home)) continue;
    // one parent at a time: not if somebody is seen sitting beside them
    if (ctx.seenPersons.some((o) => o.sittingWith && o.id !== p.id && hyp(o.x - s.x, o.y - s.y) <= SITTER_NEAR)) continue;
    const d = hyp(s.x - p.x, s.y - p.y);
    if (!best || d < best.d) best = { s, q, d };
  }
  if (!best) return;
  const { s, q } = best;
  const e = (best.d * 1.18) / Math.max(0.03, ctx.speed);
  const sc = new Scorer().add(`${q.name} is ready for bed`, SETTLE_BASE).add('walking', -pen(e));
  const inside = hasHabitation(world) && p.indoors ? p.indoors : 0;
  // outdoors, a free tile beside them; indoors, the same room (where the parent already is)
  const spot = inside ? { x: p.x, y: p.y } : standSpotFor(world, p, q);
  if (!spot) return;
  const sx = spot.x, sy = spot.y;
  addOption(ctx, {
    kind: 'rest',
    label: `Settle ${q.name} for the night`,
    goal: `to see ${q.name} to sleep`,
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + SETTLE_MAX,
    key: `settle:${q.id}`,
    targetId: inside || q.id,
    tag: 'care',
    make: () => {
      const data: SettleData = { for: q.id, since: world.tick, sat: 0 };
      return newActivity(world, p, {
        kind: 'rest',
        label: `Going to settle ${q.name} for the night`,
        goal: `to see ${q.name} to sleep`,
        targetId: inside || q.id,
        ...(inside ? {} : { targetType: 'person' }),
        tx: s.x,
        ty: s.y,
        spotX: sx,
        spotY: sy,
        amount: SETTLE_MAX + 60,
        utility: sc.total,
        minCommit: 60,
        maxTicks: Math.ceil(e) + SETTLE_MAX + 300,
        data: { settle: data, sticky: true },
      });
    },
  });
}

// ───────────────────────── the sit ─────────────────────────
/** somebody else is sitting beside this child, in work, in the same place: seen by anybody who is there */
function otherParent(world: World, child: Person, except: Person): Person | null {
  for (const q of world.persons) {
    if (q === except || !q.alive || q.activity?.phase !== 'work') continue;
    const v = settleOf(q.activity);
    if (v && v.for === child.id && sameSpace(world, q, child) && hyp(q.x - child.x, q.y - child.y) <= SITTER_NEAR) return q;
  }
  return null;
}

/** the rest activity marked `settle` has reached them (act_misc.ts rest handler): they sit down, or find them not ready, gone or already settled, and do not */
export function settleBegin(world: World, p: Person, a: Activity): string | undefined {
  const v = settleOf(a)!;
  const child = personOf(world, v.for);
  if (!child) return 'they are no longer around';
  if (!hasSettling(world)) return 'it was not to be';
  if (v.began) {
    a.targetType = ''; // they have gone after them and caught up: nothing new
    return undefined;
  }
  const turnBack = (why: string): string => { p.cooldowns['settle' + child.id] = world.tick + SETTLE_RETRY; return why; };
  if (!sameSpace(world, p, child) || hyp(child.x - p.x, child.y - p.y) > senseRadius(world, p)) return turnBack(`${child.name} was not where I expected`);
  const sign = p.seen.find((x) => x.id === child.id);
  if (!sign || !(sign.asleep || sign.tired || sign.act === 'sleep')) return turnBack(`${child.name} was not ready for bed`);
  if (otherParent(world, child, p) || (child.cooldowns.settled ?? 0) > world.tick) return turnBack(`${child.name} was already being settled`);
  v.began = true;
  child.cooldowns.settled = world.tick + SETTLE_REST;
  a.duration = SETTLE_MAX + 60;
  a.label = `Settling ${child.name} for the night`; // entering a home relabels a rest as resting inside it
  a.targetType = ''; // the walk chased them; sitting beside them, the parent is not held to their every move (settleWork follows)
  faceToward(p, child.x, child.y);
  say(world, p, saying(BEDTIME_LINES, p.id, child.id, world.tick), 'happy', 120);
  return undefined;
}

/** One tick of the sit (act_misc.ts rest handler). */
export function settleWork(world: World, p: Person, a: Activity): WorkResult {
  const v = settleOf(a)!;
  const child = personOf(world, v.for);
  if (!child) return 'partial:they are gone';
  if (!hasSettling(world)) return 'partial:it was not to be';
  if (!sameSpace(world, p, child)) return 'partial:they are not in the same place now';
  const d = hyp(child.x - p.x, child.y - p.y);
  if (d > senseRadius(world, p)) return 'partial:lost sight of them';
  faceToward(p, child.x, child.y);
  if (d > SETTLE_NEAR) {
    // they have moved: follow
    a.tx = child.x;
    a.ty = child.y;
    a.spotX = child.x;
    a.spotY = child.y;
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
  // what they can see of them now: the sign, never the child's own tiredness
  const sign = p.seen.find((x) => x.id === child.id);
  if (sign?.asleep) {
    v.asleep = (v.asleep ?? 0) + 1;
    v.idle = 0;
  } else {
    v.asleep = 0;
    v.idle = sign?.tired || sign?.act === 'sleep' ? 0 : (v.idle ?? 0) + 1;
    if (v.idle >= SETTLE_PATIENCE) return 'partial:they were not ready for bed';
  }
  a.progress++;
  return (v.asleep ?? 0) >= SETTLE_ASLEEP_FOR || v.sat >= SETTLE_MAX ? 'done' : 'continue';
}

/** The sit has ended, however it ended (act_misc.ts rest handler onEnd). A sit that counted: the two are glad and closer, and a household's line goes in the feed once in two days. */
export function settleEnd(world: World, p: Person, a: Activity): void {
  const v = settleOf(a);
  if (!v) return;
  const child = personOf(world, v.for);
  // one that ended because the child was not ready for bed never settled anybody
  if (!child || v.sat < SETTLE_MIN || (v.idle ?? 0) >= SETTLE_PATIENCE) return;
  think(world, child, 'settled', SETTLE_GLAD_CHILD, SETTLE_GLAD_FOR, `${p.name} sat with me at bedtime`);
  think(world, p, 'settled_child', SETTLE_GLAD, SETTLE_GLAD_FOR, `settled ${child.name} for the night`);
  adjustRel(child, p.id, world.tick, { aff: SETTLE_AFFINITY, trust: SETTLE_TRUST, fam: SETTLE_FAMILIARITY, note: `${p.name} sat with me at bedtime` });
  adjustRel(p, child.id, world.tick, { aff: SETTLE_PARENT_AFFINITY, fam: SETTLE_FAMILIARITY, note: `settled ${child.name} for the night` });
  addLog(world, p, 'social', `Settled ${child.name} for the night.`);
  addLog(world, child, 'social', `${p.name} sat with me at bedtime.`);
  const hh = householdById(world, p.hhId);
  if (hh && (hh.settled === undefined || world.tick - hh.settled >= SETTLE_LINE_EVERY)) {
    hh.settled = world.tick;
    addEvent(world, 'social', `${p.name} settled little ${child.name} for the night.`, [p.id, child.id], child.x, child.y);
  }
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 263, rich only); anything else is refused on loading. */
export function validateSettling(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, KIN_FROM);
  const int = (n: unknown, min: number, max: number): boolean => Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  for (const h of w.households) if (h.settled !== undefined && (!allowed || !int(h.settled, 0, w.tick))) throw new Error('Invalid settling record');
  for (const p of w.persons) {
    for (const a of [p.activity, p.suspended]) {
      if (!a || a.data.settle === undefined) continue;
      const v = a.data.settle as SettleData;
      if (!allowed || a.kind !== 'rest' || !v || !int(v.for, 1, Number.MAX_SAFE_INTEGER) || !int(v.since, 0, w.tick) || !int(v.sat, 0, SETTLE_MAX + 60)
        || (v.asleep !== undefined && !int(v.asleep, 0, SETTLE_ASLEEP_FOR)) || (v.idle !== undefined && !int(v.idle, 0, SETTLE_PATIENCE)) || (v.began !== undefined && v.began !== true)) throw new Error('Invalid settling');
    }
  }
}
