// Rules 169: a sight of a building store, a cart load or a pile remembers which kinds are there, and whether the
// container looked full, not the exact split. Before 169 snapshotEntity copied the counts. Each present kind is
// remembered as one. When the true weight meets the cap, the lexicographically first kind that is not a textile is
// raised until the remembered weight meets the cap. That stand-in is not the true split. A store of one kind filled
// exactly to the cap reproduces that count, because the cap and the unit weight determine it. A partial store does not.
// Textile kinds stay at the counts that were there: the clothing check requires the textile observation to be no
// larger than the remembered items, and there is no separate textile sign. A partial store of only textiles is
// therefore remembered exactly. Carcass parts and a gear pile's own record are not this bag of items.
import { WEIGHT } from './constants';
import { cloneItems, weightOf } from './economy';
import { runsRulesVersion } from './rulesversion';
import { textileGoods } from './textile_stock';
import type { ItemKind, Items, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-seen-stock` restores the exact copy inside a rules-169 rich world. */
export const seenStockOn = (): boolean => enabled;
export function setSeenStock(on: boolean): void { enabled = on; }
export const hasSeenStock = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 169);

/** Remembered contents of one container. `cap` is that container's weight cap (a pile has none; pass a cap it will not meet). */
export function glancedItems(world: World, items: Items, cap: number): Items {
  if (!hasSeenStock(world)) return cloneItems(items);
  const exact = cloneItems(items);
  const textiles = new Set<ItemKind>(textileGoods(world));
  const kinds = (Object.keys(exact) as ItemKind[]).filter((k) => (exact[k] ?? 0) > 0).sort();
  const remembered: Items = {};
  for (const k of kinds) remembered[k] = textiles.has(k) ? exact[k]! : 1;
  if (weightOf(exact) + 1e-9 >= cap && weightOf(remembered) + 1e-9 < cap) {
    const standIn = kinds.find((k) => !textiles.has(k));
    const unit = standIn ? WEIGHT[standIn] : 0;
    if (standIn && unit > 0) {
      while (weightOf(remembered) + 1e-9 < cap) remembered[standIn] = (remembered[standIn] ?? 0) + 1;
    }
  }
  return remembered;
}
