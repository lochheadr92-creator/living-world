// Rules 244 (the owner's direction, 13 November 2026): farming carries the settlement, and the granary holds what it grows.
//
// "Do the farming scale." Measured at rules 236 (`docs/GROWTH_PLAN.md` "Step I, second finding"): a settlement of ninety
// works about ninety plots, one a head, and they give about ninety grain a day; three quarters of its food is the wild
// growing back, about 370 units a day however many mouths there are. A household wanted one plot and another for every two
// of its people. And the granary, where grain keeps and where a household's grain can be counted (grain_kept.ts), held 120
// units: little more than one a head.
//
// From 244, in rich worlds, two separately switched parts:
//   fields  a household wants a plot and another for each of its people (and one more when it is short of food, as before):
//           three plots for two people where it wanted two, five for four where it wanted three. With bread at 60 a loaf
//           (rules 242) about one plot a head feeds its people on an ordinary day; the rest is for winter, the lean season
//           and seed.
//   bins    a granary raised from now on holds GRANARY_HOLDS (480) units in place of 120: a settlement's grain in one
//           building, where three stood before. What people believe a granary can still take follows the same figure.
//
// The work of a plot, its seed and its yield are unchanged. Nothing is saved (a granary's capacity is on the building, as
// it always was). Rich worlds at rules 244 and later only.
import { BUILD_DEF } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { BuildingType, World } from './types';

export const FARM_SCALE_PARTS = ['fields', 'bins'] as const;
export type FarmScalePart = (typeof FARM_SCALE_PARTS)[number];
const on: Record<FarmScalePart, boolean> = { fields: true, bins: true };
/** Lab switch (never saved or hashed): both parts, or one. */
export function setFarmScale(enabled: boolean, part?: FarmScalePart): void {
  if (part) on[part] = enabled;
  else for (const k of FARM_SCALE_PARTS) on[k] = enabled;
}
export const farmScalePartOn = (part: FarmScalePart): boolean => on[part];
export const hasFarmScale = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 244);

/** How many plots a household of this many people wants: one and one a head from rules 244, one and one for every two before; one more when short. */
export function plotsWanted(world: World, members: number, short: boolean): number {
  const base = on.fields && hasFarmScale(world) ? 1 + members : 1 + Math.floor(members / 2);
  return base + (short ? 1 : 0);
}

/** what a granary raised from rules 244 holds, in place of 120 */
export const GRANARY_HOLDS = 480;
/** What a building of this kind holds in this world: the table in constants.ts, except the granary from rules 244. */
export function storeCapOf(world: World, type: BuildingType): number {
  return type === 'granary' && on.bins && hasFarmScale(world) ? GRANARY_HOLDS : BUILD_DEF[type].cap;
}
