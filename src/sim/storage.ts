// Cool storage (the cellar) and what a household notices going off: the expansion's answer to spoilage (docs/BUILDINGS.md). Rich dynamics only.
//
// Stored food spoils faster in a rich world (hardship.ts: three times). A household sees what goes off in its own stores and keeps a running
// tally that fades with a half-life of two days (`Household.lost`). A household that has lost a few units lately, and knows where stone
// comes from, may decide to dig a cellar: a chamber in which food goes off at under a third of the ordinary pace (and so at about the
// ordinary pace despite the rich world's factor of three). It holds food only, and belongs to the household that dug it.
import { DAY, isFoodKind } from './constants';
import { isRich } from './mood';
import type { Household, ItemKind, World } from './types';

export const CELLAR_SPOIL = 0.3;
export const LOSS_HALF_LIFE = DAY * 2;
/** a household that has found this much gone off lately (fading) thinks of a cellar */
export const LOSS_THRESHOLD = 4;

export function foodLossOf(world: World, hh: Household | undefined): number {
  if (!hh?.lost) return 0;
  return hh.lost.units * Math.pow(0.5, (world.tick - hh.lost.tick) / LOSS_HALF_LIFE);
}

export function noteFoodLoss(world: World, hhId: number, n: number): void {
  if (n <= 0 || !hhId || !isRich(world)) return; // an ordinary world keeps no such tally (and its saves stay as they were)
  const hh = world.households.find((h) => h.id === hhId);
  if (hh) hh.lost = { units: foodLossOf(world, hh) + n, tick: world.tick };
}

/** a cellar takes food and flour, nothing else (seed stays in the home, where planting looks for it) */
export const cellarAccepts = (item: ItemKind): boolean => isFoodKind(item) || item === 'flour';
