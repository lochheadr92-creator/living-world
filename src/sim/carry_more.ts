// Rules 204: a basket is worth getting. Three separately switched parts, after the rules-162 pattern.
//
// The owner's instruction in chat, 11 November 2026, after the childhood probe (docs/CHILDHOOD_AND_PLAY_PLAN.md, section 6) showed that
// under-twelves take a quarter of a settlement's food: grown people should want to carry more, and that wish should be made more
// attractive in itself, "rather than having it gated by depending on a number of something".
//
// What stood in the way, from evidence already recorded (the mechanism census of rules 196, twelve seeds, 25 days,
// review_evidence/balance-20261111/census): about 7 baskets are made a settlement in 25 days among about 21 grown people, and no
// handcart in any of the twelve. A basket adds 6 to a pack of 12 and makes picking 15 percent quicker, for 3 wood (6 of that 12 in
// weight) and 70 ticks of work. The single largest block on the way to one is the pack itself: "Get wood to make a basket: no room in
// my pack for one wood" was sampled 144 times a settlement, against 131 samples in which the wood trip was on offer at all. The thing a
// basket relieves is the thing that stops it being made.
//
// want   wantedTool (options_work.ts) offered a basket only to a person who had already gathered more than six units, at a weight of
//        1 + their foraging skill. At 204 every grown person without a basket wants one from the start, at that weight or
//        BASKET_WANT_FLOOR, whichever is more, so a poor forager's rod or axe does not come first. A spear with wolves about (2.2) and
//        a saw or hammer a plan of theirs needs still come first, as before. And a tool whose makings the person already holds
//        comes before a basket whose wood they do not: wanting a basket does not mean leaving a pick's wood and stone unused.
// room   When the wood a basket still needs does not fit in the pack, bringing food home (optDepositFood) is worth
//        BASKET_ROOM_WEIGHT more, with the reason on the card, and one spare portion is enough to make the walk (two before). Nothing
//        is dropped and nothing new is carried: it is the ordinary deposit at the person's own home, made sooner.
// worth  The wood trip for a basket and the making of it with the wood in hand each score BASKET_WORTH more than for another tool.
//        The person's own hunger and thirst still come first (the material trip is not offered to someone whose hunger or thirst
//        drive is pressing, as before).
//
// A handcart is not part of this version: it is built at a timber yard with a hammer, the first yard is one household's own again
// from rules 203, and what would make carts common is an access rule for the yard, which is its own design (docs/LIFE_STREAM.md, open
// item 3). Children are not offered tool work at any version.
//
// Rules 203 and earlier, authored worlds and a part switched off keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

const on = { want: true, room: true, worth: true };
export type CarryMorePart = keyof typeof on;
export const CARRY_MORE_PARTS = Object.keys(on) as CarryMorePart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const carryMorePartOn = (part: CarryMorePart): boolean => on[part];
export function setCarryMore(enabled: boolean, part?: CarryMorePart): void {
  if (part) on[part] = enabled;
  else for (const k of CARRY_MORE_PARTS) on[k] = enabled;
}
const rich204 = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 204);
export const hasBasketWant = (w: World): boolean => on.want && rich204(w);
export const hasBasketRoom = (w: World): boolean => on.room && rich204(w);
export const hasBasketWorth = (w: World): boolean => on.worth && rich204(w);

/** The least a basket weighs among the tools a person without one might want (a rod is 1.8 times fishing skill, an axe 1.4 times wood skill). */
export const BASKET_WANT_FLOOR = 2.1;
/** How much a person without a basket wants one among the hand tools: 0 is not at all. Before 204 only after gathering more than six units. */
export function basketWant(w: World, gathered: number, forage: number): number {
  if (hasBasketWant(w)) return Math.max(BASKET_WANT_FLOOR, 1 + forage);
  return gathered > 6 ? 1 + forage : 0;
}

/** What the wood trip for a basket, and the making of one, score above the same for another tool. */
export const BASKET_WORTH = 8;
export const basketWorth = (w: World, tool: string): number => (hasBasketWorth(w) && tool === 'basket' ? BASKET_WORTH : 0);

/** What bringing food home gains when the pack is what keeps the basket's wood from being fetched. */
export const BASKET_ROOM_WEIGHT = 10;
/** Is the pack what stands between this person and the wood their basket still needs? `roomForWood` is how many more wood fit. */
export function basketRoomShort(w: World, wantsBasket: boolean, woodMissing: number, roomForWood: number): boolean {
  return hasBasketRoom(w) && wantsBasket && woodMissing > 0 && roomForWood < woodMissing;
}
