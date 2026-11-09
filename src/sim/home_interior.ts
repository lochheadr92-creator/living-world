// Rules 184: the contents of a home are learned from inside or at the door (gap G19, the remainder of rules 169).
//
// `observe` copied a building's store, racked tools, textile stock and gear stock into the observer's belief from anywhere inside sense
// radius; only the hearth was held back until the observer was indoors. So a person nine tiles from another household's hut learned that
// it held grain and a net. At 184 in a rich world, when the building is a solid home (hut or house) and the observer is neither inside it nor
// within two tiles of its footprint, the sight keeps what they already believed of its contents (nothing if they believed nothing) instead of
// copying the true store. The building's existence, type, household and condition are still learned from outside. Stores and workplaces are
// open sheds and are not touched. A limit: the belief's `seen` tick is still refreshed, so a kept figure can look fresher than it is.
// No benefit is claimed.
import { isSolidHome } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { Belief, Building, Person, World } from './types';

/** how near the footprint counts as "at the door" */
export const DOOR_REACH = 2;

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-home-interior` restores the sight of a home's contents from outside inside a rules-184 rich world. */
export const homeInteriorOn = (): boolean => enabled;
export function setHomeInterior(on: boolean): void { enabled = on; }
export const hasHomeInterior = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 184);

/** Whether this person can see into the building: inside it, or at its door. */
export function seesInside(p: Person, b: Building): boolean {
  if (p.indoors === b.id) return true;
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w));
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.h));
  return Math.hypot(dx, dy) <= DOOR_REACH;
}

/** Replace the contents of a fresh sight of a home with what the observer already believed, when they cannot see in. */
export function keepUnseenInterior(world: World, p: Person, e: Building, b: Belief): void {
  if (!hasHomeInterior(world) || !isSolidHome(e.type) || seesInside(p, e)) return;
  const old = p.beliefs[e.id];
  if (old?.items) b.items = { ...old.items }; else delete b.items;
  if (old?.tools) b.tools = [...old.tools]; else delete b.tools;
  if (old?.textileStock) b.textileStock = { observer: old.textileStock.observer, items: { ...old.textileStock.items } }; else delete b.textileStock;
  if (old?.gearStock) b.gearStock = { observer: old.gearStock.observer, items: { ...old.gearStock.items } }; else delete b.gearStock;
}
