import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

// RULES 252: A FOREST THAT GROWS BACK AS FAST AS A BIGGER SETTLEMENT FELLS IT.
//
// Measured (docs/GROWTH_PLAN.md "What the traces say caused it" and "Stage 6: the wood counterfactual", twelve 20-year worlds, and two
// worlds continued 60 days with the forest kept full, one run each, a description): wood is the settlement's one resource that does not come
// back at the pace it is used. A mature tree seeds a sapling with a chance of 0.0035 at each of its 240-tick checks, only while the
// world's trees are below the cap, so regrowth is proportional to the trees left and falls to nothing as they go. Above about 40 people the
// net change is -17 trees a 12-day year at 40 to 59 people, -46 at 60 to 79 and -70 to -80 above 80; ten of twelve worlds are down to 15 trees
// or fewer by day 240, and the roofs then fall (60 to 80 percent of buildings) while the people are still fed. With wood kept plentiful
// meadow ends at 177 people and 188 buildings instead of 11 and 8, and fern's roofs hold until a lean season it still does not survive whole.
//
// From 252 a mature tree's chance to seed a sapling at each check is eight times the ordinary one. A first dose and not a measured one:
// about the strength at which regrowth at a few hundred trees outruns what 80 to 140 people fell. What is untouched: the cap (the world's
// first tree count over 1.08), where a sapling may stand (free grass or forest, not within 7 of a hub, not beside water, under nine trees
// in reach), how fast a sapling grows, and the order of the world's random draws. A forest already at the cap behaves as before.
// Rules 251 and earlier, authored worlds and `setTreeRegrowth(false)` (lab arm `rich-no-tree-regrowth`) keep the ordinary chance.

export const TREE_REGROWTH_FROM = 252;
/** how many times the ordinary sapling-seeding chance applies from 252 */
export const TREE_REGROWTH_FACTOR = 8;
/** the ordinary chance a mature tree seeds a sapling at one of its checks */
export const TREE_SEED_CHANCE = 0.0035;

let enabled = true;
export const treeRegrowthOn = (): boolean => enabled;
/** Lab switch `rich-no-tree-regrowth`: a tree seeds at the ordinary chance, as before 252; no effect below 252. */
export function setTreeRegrowth(on: boolean): void {
  enabled = on;
}
export const hasTreeRegrowth = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, TREE_REGROWTH_FROM);

/** The chance a mature tree seeds a sapling at one of its 240-tick checks. */
export const treeSeedChance = (world: World): number => (hasTreeRegrowth(world) ? TREE_SEED_CHANCE * TREE_REGROWTH_FACTOR : TREE_SEED_CHANCE);
