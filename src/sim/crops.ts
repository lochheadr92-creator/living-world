// Rules 245 (the owner's request, 14 November 2026): households farm tomatoes and corn as well as grain.
//
// A field plot grows one of three crops. The crop is chosen when the plot is sown: the one its household has the fewest
// growing or ripe plots of, ties in the order grain, corn, tomatoes. So a household's only plot is grain, a second is
// corn, a third tomatoes, a fourth grain. No randomness is used. One 'seeds' item sows any crop.
//   corn      worth 20, keeps (0.3 of a berry's rate), yields as grain does
//   tomatoes  worth 14, yield half as much again, go off nearly as fast as berries (0.9)
// Both are food wherever fruit is (eaten, carried, stored, offered, fed to a child). Neither is a preserved food, goes in
// a granary bin, or is milled, baked or brewed. Since rules 243 raw grain is passed over while anything else is there to
// eat (economy.ts pickFood), so fresh vegetables leave the grain for the granary and bread.
//
// Nothing is saved except Plot.crop, absent for grain. Rich worlds at rules 245 and later only.
import { runsRulesVersion } from './rulesversion';
import type { Plot, World } from './types';

export type CropKind = 'grain' | 'corn' | 'tomatoes';
export const CROP_ORDER: readonly CropKind[] = ['grain', 'corn', 'tomatoes'];

let on = true;
/** Lab switch (never saved or hashed): every plot grows grain when off. */
export function setCrops(enabled: boolean): void { on = enabled; }
export const cropsOn = (): boolean => on;
export const hasCrops = (world: World): boolean => on && world.settings.dynamics === 'rich' && runsRulesVersion(world, 245);

/** what grows on this plot; a plot with no crop field is grain */
export const cropOf = (plot: Plot): CropKind => plot.crop ?? 'grain';

/** The crop to sow on this plot: the one its household has fewest other growing or ripe plots of. */
export function chooseCrop(world: World, plot: Plot): CropKind {
  if (!hasCrops(world)) return 'grain';
  const n: Record<CropKind, number> = { grain: 0, corn: 0, tomatoes: 0 };
  for (const o of world.plots) {
    if (o === plot || o.id === plot.id || o.hhId !== plot.hhId) continue;
    if (o.state === 'growing' || o.state === 'ripe') n[cropOf(o)]++;
  }
  let best: CropKind = 'grain';
  for (const c of CROP_ORDER) if (n[c] < n[best]) best = c;
  return best;
}

/** tomatoes yield half as much again */
export const TOMATO_YIELD = 1.5;
export const cropYield = (crop: CropKind, base: number): number => crop === 'tomatoes' ? Math.round(base * TOMATO_YIELD) : base;
