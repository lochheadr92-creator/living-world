import { runsRulesVersion } from './rulesversion';
import { OVEN_FROM, OVEN_RECIPES } from './recipes';
import type { Recipe } from './recipes';
import type { ItemKind, Items, World } from './types';

// RULES 249: A FULL OVEN. A milling or a firing takes as much as the shelves hold, up to three measures, instead of always one.
//
// Measured (docs/GROWTH_PLAN.md, "The famine at rules 244"): grain is not short, turning it into food is. The bakery fires 1.6 times a
// day of a possible 8, and a firing takes five or six trips for four loaves; 58 percent of the grain is eaten raw. A batch was always
// the recipe's one measure however much grain stood on the shelf. From 249 the job that begins is the largest of three measures
// (milling 4, 8 or 12 grain to 3, 6 or 9 flour; a firing 3, 6 or 9 flour with 2, 3 or 4 water and one wood to 4, 8 or 12 loaves; work
// 1, 1.5 or 2 times) whose inputs the workshop's own shelves, as this person may use them, already hold and whose product has room.
// Nobody is made to fetch more: the planner still wants and brings one measure; a larger batch happens when more was brought.
//
// The larger recipes are not in RECIPES, so no planner offers them or counts on them (recipes.ts OVEN_RECIPES); `startJob` swaps the
// recipe it was given for one of them, and everything that reads a running job finds it in RECIPE_BY_ID. `facilitySnapshot` reports a
// larger batch under its base recipe's id, so the planners recognise "the batch of mine at the bakery" as before.
// Rules 248 and earlier, authored worlds and `setOvenLoad(false)` (lab arm `rich-no-oven-load`) keep one measure.

let enabled = true;
export const ovenLoadOn = (): boolean => enabled;
/** Lab switch `rich-no-oven-load`: a batch is the recipe's one measure, as before 249; no effect below 249. */
export function setOvenLoad(on: boolean): void {
  enabled = on;
}
export const hasOvenLoad = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, OVEN_FROM);

/** The larger batches of this recipe, biggest first, or none when the rule is off or the recipe has none. */
export function largerBatches(world: World, r: Recipe): Recipe[] {
  return hasOvenLoad(world) ? (OVEN_RECIPES[r.id] ?? []) : [];
}

/** What the biggest batch of this recipe takes, inputs and fuel together, or null when the rule is off or the recipe has no larger batch. */
export function fullLoadNeed(world: World, r: Recipe): Items | null {
  const big = largerBatches(world, r)[0];
  if (!big) return null;
  const need: Items = {};
  for (const k of Object.keys(big.inputs) as ItemKind[]) need[k] = (need[k] ?? 0) + (big.inputs[k] ?? 0);
  for (const k of Object.keys(big.fuel) as ItemKind[]) need[k] = (need[k] ?? 0) + (big.fuel[k] ?? 0);
  return need;
}
