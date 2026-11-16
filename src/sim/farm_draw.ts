import { beliefsByKind } from './optutil';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

// RULES 255: FARMING DRAWS PEOPLE, MOST WHEN THE WILD FOOD THEY KNOW IS THINNING.
//
// Read in source (options_work.ts optFarm): a plot is worked at a utility of 17 to 38 plus 8 times the household's own shortage, and nothing in a
// person's weighing looks at whether the wild food they gather is running out. The wild food standing falls to a third of its capacity in settlements
// of 180 and more (docs/GROWTH_PLAN.md "Stage 9, first read") while the farm option stays the same, so people keep to the easy choice until the wild
// is gone. Nobody has a long-term want for a source that does not run out.
//
// From 255, in rich worlds, two separately switched parts, both added to the term the household's own shortage already adds to every field option
// (new ground, finishing the ground, planting, tending, harvesting):
//   base  a flat BASE_DRAW (4)
//   thin  up to THIN_DRAW (12), by how far short of full the wild food this person remembers seeing in the last two days stands: nothing while
//         it is at or above THIN_FROM (0.6) of its capacity, the full amount when it is gone. A person who has seen fewer than THIN_MIN (3) wild
//         places lately feels nothing from it. It reads the person's own beliefs only, never the world's.
// A first dose and not a measured one. Rules 254 and earlier, authored worlds and a switch thrown keep the old weighing.

export const FARM_DRAW_FROM = 255;
export const BASE_DRAW = 4;
export const THIN_DRAW = 12;
export const THIN_FROM = 0.6;
export const THIN_MIN = 3;
const FRESH = 2 * 2400;

const on = { base: true, thin: true };
export type FarmDrawPart = keyof typeof on;
export const FARM_DRAW_PARTS = Object.keys(on) as FarmDrawPart[];
/** Lab switches (never saved or hashed). */
export const farmDrawPartOn = (part: FarmDrawPart): boolean => on[part];
export function setFarmDraw(enabled: boolean, part?: FarmDrawPart): void {
  if (part) on[part] = enabled;
  else for (const k of FARM_DRAW_PARTS) on[k] = enabled;
}
export const hasFarmDraw = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, FARM_DRAW_FROM);

/** how thin the wild food this person has lately seen stands, 0 (at or above THIN_FROM of capacity, or too little seen) to 1 (gone) */
export function wildThinness(world: World, p: Person): number {
  let have = 0;
  let cap = 0;
  let n = 0;
  for (const b of beliefsByKind(p, ['berry_bush', 'fruit_tree', 'fish_spot', 'wild_grain'])) {
    if (b.src !== 'seen' || world.tick - b.seen > FRESH || b.max <= 0) continue;
    have += Math.min(b.amount, b.max);
    cap += b.max;
    n++;
  }
  if (n < THIN_MIN || cap <= 0) return 0;
  const share = have / cap;
  return share >= THIN_FROM ? 0 : (THIN_FROM - share) / THIN_FROM;
}

/** what is added to the utility of every field option for this person */
export function farmDraw(world: World, p: Person): number {
  if (!hasFarmDraw(world)) return 0;
  return (on.base ? BASE_DRAW : 0) + (on.thin ? THIN_DRAW * wildThinness(world, p) : 0);
}
