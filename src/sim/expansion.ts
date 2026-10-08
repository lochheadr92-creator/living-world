// The village-economy expansion's catalogue gate (docs/BUILDINGS.md): which of the rich-only building types may be considered, planned,
// built and counted in a given world. In a world without rich dynamics none may, whatever the experiment switches say.
import { RICH_ONLY_BUILDINGS } from './constants';
import { isRich } from './mood';
import type { BuildingType, World } from './types';

/** An experiment switch (beside the world, not in it: not saved, not hashed): types switched off here are not built even in a rich world. */
const off = new Set<BuildingType>();
export function setBuildingEnabled(type: BuildingType, on: boolean): void {
  if (on) off.delete(type);
  else off.add(type);
}

/** may this kind of building be considered, planned or counted in this world? (ordinary worlds: only the original ones) */
export function buildable(world: World, type: BuildingType): boolean {
  if (!RICH_ONLY_BUILDINGS.includes(type)) return true;
  return isRich(world) && !off.has(type);
}
