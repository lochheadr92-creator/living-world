// Rules 226 (the growth stream, `docs/GROWTH_PLAN.md`): more food from the same land.
//
// The 20-year run at rules 220 (`docs/GENERATION_RUN.md`) showed that the land of an ordinary world feeds about 35 people
// through a lean season, that people are under the hungry line for half their waking time in every year, and that farm plots
// growing from 14 to 95 did not change it. Rules 225 lifted the limits on people and building; the owner's instruction of
// 13 November 2026 was then to increase the food available if need be, so that a settlement can grow past what it was.
//
// From 226, two separately switched parts:
//
//   * WILD. Wild food (berries, fruit, fish, wild grain) comes back PLENTY_WILD times as fast. A place holds no more than it
//     did; it refills sooner once picked. What people expect of a place they have not seen for a while follows the same pace
//     (knowledge.ts estimatedAmount), so their memories are no further from the land than before.
//   * CROPS. A ripened field plot carries PLENTY_CROPS times the grain. Seeds, the time to ripen and the work are unchanged.
//
// A lean season, a dry spell and winter still cut regrowth and crops by the fractions they always did, now of the larger
// amount. Nothing is saved. Rich worlds at rules 226 and later only; rules 225 and earlier, authored worlds and a switch thrown
// keep the old amounts.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

export const PLENTY_WILD = 2;
export const PLENTY_CROPS = 2;

const on = { wild: true, crops: true };
export type PlentyPart = keyof typeof on;
export const PLENTY_PARTS = Object.keys(on) as PlentyPart[];
/** Lab switches (never saved or hashed). */
export const plentyPartOn = (part: PlentyPart): boolean => on[part];
export function setPlenty(enabled: boolean, part?: PlentyPart): void {
  if (part) on[part] = enabled;
  else for (const k of PLENTY_PARTS) on[k] = enabled;
}

const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 226);
const WILD_FOOD = new Set(['berry_bush', 'fruit_tree', 'fish_spot', 'wild_grain']);

/** how many times as fast this kind of source comes back (1 for anything that is not wild food) */
export const wildPlenty = (world: World, type: string): number => (on.wild && WILD_FOOD.has(type) && runs(world) ? PLENTY_WILD : 1);
/** how many times the grain a ripened plot carries */
export const cropPlenty = (world: World): number => (on.crops && runs(world) ? PLENTY_CROPS : 1);
