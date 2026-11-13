// Rules 242 (the owner's direction, 13 November 2026): bread feeds far more for its size, and keeps.
//
// "Bread should be much more nutritional for much less storage overall." Measured at rules 236 (`scripts/famine_probe.ts`,
// `docs/GROWTH_PLAN.md` "Step I, second finding"): a settlement of ninety eats about 300 units of food a day, three and a
// third a head, most of it berries and fruit at 12 and 16 a unit; it stores about 600 units, two days, of which 86 spoil
// every day. A loaf was 30, a little more than the raw grain (22) it is made of, and went off more than twice as fast as
// grain (0.5 against 0.22 of a berry's rate).
//
// From 242, in rich worlds:
//   feeds  a loaf is worth BREAD_FEEDS (60) to whoever eats it: a day's food in one unit, so the same shelf holds three
//          times the days. The recipes are unchanged (six grain make five flour make six or seven loaves), so the grain a
//          field gives feeds about three times as many once it is baked. Eating still takes the smallest thing that fills
//          the hunger there is (economy.ts pickFood), so berries and fruit go first and bread is what is left to keep.
//   keeps  bread goes off at BREAD_KEEPS (0.15) of a berry's rate, slower than grain, in place of 0.5.
//
// Every place that reads what a food is worth or how fast it spoils asks here. Nothing is saved. Two switched parts. Rich
// worlds at rules 242 and later only.
import { NUTRITION, PERISHABLE } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { FoodKind, ItemKind, World } from './types';

export const BREAD_FEEDS_PARTS = ['feeds', 'keeps'] as const;
export type BreadFeedsPart = (typeof BREAD_FEEDS_PARTS)[number];
const on: Record<BreadFeedsPart, boolean> = { feeds: true, keeps: true };
/** Lab switch (never saved or hashed): both parts, or one. */
export function setBreadFeeds(enabled: boolean, part?: BreadFeedsPart): void {
  if (part) on[part] = enabled;
  else for (const k of BREAD_FEEDS_PARTS) on[k] = enabled;
}
export const breadFeedsPartOn = (part: BreadFeedsPart): boolean => on[part];
export const hasBreadFeeds = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 242);

/** what a loaf is worth to whoever eats it (of a hunger of 100), in place of 30 */
export const BREAD_FEEDS = 60;
/** how fast bread goes off relative to berries, in place of 0.5 (grain is 0.22) */
export const BREAD_KEEPS = 0.15;

/** What a unit of this food is worth to whoever eats it, in this world. */
export function nutritionOf(world: World, k: FoodKind): number {
  return k === 'bread' && on.feeds && hasBreadFeeds(world) ? BREAD_FEEDS : NUTRITION[k];
}
/** How fast this thing goes off relative to berries, in this world (1 for anything not listed, as the callers had it). */
export function perishableOf(world: World, k: ItemKind): number {
  return k === 'bread' && on.keeps && hasBreadFeeds(world) ? BREAD_KEEPS : PERISHABLE[k] ?? 1;
}
