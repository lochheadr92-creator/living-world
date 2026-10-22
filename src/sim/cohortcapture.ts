// Founding-camp cohort capture: the Stage 4 cohort decision, option A.
//
// Each household belongs to the camp it was founded at. The camp is captured at the moment of formation - where the
// world-gen laying out that camp creates the household, or where an arriving group is let in - and recorded here, in a
// module-level map, not on the household and not in World. Freezing the Stage 4 cohort therefore knows every household's
// camp even before it has a home, which was the whole gap in the nearest-home rule (38 of 100 people in a Large world
// had no home at day 0 and stayed unknown, and they were the most-contacted third).
//
// This is measurement, like the transmission diagnostics: it consumes no randomness, mutates nothing in World, and lives
// outside the save and the hash. The nearest-camp capture is the default once this module is loaded, so a real world
// captures itself as it is built; a world that never goes through the formation sites (a staged scene, a hand-built
// test world) simply leaves the map empty and the cohort rule falls back to the old nearest-home convention.
import { nearestHub } from './settlements';
import type { Household, World } from './types';

export const UNKNOWN = -1;

const founding = new Map<number, number>();
let capture: ((world: World, hh: Household, x: number, y: number) => void) | undefined = captureNearestCamp;

export function setCohortCapture(fn: ((world: World, hh: Household, x: number, y: number) => void) | undefined): void {
  capture = fn;
}

/** clear the map; a run must start from an empty map so consecutive seeds never leak into each other */
export function resetCohortCapture(): void {
  founding.clear();
}

/** the camp a household was founded at, or UNKNOWN when it was never captured */
export function campOfHousehold(hhId: number): number {
  return founding.get(hhId) ?? UNKNOWN;
}

/** every formation site calls this; a no-op unless a capture is registered */
export function captureHouseholdCamp(world: World, hh: Household, x: number, y: number): void {
  if (capture) capture(world, hh, x, y);
}

/** the default: the settlement whose centre is nearest to the formation point (the camp wins a tie) */
export function captureNearestCamp(world: World, hh: Household, x: number, y: number): void {
  const index = new Map<string, number>();
  [world.camp, ...(world.extraSettlements ?? [])].forEach((h, i) => index.set(`${h.x},${h.y}`, i));
  const hub = nearestHub(world, x, y);
  const c = index.get(`${hub.x},${hub.y}`);
  if (c !== undefined) founding.set(hh.id, c);
}
