// EATING AT THE STORE WHEN THE PACK IS FULL (rules version 9, rich worlds).
//
// THE GAP. `eat_store` (act_resource.ts) used to take food out of a store by moving it into the person's pack, and only then
// eat it from the pack. A pack is limited by WEIGHT (`roomFor`), so a person carrying wood and stone for a house site, which
// is exactly what version 7's shelter plans send people out to do, had no room for even one berry. Nothing moved, the
// activity reported "there is no food there" about a store they could see was stocked, and `noteFailure` made them believe it
// for the next 400 ticks. Measured on the version-8 revision (4 seeds, 8 days): 198 of 348 finished store meals failed (57%),
// 189 of those with food in the store and no room in the pack, 47 of them by somebody whose hunger was already below 25.
//
// THE RULE. When nothing could be moved into the pack and the store does hold food, the person eats AT the store instead: each
// bite comes out of the store's own items and is consumed through the same ledger entry ('eaten') as a bite out of a pack. No
// food is created, none is carried, nothing is owed to anybody, and the household's food is spent exactly as it would have
// been. A meal at your own table does not need a free hand.
//
// WHAT IT IS NOT. It does not make anyone hungrier or more willing to go to a store, does not change what a store may be eaten
// from (a stranger's store is still theft, still weighed against conscience), does not lift anyone's carry limit and does not
// touch the case where the pack has room, which is unchanged: that meal still goes through the pack, byte for byte.
//
// The lab switch is module-level like the others (never saved, never hashed, on unless the lab turns it off): with it off a
// version-9 world is a version-9 world in every other respect and a full pack fails exactly as it did, which is what
// `rich-no-table-eating` is for.
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** the rules version at which a meal at a store no longer needs room in the pack; nothing here applies below it */
export const TABLE_EATING_FROM_VERSION = 11;

let tableEating = true;
export function setTableEating(on: boolean): void {
  tableEating = on;
}
export const tableEatingOn = (): boolean => tableEating;

/** Does this world let a person eat at a store they cannot carry food away from? Rich, at least version 9, and not switched off by the lab. */
export const eatsAtTheStore = (world: World): boolean => tableEating && isRich(world) && runsRulesVersion(world, TABLE_EATING_FROM_VERSION);
