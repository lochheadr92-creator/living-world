// Rules 234 (the growth stream, `docs/GROWTH_PLAN.md` step F): the ids of real things and of water knowledge no longer meet.
//
// Everything in a world takes its id from one counter that only rises (registry.ts newId, and the activities, events and plans
// that take from it too). A person's knowledge of a stretch of shore is a belief with a made-up id: before 234, one million
// plus the number of the shore cell (knowledge.ts). Nothing stopped the counter reaching a million: a settlement of 30 to 50
// used 318,000 ids in 20 years (`docs/GROWTH_PLAN.md`), so a large one crosses it within a lifetime, and from then on a real
// tree or person is taken for water by everything that asks (gap ledger G226; reproduced by the adversarial review of
// 13 November, AR-04). The record of who was told what used `listener * 1,000,000 + belief id`, which two different pairs can
// share as soon as a belief id passes a million, and water ids start there (G227, AR-03).
//
// From 234:
//
//   * water knowledge takes its ids from WATER_IDS_FROM (two thousand million) upward. The counter cannot get there in any
//     run: at the measured 318,000 ids in 20 years it is a hundred thousand years off, at a hundred times that a thousand, and
//     `checkCounter` refuses the id if it ever did, so the two ranges are apart by rule and not by expectation. The base is
//     kept under two to the thirty-second on purpose: a JavaScript object lists keys below that in number order and keys above
//     it in the order they were added, so a larger base would also change the order a person's beliefs are walked in.
//     Either way a world at 234 parts from the same world at 233 within days (measured, three worlds): some choices are
//     hashed on a belief's id, and a water belief's id is now a different number. That is a different draw, not a different
//     rule; the comparison of versions in the lab is the check that nothing moves by more than a single draw moves it.
//   * the record of who was told what is keyed by the pair itself, "listener:belief", which no two pairs share.
//
// A world keeps the scheme it was made with: rules 233 and earlier, and authored worlds, keep one million and the product, so
// their saves and recordings read as they always did. Separately, and for every save whatever its rules: a save whose counter is
// not beyond the ids in use, or in which two things share an id, is refused on loading (app/save.ts; AR-02).
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** where water-knowledge ids began before rules 234 */
export const WATER_IDS_BEFORE = 1_000_000;
/** where they begin from rules 234: out of the counter's reach */
export const WATER_IDS_FROM = 2_000_000_000;

export const hasSeparateIds = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 234);

/** The first id of water knowledge in this world. */
export function waterIdBase(world: World): number {
  return hasSeparateIds(world) ? WATER_IDS_FROM : WATER_IDS_BEFORE;
}

/** The key under which "this listener was told of this belief" is kept. A number before 234; the pair itself from 234. */
export function pairKey(world: World, listenerId: number, beliefId: number): number {
  if (!hasSeparateIds(world)) return listenerId * 1_000_000 + beliefId;
  // an object's keys are text either way; the pair written out is a key no other pair has
  return `${listenerId}:${beliefId}` as unknown as number;
}

/** Called by the counter: a real thing may never be given an id in the water range. */
export function checkCounter(world: World, id: number): number {
  if (id >= WATER_IDS_FROM && hasSeparateIds(world)) throw new Error('the id counter has reached the range kept for water knowledge');
  return id;
}
