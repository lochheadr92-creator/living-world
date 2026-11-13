// Rules 233 (the growth stream, `docs/GROWTH_PLAN.md` step 6): work is picked up where it was left.
//
// Somebody who begins to talk to a person at work puts that work on hold (activities.ts suspendActivity). Before 233 the hold
// threw away how far the piece in hand had got: the phase went back to the walk there and the count to nothing, and on picking
// it up the person "walked" to where they stood and began the piece again. Measured (rules 231, `scripts/job_drops.ts`, four
// settlements over eight days, `review_evidence/growth-20261113/builder-fetches/`): 581 holds at work set 43,476 ticks back to
// nothing, 24,890 of them rest, 3,389 gathering and about 1,200 making, tilling and mending; all but 14 of 1,302 held
// activities were picked up again. The adversarial review of 13 November (AR-01) found the same loss under a refusal: a
// grown person who answers a child "not now, I have to finish this" (rules 228) had already lost the piece they were finishing.
//
// From 233 the hold keeps the count. When the work is picked up it still goes through the walk and the handler's own beginning
// (the claim on the spot was given up for the talk and has to be taken again, and the thing worked on has to be there still);
// if after that the person stands where they stood and the piece is the same length as it was, the count is put back. Anything
// else, a different length, a different place, a beginning that fails, starts afresh as before.
//
// Two separately switched parts: JOBS (gather, craft, till, plant, tend, harvest, repair, tree_work: the handlers that count one
// piece of work up to its length; a workshop batch and a building site keep their own progress and always did) and REST (rest
// and warming up). What is kept is a small record in the held activity's data, saved with it. Rich worlds at rules 233 and
// later only; rules 232 and earlier, authored worlds and a switch thrown lose the count as before.
import { runsRulesVersion } from './rulesversion';
import type { Activity, ActivityKind, Person, World } from './types';

/** how near to where they stood the person must be for the count to be put back (tiles) */
export const SAME_PLACE = 1.5;
const JOB_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>(['gather', 'craft', 'till', 'plant', 'tend', 'harvest', 'repair', 'tree_work']);
const REST_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>(['rest', 'warm']);

const on = { jobs: true, rest: true };
export type PickedUpPart = keyof typeof on;
export const PICKED_UP_PARTS = Object.keys(on) as PickedUpPart[];
/** Lab switches (never saved or hashed). */
export const pickedUpPartOn = (part: PickedUpPart): boolean => on[part];
export function setPickedUp(enabled: boolean, part?: PickedUpPart): void {
  if (part) on[part] = enabled;
  else for (const k of PICKED_UP_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 233);
const keeps = (world: World, kind: ActivityKind): boolean => runs(world) && (on.jobs && JOB_KINDS.has(kind) || on.rest && REST_KINDS.has(kind));

/** What the hold keeps of the piece in hand. */
export interface KeptCount { progress: number; pprogress: number; duration: number; x: number; y: number }

/** Called as work is put on hold, before its count is thrown away: note how far the piece in hand had got, and where. */
export function keepCount(world: World, p: Person, a: Activity): void {
  if (!keeps(world, a.kind) || a.phase !== 'work' || !(a.duration > 0) || !(a.progress > 0)) return;
  a.data.kept = { progress: a.progress, pprogress: a.pprogress, duration: a.duration, x: p.x, y: p.y } satisfies KeptCount;
}

/**
 * Called when work has begun (again) and its handler's beginning has succeeded: put the kept count back if the person stands
 * where they stood and the piece is the length it was. The note is spent either way.
 */
export function putCountBack(world: World, p: Person, a: Activity): void {
  const k = a.data.kept as KeptCount | undefined;
  if (!k) return;
  delete a.data.kept;
  if (!keeps(world, a.kind) || a.phase !== 'work') return;
  if (Math.hypot(p.x - k.x, p.y - k.y) > SAME_PLACE || a.duration !== k.duration || !(k.progress < a.duration)) return;
  a.progress = Math.max(a.progress, k.progress);
  a.pprogress = Math.max(a.pprogress, k.pprogress);
}
