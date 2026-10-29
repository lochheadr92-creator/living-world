// AN AGREED PLACE TO LEAVE IT (rules version 48, rich worlds only).
//
// A promise to bring something to a person used to have one way of being kept: find them and hand it over. People move; a
// helper who arrives where the asker was last seen finds nobody, forgets the stale whereabouts and tries their home next, and
// if the asker is out gathering the promise lapses with the goods still in the helper's pack. What was missing was the thing
// two people would actually say: "I will leave it at your door." This module owns that agreement and nothing else:
//
//   * at the moment a promise to a PERSON is made, if the helper knows the asker's household home (their own belief about a
//     building of that household), the home is recorded on the commitment as the agreed place (`destKind: 'building'`), and the
//     words say so. The asker's own home is a place both of them can name; no tracking, no remote access, no promise that the
//     asker will wait anywhere.
//   * keeping the promise is then either the ordinary hand-over when the asker is in reach, or an ordinary deposit at that home,
//     whichever the helper's own choice reaches first. A deposit under a promise credits the commitment and the request with
//     exactly what moved, once, like a hand-over does; the household eats from its own store as it always has.
//   * a kept promise raises trust as before, and from this version a hungry person's choice of whom to ask leans a little on
//     that trust (options_social.ts optRequest), so a neighbour who came through is asked first next time. That is the loop:
//     help, remembered outcome, a later changed choice, another physical outcome.
//
// Nothing here changes who may promise, what they may promise, the reserves and caps, expiry, interruption, refusal or death.
import type { Belief, Person, World } from './types';
import { isHomeType } from './constants';
import { isRich } from './mood';
import { beliefsByKind } from './optutil';
import { runsRulesVersion } from './rulesversion';

let enabled = true;
export const deliveryPlaceOn = (): boolean => enabled;
/** Lab switch `rich-no-delivery-place`: promises name no place and the ask ignores trust; no effect below rules 48. */
export function setDeliveryPlace(on: boolean): void {
  enabled = on;
}
export const hasDeliveryPlace = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, 48);

/** Pure. The asker's household home as the helper remembers it, or null: the place a promise to them can name. */
export function agreedPlace(world: World, helper: Person, asker: Person): Belief | null {
  if (!hasDeliveryPlace(world) || helper.hhId === asker.hhId && false) return null;
  for (const b of beliefsByKind(helper, ['building'])) if (b.hh === asker.hhId && isHomeType(b.btype)) return b;
  return null;
}

/** How much a kept or broken promise weighs in choosing whom to ask for food or water: at most this much, from trust alone. */
export const TRUST_IN_ASK = 4;
export function askTrustBonus(world: World, trust: number): number {
  if (!hasDeliveryPlace(world)) return 0;
  return Math.max(-TRUST_IN_ASK, Math.min(TRUST_IN_ASK, (trust - 10) * 0.08));
}
