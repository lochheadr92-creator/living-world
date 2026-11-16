import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

// RULES 254: MORE FOOD GROWS, AND FASTER.
//
// Measured (docs/GROWTH_PLAN.md "Stage 9, first read", twelve 20-year traces, one run each, a description): standing wild food as a share of its
// capacity on ordinary days falls as a settlement grows, median 0.92 at 20 to 59 people, 0.62 at 100 to 139 and 0.37 at 180 or more, and a lean
// season then cuts what is left to a tenth; where under 0.15 a head was left, 75 percent died within ten days (3 seasons). Wild food has come back
// twice as fast and a ripened plot has carried twice the grain since rules 226 (plenty.ts), and that is not keeping up above 100 people.
//
// From 254, in rich worlds, two separately switched parts, each a further dose on rules 226's:
//   wild   wild food (berries, fruit, fish, wild grain) comes back WILD_FACTOR times as fast (4, from 2)
//   crops  a ripened field plot carries CROP_FACTOR times the grain (3, from 2)
// A place holds no more than it did and what people expect of a place not seen for a while follows the same pace (knowledge.ts, through
// plenty.ts wildPlenty). Seeds, the time to ripen and the work are unchanged; a lean season, a dry spell and winter cut regrowth and crops by the
// fractions they always did, now of the larger amount. A first dose and not a measured one. Rules 253 and earlier, authored worlds and a switch
// thrown keep rules 226's figures.

export const GROW_MORE_FROM = 254;
export const WILD_FACTOR = 4;
export const CROP_FACTOR = 3;

const on = { wild: true, crops: true };
export type GrowMorePart = keyof typeof on;
export const GROW_MORE_PARTS = Object.keys(on) as GrowMorePart[];
/** Lab switches (never saved or hashed). */
export const growMorePartOn = (part: GrowMorePart): boolean => on[part];
export function setGrowMore(enabled: boolean, part?: GrowMorePart): void {
  if (part) on[part] = enabled;
  else for (const k of GROW_MORE_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, GROW_MORE_FROM);

/** how many times as fast wild food comes back, given rules 226's figure */
export const wildGrowFactor = (world: World, ordinary: number): number => (on.wild && runs(world) ? WILD_FACTOR : ordinary);
/** how many times the grain a ripened plot carries, given rules 226's figure */
export const cropGrowFactor = (world: World, ordinary: number): number => (on.crops && runs(world) ? CROP_FACTOR : ordinary);
