import { findBuildSpot } from './buildings';
import { runsRulesVersion } from './rulesversion';
import type { BuildingType, Person, World } from './types';

// RULES 250: A WORKSHOP THAT FINDS NO SPOT NEAR THE HUB LOOKS FURTHER OUT.
//
// Measured (docs/GROWTH_PLAN.md, "The famine at rules 244", gen-4 and the granary): a granary is looked for 3 to 11 tiles from the hub
// (a bakery 5 to 14, a kiln or smithy 7 to 15). In gen-4, the most crowded world at year 1, the want and the planner were there (a
// granary wanted in every sample, 231 "no suitable spot" refusals from 27 people by day 60) but the ground was not: free granary spots
// 3 to 11 tiles out fell from 81 at the start to 10 at day 5.5 and none from day 8.25 for good, while 3 to 20 tiles still held 84 at
// day 24. A world with no granary has the one famine. From 250, when the ring finds nothing, the same search is made in the band
// nine tiles beyond it (a granary 11 to 20, a bakery 14 to 23, a kiln or smithy 15 to 24), nearest to the old edge first. The ring that
// worked is untouched, so a world that always found a spot is the same world; only a refusal changes. The person still has to have
// seen the ground (`findBuildSpot` reads what they have explored), and a quarry or a mine, placed at a deposit, is not affected.
// Rules 249 and earlier, authored worlds and `setRingFallback(false)` (lab arm `rich-no-ring-fallback`) keep the refusal.

export const RING_FALLBACK_FROM = 250;
/** how far past the ordinary ring the second look reaches, in tiles */
export const RING_EXTRA = 9;

let enabled = true;
export const ringFallbackOn = (): boolean => enabled;
/** Lab switch `rich-no-ring-fallback`: no spot beyond the ordinary ring is looked for, as before 250; no effect below 250. */
export function setRingFallback(on: boolean): void {
  enabled = on;
}
export const hasRingFallback = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, RING_FALLBACK_FROM);

/** The outer edge of the ordinary ring a workshop of this type is looked for in (production.ts optPlanFacilities). */
export const ordinaryRingEnd = (type: BuildingType): number => (type === 'granary' || type === 'hall' ? 11 : type === 'kiln' || type === 'smithy' ? 15 : 14);

/** A spot in the band beyond the ordinary ring, or null when the rule is off or there is none either. */
export function ringFallbackSpot(world: World, p: Person, type: BuildingType, ax: number, ay: number): { x: number; y: number } | null {
  if (!hasRingFallback(world)) return null;
  const end = ordinaryRingEnd(type);
  return findBuildSpot(world, p, type, ax, ay, end, end + RING_EXTRA, end + 1);
}
