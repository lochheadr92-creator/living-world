// Rules 205: a pack that is put down. Two separately switched parts, after the rules-162 pattern.
//
// The owner's instruction in chat, 11 November 2026: when people fill their packs with building materials they should go and drop
// them off at the proper place, and they should carry only the food and water they require, "just enough so if they go critical they
// can make it back to home and eat from their home storage".
//
// What was measured first. The mechanism census of rules 196 (twelve seeds, 25 days, review_evidence/balance-20261111/census): a
// pickup of stone was refused for want of room 4,637 times a settlement and of wood 4,080 times; "Bring food home" was on offer 4,733
// times and chosen 455; 933 meals were eaten out of the pack and 149 from the home store. The pack probe of rules 204 (four seeds, 12
// days, scripts/pack_probe.ts, review_evidence/carrying-20261111): at a refused pickup the pack is 93 to 95 percent full, of wood (45
// to 49 percent of the weight, about three pieces), food (28 to 31 percent, 3.4 to 3.7 portions), tools and a little stone; in 35 to
// 40 percent of those moments no trip that would empty it is on offer at all; the household has a home in 93 percent of them, about
// ten tiles away. Water is not carried (0.02 of a unit on average: people drink at the well or the water), so this version has no
// water rule: there is nothing to put down.
//
// ration     A person whose household has a home store they know keeps RATION_KEEP portion of food on them and counts the rest as
//            more than they need to carry (before: two portions, three when hungry, and nothing to spare below two more). Bringing
//            food home gains RATION_WEIGHT for that reason and up to PACK_FULL_WEIGHT as the pack fills past half. Food a promise or
//            a plan of theirs has spoken for is not counted. And the ration itself is kept for the road: while they know of food in
//            their home store, are not yet urgently hungry (hunger above RATION_HUNGER) and home is within RATION_REACH ticks, the
//            last portion in the pack is not offered as a meal, so the meal is the one at home. Further out, hungrier, or with
//            nothing known at home, they eat what they carry as before. A meal taken from a store (the ordinary eat_store, which
//            moves the meal's portions through the pack) eats what it took and leaves the ration.
// materials  The proper place for wood and stone a site needs is the site: a delivery (the ordinary haul) gains up to
//            PACK_FULL_WEIGHT as the pack fills past half, so a part load is taken over sooner. Wood and stone that nothing of
//            theirs needs (no site they would deliver to, no tool, repair, fire, plan or promise) is put down in their own home
//            store when the pack is three quarters full or more (pack_materials.ts); the communal store of rules 136 is unchanged.
//
// Rules 204 and earlier, authored worlds and a part switched off keep the old behaviour.
//
// RULES 206: THE RATION IS TWO PORTIONS. The rules-205 lab (docs/CARRYING.md: twelve seeds, 25 days) found the ration part doing what
// was asked (meals from a store 145 to 369 a settlement) at a cost: people hungry for 60 percent of their waking time instead of 54,
// and child play, family time and foraging practice down, all beyond chance, with 594 trips home a settlement, nearly one a person a
// day. The owner's answer in chat the same day: "maybe one extra piece of food for a carry limit". From 206 a person with a home
// store keeps RATION_KEEP_206 portions and takes home what is beyond them; the portion held for the road is still the last one, so
// the other may be eaten wherever they are; a meal at a store leaves up to two. `setRationTwo(false)` is rules 205.
// A second idea is measured in the lab only and is off in every world: `setFillingTrips(true)` (lab arm `rich-filling-trips`) makes
// the trip home with food beyond the ration only from a filling pack (FILLING_SPARE spare portions or more, or a pack three quarters
// full) and not for every spare portion. It is never saved or hashed and changes nothing unless the lab turns it on.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

const on = { ration: true, materials: true };
export type LightPackPart = keyof typeof on;
export const LIGHT_PACK_PARTS = Object.keys(on) as LightPackPart[];
/** Lab switches (never saved or hashed): one part, or with no part both. */
export const lightPackPartOn = (part: LightPackPart): boolean => on[part];
export function setLightPack(enabled: boolean, part?: LightPackPart): void {
  if (part) on[part] = enabled;
  else for (const k of LIGHT_PACK_PARTS) on[k] = enabled;
}
const rich205 = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 205);
export const hasRation = (w: World): boolean => on.ration && rich205(w);
export const hasPackMaterials = (w: World): boolean => on.materials && rich205(w);
let rationTwo = true;
export const rationTwoOn = (): boolean => rationTwo;
/** Lab switch (never saved or hashed): off, a rules-206 world keeps one portion as at 205. */
export function setRationTwo(enabled: boolean): void { rationTwo = enabled; }
export const hasRationTwo = (w: World): boolean => rationTwo && hasRation(w) && runsRulesVersion(w, 206);
let fillingTrips = false;
export const fillingTripsOn = (): boolean => fillingTrips;
/** Lab-only experiment, off in every world: the trip home with food beyond the ration is made only from a filling pack. */
export function setFillingTrips(enabled: boolean): void { fillingTrips = enabled; }

/** Portions of food a person with a home store keeps on them at rules 205, and the portion held for the road at every version. */
export const RATION_KEEP = 1;
/** Portions kept from rules 206. */
export const RATION_KEEP_206 = 2;
/** Spare portions from which the lab-only filling-trips experiment lets the trip home be made. */
export const FILLING_SPARE = 3;
/** The portions this world's ration is: two from 206, one at 205. Only meaningful where the ration applies. */
export const rationPortions = (w: World): number => (hasRationTwo(w) ? RATION_KEEP_206 : RATION_KEEP);
/** The lab-only experiment: is a ration trip with this much spare, from a pack this full, not yet worth making? */
export function tripWaitsForFillingPack(w: World, spare: number, used: number, cap: number): boolean {
  return fillingTrips && hasRation(w) && spare < FILLING_SPARE && used < cap * PACK_FULL_FRACTION;
}
/** What bringing food home gains because it is more than they need to carry. */
export const RATION_WEIGHT = 8;
/** The most a filling pack adds to a trip that would empty it: nothing at half full, all of it when full. */
export const PACK_FULL_WEIGHT = 10;
/** Hunger at or below which the ration may be eaten wherever the person is. */
export const RATION_HUNGER = 30;
/** Ticks of walking to home beyond which the ration is eaten on the road (a tenth of a day; hunger falls about six points in it). */
export const RATION_REACH = 240;
/** The fill of a pack from which wood and stone nothing needs is taken home. */
export const PACK_FULL_FRACTION = 0.75;
/** What putting such wood and stone down at home is worth before the walk. */
export const MATERIALS_HOME_BASE = 18;

/** What the fullness of a pack adds to a trip that would empty it. */
export function packFullWorth(used: number, cap: number): number {
  if (cap <= 0 || used <= cap * 0.5) return 0;
  return Math.round(Math.min(1, (used / cap - 0.5) * 2) * PACK_FULL_WEIGHT * 10) / 10;
}

/** Portions kept on the person: the ration at 205 for someone with a home store they know, else what the caller kept before. */
export function rationKeep(w: World, knowsHomeStore: boolean, before: number): number {
  return hasRation(w) && knowsHomeStore ? rationPortions(w) : before;
}

/** Portions a meal eaten at a store leaves in the pack: what the person carried before it, up to the ration; none before 205. */
export function mealLeaves(w: World, carriedBefore: number): number {
  return hasRation(w) ? Math.min(Math.max(0, carriedBefore), rationPortions(w)) : 0;
}

/** Is the food in the pack only the ration, and is it held for the road rather than offered as a meal now? */
export function rationHeld(w: World, carried: number, hunger: number, foodKnownAtHome: boolean, etaHome: number): boolean {
  return hasRation(w) && carried > 0 && carried <= RATION_KEEP && foodKnownAtHome && hunger > RATION_HUNGER && etaHome <= RATION_REACH;
}
