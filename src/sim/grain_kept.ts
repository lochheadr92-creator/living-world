// Rules 243 (the owner's direction, 13 November 2026): grain is kept for bread.
//
// "Make it so people don't eat grain as much and store it to be used by a granary for bread."
//
// Measured before (`docs/GROWTH_PLAN.md` "Grain is kept for bread"): six ordinary worlds baked not one loaf in their first two
// and a half years; over twenty years five of twelve settlements never raised a granary, seven never a bakery, and hardly one
// a mill. The reason is a circle. A granary is wanted by somebody holding six grain and working two plots, a bakery by
// somebody holding eight, and bread by a household that already has more food than it needs; but grain is eaten raw as soon as
// it is picked (it is the third thing eaten, after berries and fruit), so nobody ever holds six.
//
// From 243, in rich worlds, four separately switched parts:
//   spare  raw grain is not eaten while there is anything else to eat in the same pack or store: it is the last thing
//          taken, not the third. Somebody with nothing but grain still eats it.
//   bins   a household putting grain by in the granary keeps one unit in the pack for the day, not three or four.
//   want   a granary is wanted by anybody whose household works a plot, and a bakery by anybody who knows of a granary or
//          works a plot, whether or not they hold grain and whether or not their household is short of food (a short
//          household needs them more). The granary still needs its timber yard for planks and the bakery its kiln for bricks.
//   bake   bread is a household's staple, not its luxury: any household with four grain to its name (in pack, home and its
//          share of the bins) wants bread until it holds three loaves a head (24 at most), and wants it more (BAKE_WORTH).
//          Grain and flour kept at home may go into bread whether or not the household has plenty: baking them is not
//          spending its food.
//
// Why the bins matter. Since rules 169 a look at a store remembers that there is grain in it, not how much: nine grain at
// home are remembered as one. A household's share of the granary is kept by the granary's own book and is exact. So the grain
// a household can count, and bake from four at a time, is the grain in its pack and in the bins; `bins` and `want` are what put
// it there.
//
// Nothing is saved. Rich worlds at rules 243 and later only.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

export const GRAIN_KEPT_PARTS = ['spare', 'bins', 'want', 'bake'] as const;
export type GrainKeptPart = (typeof GRAIN_KEPT_PARTS)[number];
const on: Record<GrainKeptPart, boolean> = { spare: true, bins: true, want: true, bake: true };
/** Lab switch (never saved or hashed): all parts, or one. */
export function setGrainKept(enabled: boolean, part?: GrainKeptPart): void {
  if (part) on[part] = enabled;
  else for (const k of GRAIN_KEPT_PARTS) on[k] = enabled;
}
export const grainKeptPartOn = (part: GrainKeptPart): boolean => on[part];
export const hasGrainKept = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 243);

/** Is raw grain passed over while anything else is there to eat? economy.ts pickFood asks. */
export const sparesGrain = (world: World): boolean => on.spare && hasGrainKept(world);

/** grain kept in the pack when the rest goes to the bins, in place of three or four (two for a winter reserve) */
export const GRAIN_IN_PACK = 1;
export const grainInPack = (world: World, before: number): number => (on.bins && hasGrainKept(world) ? Math.min(before, GRAIN_IN_PACK) : before);

/** the signal a worked plot gives for a granary, and a granary or a worked plot for a bakery (0.6 lays one out) */
export const GRAIN_WORKS_SIGNAL = 0.75;
/** Are the granary and the bakery wanted for the plots alone, short of food or not? */
export const wantsGrainWorks = (world: World): boolean => on.want && hasGrainKept(world);

/** loaves a head a household wants to hold, and the most it wants, in place of 1.2 a head and 8 */
export const LOAVES_A_HEAD = 3;
export const LOAVES_MOST = 24;
/** what wanting bread is worth before the baker's diligence, in place of 14 (20 with dependents) */
export const BAKE_WORTH = 26;
/** Is bread wanted as the household's staple? */
export const breadIsStaple = (world: World): boolean => on.bake && hasGrainKept(world);
