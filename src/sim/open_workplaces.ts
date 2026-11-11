// Rules 207: a workplace is open to everyone.
//
// The owner's instruction in chat, 11 November 2026: "We need to change the fact that only one household can use public buildings,
// that would be a major blocker. Many people should be able to build and use public buildings like workshop, timber yard, granary".
//
// What stood before. Raising a workplace was already everybody's business: siteRelation (options_work.ts) lets anyone bring materials
// to and work on a workshop, granary or hall site, because it "will serve everyone". Using the finished building was not: accessLevel
// (facilities.ts) admitted the household that laid it out, a household that did a fifth or more of the building work, somebody an
// owner counts a friend, and everyone only when no household had a clear majority of the effort. And nobody lays out a second one
// while they know of any, usable or not. So most people helped raise the yard and were then shut out of it. The mechanism census of
// rules 196 (review_evidence/balance-20261111/census, twelve seeds, 25 days) counted about 8,100 blocked decisions a settlement that
// "do not know of a timber yard they may use", with nets, traps, garments and blankets behind them, and no handcart was built in any
// settlement in any lab of 11 November. Rules 201 tried the other way round (the first yard as a shared civic project) and the yard
// came five days later, because a civic project waits for supporters; rules 203 retired it.
//
// At 207 every workplace (recipes.ts isFacilityType: timber yard, quarry, kiln, smithy, bakery, granary, food rack, mine, mill,
// brewery, hall) may be used by anyone. Somebody with no earned access comes in at the level the code already has for a guest
// ('friend'): what they bring is held for their own batch and what they make is theirs; the workplace's own stock stays with its
// household and its builders (houseStockOpen), each household's share in a granary stays its own, and the emergency ration at the
// bins is open to the starving as it was for anyone with access. Ownership, repair and who lays a workplace out are unchanged, and a
// workplace still runs one batch at a time.
//
// Rules 206 and earlier, authored worlds and the switch thrown keep the old behaviour.
import { isFacilityType } from './recipes';
import { runsRulesVersion } from './rulesversion';
import type { BuildingType, World } from './types';

let enabled = true;
export const openWorkplacesOn = (): boolean => enabled;
/** Lab switch (`rich-no-open-workplaces`, never saved or hashed): off, a workplace admits only those the earlier rules admitted. */
export function setOpenWorkplaces(on: boolean): void {
  enabled = on;
}
export const hasOpenWorkplaces = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 207);

/** Is a building of this type open to everybody in this world, whoever built it? Every workplace from 207; never a home or a store. */
export function openToAll(w: World, type: BuildingType | undefined): boolean {
  return hasOpenWorkplaces(w) && !!type && isFacilityType(type);
}
