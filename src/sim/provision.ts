// HOUSEHOLD FOOD PREPARATION (rules version 2, rich worlds only).
//
// One bounded behaviour: an adult may decide to put a modest food reserve into their own household's home store, and then do
// it with the actions that already exist - gather food, carry it home, put it down. Nothing new is built underneath. The
// decision is an ordinary private plan (intent.ts), the work is the ordinary stockpile forage and the ordinary deposit, and
// the reserve is ordinary food in the ordinary home store, which spoils and is eaten like any other.
//
// WHAT THIS MODULE DECIDES, AND WHAT IT REFUSES TO DECIDE
//
// Two quite different things can set a preparation going, and they are kept apart on purpose, because one of them would be
// cheating if it were the other.
//
//  * HARDSHIP - what this person can actually SEE of their own household: the home store, as they remember it, together with
//    what they are carrying, comes to less than half a day's eating for the household; or they themselves went hungry within
//    the last day (the `hungry` thought mood.ts writes when hunger passes the critical mark). Both are the person's own
//    record of something that has already happened to them. This is a RESPONSE, not a forecast.
//
//  * SEASON - winter. It is the one hardship in this world that is not a roll of the dice: the last WINTER_LENGTH days of
//    every DAYS_PER_YEAR-day year are winter, always, the same days each year, and the simulation announces it both when it
//    sets in and when it loosens (hardship.ts). An adult may be supposed to know that the way they know that night follows
//    day. The window is the PREPARE_DAYS days immediately before it.
//
// What nothing here may do is predict the LEAN SEASON. A lean season is a one-in-five roll per day against the seed
// (hardship.ts LEAN_CHANCE); it is not announced in advance and nobody could learn when it is coming. No function in this
// file reads `world.hardship`, `LEAN_CHANCE`, or any draw that decides them, and no cue is derived from them. A lean season
// still reaches people here - through the hardship cue, once their store has actually emptied or they have actually gone
// hungry - which is a response to what happened, and that is the only route this module allows.
//
// The two cues are recorded separately on the plan (`Intention.cue`), so a measurement can say which route a preparation came
// by rather than lumping the anticipation in with the reaction. They are tested in a fixed order: HARDSHIP FIRST. A household
// that can see it is short is reacting to that, whatever the date happens to be, so `season` means the narrower and more
// interesting thing - nothing visibly wrong, and winter near.
//
// WHAT IT IS NOT. It does not promise anything to anybody, build a role, move anybody between settlements, exchange anything,
// or plan more than one step ahead of the engine. It does not change winter, lean seasons, hunger, yields, spoilage or what
// anyone starts with. And it is not a claim that anyone will survive: the reserve is about one day's eating and winter is
// four days long. See docs/RICH_WORLD.md.
import { BUILD_DEF, DAY, DAYS_PER_YEAR, WEIGHT, isHomeType } from './constants';
import { WINTER_LENGTH } from './hardship';
import { isRich } from './mood';
import { beliefsByKind } from './optutil';
import type { Ctx } from './optutil';
import { runsRulesVersion } from './rulesversion';
import type { Belief, BuildingType, FoodKind, ItemKind, Person, World } from './types';

/** the rules version at which household food preparation starts; nothing here applies to a world below it */
export const PREPARATION_FROM_VERSION = 2;

/**
 * HOW MUCH A PERSON EATS IN A DAY, in units of food. Hunger falls by HUNGER_RATE (0.03) a tick and a day is DAY (2400)
 * ticks, so a person loses 72 hunger a day. The foods people actually eat are worth between 12 and 28 (NUTRITION: berries
 * 12, fruit 16, grain 22, fish 28), averaging about 18 across a typical mix, and 72 / 18 = 4. A measured Large run gave 3.8
 * units eaten per person per day, which is the same number. 4 is used because it is the honest round figure and erring high
 * by a fifth of a unit is the safe direction for a reserve.
 */
export const DAY_FOOD = 4;

/**
 * HOW BIG A RESERVE. One day's eating for each member of the household (RESERVE_DAYS x DAY_FOOD x members), never more than
 * RESERVE_CAP units in all, and never more than the home is believed to have room for.
 *
 * RESERVE_CAP is 12 for two reasons. It is three members' worth, so the target stops growing in a large household instead of
 * turning one person into a full-time provisioner. And a lean-to - the smallest home anyone has - holds 12 weight units
 * (BUILD_DEF.lean_to.cap) and food weighs 1 to 1.5 a unit, so even the poorest household can hold a reserve this size, while
 * a hut (cap 40) has room to spare.
 *
 * It is deliberately MODEST, and it is not provision for winter. Winter is WINTER_LENGTH (4) days, during which wild food
 * still comes back at 40% of its pace at the worst and crops at 30% (hardship.ts), so a household of three eating 12 units a
 * day would need something like 48 units to sit out the whole of it. This is a cushion of about one day, meant to take the
 * edge off the first bad morning - nothing in this module should be described as preventing starvation.
 */
export const RESERVE_DAYS = 1;
export const RESERVE_CAP = 12;

/** how many days before winter sets in the seasonal cue opens */
export const PREPARE_DAYS = 2;

/** the household can see it is short: its visible food is under this fraction of a day's eating for its members */
export const LOW_FOOD_DAYS = 0.5;

/** a shortfall smaller than this is not worth a plan of its own; the ordinary stockpile option already covers it */
export const MIN_SHORTFALL = 2;

/** carrying at least this much food, the thing to do is take it home: the deposit option needs a surplus of 2 over what a person keeps back */
export const CARRY_TO_STORE = 5;

/** which cue set a preparation going. See the header: these are kept apart on purpose. */
export type PrepCue = 'season' | 'hardship';

/**
 * The lab switch, beside the world like the mood, stakes, plans, ask, learning and trade switches: module-level, never saved,
 * never hashed, on unless the lab turns it off. With it off a version-2 world is a version-2 world in every other respect and
 * simply has no food preparation, which is what `rich-no-stock` is for.
 */
let preparation = true;
export function setFoodPreparation(on: boolean): void {
  preparation = on;
}
export const foodPreparationOn = (): boolean => preparation;

/** Does this world run household food preparation at all? Rich, at least version 2, and not switched off by the lab. */
export const preparesFood = (world: World): boolean => preparation && isRich(world) && runsRulesVersion(world, PREPARATION_FROM_VERSION);

const FOODS: readonly FoodKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat'];
/** Is this something people eat? One list, used by the deposit that credits a reserve and by every count of food here. */
export const isFoodKind = (k: ItemKind): boolean => (FOODS as readonly ItemKind[]).includes(k);

/** units of food in a remembered container, from the person's own belief and nothing else */
export function foodInBelief(b: Belief): number {
  let n = 0;
  for (const k of FOODS) n += b.items?.[k] ?? 0;
  return n;
}

/** units of food this person is carrying */
export function foodCarried(p: Person): number {
  let n = 0;
  for (const k of FOODS) n += p.inv[k] ?? 0;
  return n;
}

/**
 * The home store this household's reserve would go into, as this person remembers it: their own household's home, the solid
 * one if they know of more than one. Nothing is read from the world behind their back - a home they have never seen is not a
 * home they can plan to fill.
 */
export function homeStoreBelief(p: Person): Belief | null {
  let best: Belief | null = null;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.hh !== p.hhId || !isHomeType(b.btype)) continue;
    if (!best || (BUILD_DEF[(b.btype ?? 'lean_to') as BuildingType].cap > BUILD_DEF[(best.btype ?? 'lean_to') as BuildingType].cap)) best = b;
  }
  return best;
}

/** room left in a remembered store, in units of the lightest food, from the belief's own contents */
function roomInBelief(b: Belief): number {
  const cap = BUILD_DEF[(b.btype ?? 'lean_to') as BuildingType].cap;
  let used = 0;
  for (const k of Object.keys(b.items ?? {}) as ItemKind[]) used += (b.items?.[k] ?? 0) * WEIGHT[k];
  return Math.max(0, Math.floor(cap - used));
}

/** ticks until winter sets in: 0 while it is winter, otherwise the distance to the start of the next one */
export function ticksUntilWinter(world: World): number {
  const year = DAY * DAYS_PER_YEAR;
  const into = world.tick % year;
  const start = DAY * (DAYS_PER_YEAR - WINTER_LENGTH);
  if (into >= start) return 0;
  return start - into;
}

/** Is it the window in which winter is near enough to prepare for? */
export const inPreWinter = (world: World): boolean => {
  const left = ticksUntilWinter(world);
  return left > 0 && left <= PREPARE_DAYS * DAY;
};

/** Did this person go hungry within the last day, by their own record? mood.ts writes this thought when hunger passes critical. */
export function wentHungryRecently(world: World, p: Person): boolean {
  const t = p.mood?.thoughts.find((x) => x.kind === 'hungry');
  return !!t && world.tick - t.since <= DAY;
}

export interface PrepWant {
  /** units of food the home store should come to hold */
  target: number;
  /** how far short of that it is now, as this person believes */
  short: number;
  cue: PrepCue;
  /** why, in the person's own terms, for the record the plan keeps */
  why: string;
  /** the home the reserve goes into */
  aboutId: number;
  /** the tick by which it stops mattering */
  until: number;
}

/**
 * Would this person take on putting a food reserve by, and on what grounds? Returns null in any world that does not run
 * version 2, with the switch off, for a child, for somebody with no home of their own that they know of, when the store is
 * already near enough the target, and when neither cue is live.
 *
 * Everything it reads is this person's own: their household's membership, their belief about their own home, what they are
 * carrying, their own memory of having gone hungry, and the date. It draws no random numbers and writes nothing.
 */
export function preparationWanted(ctx: Ctx): PrepWant | null {
  const { world, p } = ctx;
  if (!preparesFood(world)) return null;
  if (ctx.stage === 'child') return null;
  const home = homeStoreBelief(p);
  if (!home) return null;

  const members = Math.max(1, ctx.members.length);
  const inStore = foodInBelief(home);
  const target = Math.min(DAY_FOOD * RESERVE_DAYS * members, RESERVE_CAP, inStore + roomInBelief(home));
  const short = target - inStore;
  if (short < MIN_SHORTFALL) return null;

  // hardship first: a household that can see it is short is reacting to that, whatever the date is
  const carried = foodCarried(p);
  const low = inStore + carried < DAY_FOOD * members * LOW_FOOD_DAYS;
  const hungry = wentHungryRecently(world, p);
  if (low || hungry) {
    const why = hungry
      ? low
        ? 'went hungry lately and there is next to nothing at home'
        : 'went hungry lately and would rather not again'
      : 'there is next to nothing at home to fall back on';
    // two days, the same span the older projects get (intent.ts adoptProject): filling a store is several trips, and a
    // deadline short enough that nobody could meet it would only manufacture failures
    return { target, short, cue: 'hardship', why, aboutId: home.id, until: world.tick + DAY * 2 };
  }

  // otherwise the season, and only when there is enough of the window left to do anything in
  const left = ticksUntilWinter(world);
  if (!inPreWinter(world) || left < DAY * 0.3) return null;
  return {
    target,
    short,
    cue: 'season',
    why: 'winter is close and the store is thin',
    aboutId: home.id,
    until: world.tick + left,
  };
}

// ───────────────────────── observation (never saved, never hashed) ─────────────────────────
//
// Counters in the conventions of probe.ts and transmission.ts: module-level, off by default, no part of `World`, a save or
// the state hash; no randomness, no clock, no log, no event, no belief and no decision. A run is identical with them on or
// off, and tests/household_preparation.test.ts holds that.

export interface PrepCounters {
  /** preparations taken on, by cue */
  adoptedSeason: number;
  adoptedHardship: number;
  /** preparations that reached their target by the person's own work */
  done: number;
  /** preparations that ended without reaching it, for any reason */
  dropped: number;
  /** units of food actually put into a home store for a live preparation */
  unitsStored: number;
}

const zeroPrep = (): PrepCounters => ({ adoptedSeason: 0, adoptedHardship: 0, done: 0, dropped: 0, unitsStored: 0 });

export const prepProbe: PrepCounters & { on: boolean } = { on: false, ...zeroPrep() };

export function prepReset(): void {
  Object.assign(prepProbe, zeroPrep());
}

export function prepSnapshot(): PrepCounters {
  const { on: _on, ...rest } = prepProbe;
  void _on;
  return { ...rest };
}

export function notePrepAdopted(cue: PrepCue): void {
  if (!prepProbe.on) return;
  if (cue === 'season') prepProbe.adoptedSeason++;
  else prepProbe.adoptedHardship++;
}

export function notePrepEnded(done: boolean): void {
  if (!prepProbe.on) return;
  if (done) prepProbe.done++;
  else prepProbe.dropped++;
}

export function notePrepStored(units: number): void {
  if (!prepProbe.on) return;
  prepProbe.unitsStored += units;
}
