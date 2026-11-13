// Rules 245 (the growth stream, `docs/GROWTH_PLAN.md` "What a household thinks it holds at home"): a household knows its own stores.
//
// Since rules 169 (seen_stock.ts) a look at a store remembers each kind there as one unit, and only a store that looks full is
// remembered as full. That is right for a shed one glances into in passing. It was written for every building alike, so it took in
// the household's own home and its cellar, where people live and put things themselves. A household that held four or five units
// of food at home remembered about one, counted itself short of food (`shortage` of `hhState`, options_work.ts) 87 to 92 times in a
// hundred where the true figure is 58 to 67, and withdrew food from its own store one unit a trip.
//
// Measured at rules 244 (`scripts/home_stock_probe.ts`, `review_evidence/growth-20261113/home-stock/`, aspen, birch, meadow and
// river, 24 days each, one run each): food at home remembered 0.77 to 1.19, true 3.72 to 5.52.
//
// From 245, when a person looks at a building their own household owns (`hhId` is theirs and not 0: the home, the cellar, any
// other building with their household's name on it), what they remember of its store is the exact contents, as it was before 169.
// Everything else is unchanged: another household's building, a shared building (`hhId` 0: the storehouse, the granary, the
// workshops), a cart and a pile are still remembered by the glance of rules 169.
//
// Told on: a belief can be passed to another person (news.ts tellBelief). A household's exact count of its own store is not for the
// asking, so what is passed to somebody of another household goes through the glance, as that person's own look would have. A
// listener of the building's own household is told the count.
//
// Where a person's belief of a building is written: knowledge.ts `observe`, the one place that knows both who looks and what is
// looked at (`snapshotEntity` has no person). A home seen from outside, beyond its door, keeps what was believed before, as
// rules 184 has it (home_interior.ts): this changes what a sight copies, not when a home's inside can be seen.
//
// One switched part. Nothing is saved. Rich worlds at rules 245 and later only.
import { cloneItems } from './economy';
import { runsRulesVersion } from './rulesversion';
import { glancedItems } from './seen_stock';
import type { Belief, Building, Items, Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-own-stores` remembers a household's own stores by the glance as well, as before rules 245. */
export const ownStoresOn = (): boolean => enabled;
export function setOwnStores(on: boolean): void { enabled = on; }
export const hasOwnStores = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 245);

/** Is this a building the person's own household owns? A shared building (`hhId` 0) is nobody's own. */
export const isOwnBuilding = (p: Person, b: Building): boolean => b.hhId !== 0 && b.hhId === p.hhId;

/** The exact contents of a building a person's own household owns, or null where the sight stays a glance (the other buildings, and before rules 245). */
export function ownStoreItems(world: World, p: Person, b: Building): Items | null {
  if (!hasOwnStores(world) || !isOwnBuilding(p, b)) return null;
  return cloneItems(b.store.items);
}

/** The contents a listener is given with a told belief of a building: exact for the building's own household, a glance for anyone else. */
export function itemsToldTo(world: World, listener: Person, b: Belief): Items {
  const items = b.items ?? {};
  if (!hasOwnStores(world) || b.kind !== 'building' || !b.hh || b.hh === listener.hhId) return { ...items };
  const e = world.byId.get(b.id);
  return glancedItems(world, items, e && e.ent === 'building' ? e.store.cap : 9999);
}
