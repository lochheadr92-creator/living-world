// Wells: the first building of the village-economy expansion (docs/BUILDINGS.md). Rich dynamics only.
//
// A well is a building whose store holds water. Water seeps in slowly (one unit every WELL_REFILL ticks, up to WELL_CAP units: the ledger
// records each unit as created "seepage into a well", so nothing appears unaccounted) and is taken out by whoever comes, by drinking
// (the `drink` activity) or by filling a pack (the `fetch_water` activity). What is drawn is gone from the well; a well with nothing in it
// is dry until it has seeped again. So a well relieves a long walk to the shore for a small cluster of households and nobody else's
// day changes: about 48 units a day is enough for some eighteen people (a person drinks about 2.7 units a day).
//
// Planning knowledge: a person reckons what is in a well from their own last look (the belief's snapshot) plus the seepage since,
// never from the well itself. Whether it was really there to draw from is found out on arrival.
import { addItem } from './economy';
import { ledgerCreate } from './economy';
import { isRich } from './mood';
import type { Belief, World } from './types';

export const WELL_CAP = 12;
/** a household thinks of a well when the nearest water it knows is farther from home than this (tiles) … */
export const WELL_FAR = 9;
/** … and no well it knows of stands within this of home; and a new well is not laid out within this of another */
export const WELL_REACH = 14;
export const WELL_REFILL = 50;
/** a well whose structure has fallen below this condition no longer seeps usefully (it has silted up and wants mending) */
export const WELL_MIN_CONDITION = 10;

/** world process: wells fill. Called every tick; does its work every WELL_REFILL ticks. */
export function updateWells(world: World): void {
  if (world.tick % WELL_REFILL !== 29 || !isRich(world)) return;
  for (const b of world.buildings) {
    if (b.type !== 'well' || b.condition < WELL_MIN_CONDITION) continue;
    const have = b.store.items.water ?? 0;
    if (have >= WELL_CAP) continue;
    addItem(b.store.items, 'water', 1);
    ledgerCreate(world, 'water', 1, 'seepage into a well');
  }
}

/** What a person reckons a well holds: their last look at it, plus the seepage since (never more than a well can hold). */
export function wellEstimate(world: World, b: Belief): number {
  const seen = b.items?.water ?? 0;
  return Math.min(WELL_CAP, seen + Math.floor((world.tick - b.seen) / WELL_REFILL));
}
