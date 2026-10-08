// The stockyard (village-economy expansion, docs/BUILDINGS.md). Rich dynamics only.
//
// A fenced yard by the houses where raw goods are stacked: logs, stone, clay and ore, nothing finished. It is everyone's: planners
// count what is in it like a storehouse, carts load from it, and whoever builds or works next collects from it instead of walking to
// the forest. It is filled two ways: a person carrying raw goods beyond a small reserve of their own stacks them there, and in slack
// time the diligent fetch more when the yard they know is low. Nothing in the yard is created or consumed by the yard itself.
//
// Planning knowledge: how full the yard is comes from the person's last look at it; what they carry is their own pack. The problem
// that makes a settlement lay one out is a local one: the trees this person actually gets wood from are a long walk from the camp.
import { BUILD_DEF, WEIGHT } from './constants';
const unitsOf = (n: number | undefined): number => n ?? 0;
import { hyp } from './util';
import type { Belief, ItemKind } from './types';

/** the wood a person knows is 'far' when the nearest few trees with wood in them average more than this from the camp (tiles) */
export const YARD_FAR = 10;
/** what a yard is kept stocked up to, by whoever has the time */
export const YARD_TARGET: Partial<Record<ItemKind, number>> = { wood: 16, stone: 10 };
/** a person keeps this much of their own before stacking the rest */
export const YARD_RESERVE: Partial<Record<ItemKind, number>> = { wood: 2, stone: 1 };

/** room left in a yard, by the person's last look (weight) */
export function yardRoom(b: Belief): number {
  let used = 0;
  for (const k of Object.keys(b.items ?? {}) as ItemKind[]) used += unitsOf(b.items?.[k]) * WEIGHT[k];
  return BUILD_DEF.stockyard.cap - used;
}

/** mean distance from a point of the nearest `n` known trees that still have wood in them; Infinity when none are known */
export function woodDistance(trees: Belief[], x: number, y: number, n = 5): number {
  const d = trees
    .filter((b) => b.amount >= 2)
    .map((b) => hyp(b.x - x, b.y - y))
    .sort((a, c) => a - c)
    .slice(0, n);
  if (!d.length) return Infinity;
  return d.reduce((s, v) => s + v, 0) / d.length;
}
