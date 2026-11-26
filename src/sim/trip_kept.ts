// A trip under way is not dropped by something that only meant to stop work STARTING (rules 265; docs/KEPT_TARGET.md, "Rules 265").
//
// decision.ts reviewActivity regenerates the person's options and values the running activity through the option with its own key.
// A key that is not offered is worth nothing, so anything above 3 replaces it ("something better came up"). Most absences are right:
// the person's own newer sight ruled the target out. Two kinds are not, and are what this module repairs:
//
//  1. A START GATE CLOSES MID-TRIP (part "needs"). About 35 generators return early when hunger, thirst or tiredness passes a
//     threshold (production.ts productionOptions, options_work.ts materials and sites, ...). They are meant to stop work from being
//     taken up, not to cancel it. Somebody who set out below the gate and crosses it on the way loses the option and drops a trip that
//     was often most of the way done. The activity records the three need levels it started with; review asks the planner once more
//     with those three held at the better of now and then, and values the running activity from that answer if the key is offered.
//     Only that one number is read. What else is on offer, the candidates and the best option, still come from the real, ungated
//     options, and danger, a deadlier need, minimum commitment, `sticky` and an outside controller are all as they were.
//  2. THE WORKSHOP SWAP ON WITHDRAWALS (part "place"). A batch's place is the nearest workshop of its type from where the person
//     stands (production.ts supply), and a store that is the batch's own place is never a source for it (collectOptions). Walking to
//     a second bakery B for an ingredient of a batch at A makes B the nearest, so B becomes the batch's place and `collect:B:item`
//     vanishes, though nothing about the trip changed. A withdraw made for a batch at a known workshop records that workshop; while
//     it is running, that workshop stays the batch's place if it is still known and usable. Once the withdrawal ends the nearest one
//     is the place again.
//
// Gate: rich worlds at rules 265 and above. Two lab switches, independent, kept beside the world (not saved, not hashed). Below 265, or
// with a switch off, nothing new is written to any activity and every choice is the one it was.
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Person, World } from './types';

/** The first rules version that carries this fix: the number after the social scenes claim (260 to 264). */
export const TRIP_KEPT_FROM_VERSION = 265;

let needsOn = true;
let placeOn = true;
export const keptThroughNeedsOn = (): boolean => needsOn;
export const keptBatchPlaceOn = (): boolean => placeOn;
export function setKeptThroughNeeds(on: boolean): void { needsOn = on; }
export function setKeptBatchPlace(on: boolean): void { placeOn = on; }
export const hasKeptThroughNeeds = (world: World): boolean => needsOn && isRich(world) && runsRulesVersion(world, TRIP_KEPT_FROM_VERSION);
export const hasKeptBatchPlace = (world: World): boolean => placeOn && isRich(world) && runsRulesVersion(world, TRIP_KEPT_FROM_VERSION);

/** the three needs whose gates the planner reads, in the order they are recorded */
const GATED = ['hunger', 'thirst', 'energy'] as const;
/** a higher level is better met (needs.ts `drive`: the pressure is 0 at the top of the band and grows as the level falls) */
export type StartNeeds = [hunger: number, thirst: number, energy: number];

/**
 * Called as an activity starts, after its option key has been set. Records the three need levels the person began it with, for the
 * review to hold them at if a start gate closes later. Nothing is recorded below 265, with the switch off, or for an activity that
 * has no option key (a review has nothing to look up for it).
 */
export function recordStartNeeds(world: World, p: Person, a: Activity): void {
  if (typeof a.data.optKey !== 'string' || !hasKeptThroughNeeds(world)) return;
  a.data.needsAtStart = [p.needs.hunger, p.needs.thirst, p.needs.energy] satisfies StartNeeds;
}

/**
 * The need levels to hold while the planner is asked once more, or null when asking could change nothing: no record on the activity,
 * or none of the three is worse now than when it began. Each is the better of now and then, so a need that has improved is never held
 * back and a need that has worsened is held where it was.
 */
export function needsToHold(world: World, p: Person, a: Activity): StartNeeds | null {
  if (!hasKeptThroughNeeds(world)) return null;
  const rec = a.data.needsAtStart as unknown;
  if (!Array.isArray(rec) || rec.length !== 3 || !rec.every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  let worse = false;
  const hold = [0, 0, 0] as StartNeeds;
  for (let i = 0; i < 3; i++) {
    const now = p.needs[GATED[i]];
    hold[i] = Math.max(now, rec[i]);
    if (now < rec[i]) worse = true;
  }
  return worse ? hold : null;
}

/**
 * Run `read` with the person's hunger, thirst and tiredness set to `hold`, and put them back exactly as they were, also when `read`
 * throws. `read` must only read (the observer form of the option planner writes nothing; see docs/KEPT_TARGET.md for how that was checked).
 */
export function withNeedsHeld<T>(p: Person, hold: StartNeeds, read: () => T): T {
  const was: StartNeeds = [p.needs.hunger, p.needs.thirst, p.needs.energy];
  try {
    for (let i = 0; i < 3; i++) p.needs[GATED[i]] = hold[i];
    return read();
  } finally {
    for (let i = 0; i < 3; i++) p.needs[GATED[i]] = was[i];
  }
}

/**
 * Part 2. The workshop a withdrawal the person is on was made for: the id the running activity recorded, or null. Only a withdraw that
 * is still running names a place, so the nearest-first choice returns the moment it ends.
 */
export function keptBatchPlaceId(world: World, p: Person): number | null {
  if (!hasKeptBatchPlace(world)) return null;
  const a = p.activity;
  if (!a || a.kind !== 'withdraw') return null;
  const id = a.data.forPlace;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}
