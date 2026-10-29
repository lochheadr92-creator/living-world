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

// ───────────────────────── the winter reserve (rules version 46) ─────────────────────────
//
// What the ordinary rules-45 worlds showed (winter_reserve_evidence/ordinary-30-*): about half of everything put into a home
// store spoiled before anyone ate it (berries were ~60 % of the loss), the season plan's one-day cushion was reached in about
// half the plans, and the granaries that got built held nothing because nobody could eat from one. So the bounded change is
// not a bigger pile of the same food: it is (1) a season target of two days' eating rather than one, still bounded by the
// store's room, with a day more notice; (2) a season plan that puts by what KEEPS - grain, when the person knows a wild grain
// source - before any other kind; (3) the granary connected to eating, within the household's own share or the emergency
// ration facilities.ts already allows. The hardship cue, its target and everything below 46 are unchanged.
export const WINTER_RESERVE_FROM_VERSION = 46;
/** the season target: this many days' eating for the household, never more than SEASON_CAP or the store's room */
export const SEASON_RESERVE_DAYS = 2;
export const SEASON_CAP = 20;
/** the pre-winter window at 46 and later: one day more notice for the larger target */
export const PREPARE_DAYS_WINTER_RESERVE = 3;
let winterReserve = true;
/** Lab switch `rich-no-winter-reserve`: season target, window, durable preference and granary eating back to rules 45; no effect below 46. */
export function setWinterReserve(on: boolean): void {
  winterReserve = on;
}
export const winterReserveOn = (): boolean => winterReserve;
export const hasWinterReserve = (world: World): boolean => winterReserve && preparesFood(world) && runsRulesVersion(world, WINTER_RESERVE_FROM_VERSION);
/** Is this person carrying out a season-cue reserve plan right now? Then what they gather to put by should be what keeps. */
export function durableReserve(world: World, p: Person): boolean {
  return hasWinterReserve(world) && p.intentions.some((i) => i.status === 'active' && i.kind === 'stock' && i.cue === 'season');
}

/**
 * A granary this person knows and may use (communal, their own household's, or one they helped raise), as a belief. The bins
 * keep grain at a fifth of the ordinary spoilage when tended (constants.ts GRANARY_SPOIL), which is what makes them worth a
 * walk with a winter reserve. Null below 46.
 */
export function knownGranary(world: World, p: Person): Belief | null {
  if (!hasWinterReserve(world)) return null;
  let best: Belief | null = null;
  let bestD = Infinity;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype !== 'granary') continue;
    const real = world.byId.get(b.id);
    const mine = b.hh === 0 || b.hh === p.hhId || (real && real.ent === 'building' && (real.ops?.builders[p.hhId] ?? 0) >= 0.2);
    if (!mine) continue;
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/**
 * What the household holds in the granary's bins, by its own books: `ops.shares` is the record of what each household put in
 * and has not taken out (facilities.ts), so reading one's own entry is reading one's own ledger, not the bins of others.
 * Zero below 46, with no granary known, or with no share.
 */
export function granaryShare(world: World, p: Person): number {
  const g = knownGranary(world, p);
  const real = g ? world.byId.get(g.id) : undefined;
  if (!real || real.ent !== 'building' || !real.ops) return 0;
  const sh = real.ops.shares[p.hhId];
  if (!sh) return 0;
  let n = 0;
  for (const k of FOODS) n += sh[k] ?? 0;
  return n;
}

/** The reserve as the person counts it: the home store as they remember it, plus (rules 46) their household's granary share. */
export function reserveHeld(world: World, p: Person, home: Belief): number {
  return foodInBelief(home) + granaryShare(world, p);
}

/** the household can see it is short: its visible food is under this fraction of a day's eating for its members */
export const LOW_FOOD_DAYS = 0.5;

/** a shortfall smaller than this is not worth a plan of its own; the ordinary stockpile option already covers it */
export const MIN_SHORTFALL = 2;

/**
 * Carrying at least this much food that can actually be put down, the thing to do is take it home: the deposit option needs a
 * surplus of 2 over the 2 or 3 a person keeps back for themselves (options_work.ts optDepositFood).
 */
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

/** Everything people eat. What a store HOLDS is counted with this: meat and bread in a home store are food like any other. */
const FOODS: readonly FoodKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat'];
/** Is this something people eat? Used by the deposit that credits a reserve, and by every count of what a store holds. */
export const isFoodKind = (k: ItemKind): boolean => (FOODS as readonly ItemKind[]).includes(k);

/**
 * The food a trip home would actually put down. It is NOT the same list: `optDepositFood` offers to store grain, fish, fruit
 * and berries and nothing else, and `foodCount` (optutil.ts) counts the same four. Deciding to walk home on the strength of
 * five units of meat would settle on a step the engine never offers, so the step threshold reads this list and the question
 * "has this household anything to hand" reads the full one.
 */
const STORABLE: readonly FoodKind[] = ['grain', 'fish', 'fruit', 'berries'];

/** units of food in a remembered container, from the person's own belief and nothing else */
export function foodInBelief(b: Belief): number {
  let n = 0;
  for (const k of FOODS) n += b.items?.[k] ?? 0;
  return n;
}

/** units of food this person is carrying, of any kind: what the household has to hand */
export function foodCarried(p: Person): number {
  let n = 0;
  for (const k of FOODS) n += p.inv[k] ?? 0;
  return n;
}

/** of that, the units a trip home could actually put into the store */
export function foodToStore(p: Person): number {
  let n = 0;
  for (const k of STORABLE) n += p.inv[k] ?? 0;
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
  return left > 0 && left <= (hasWinterReserve(world) ? PREPARE_DAYS_WINTER_RESERVE : PREPARE_DAYS) * DAY;
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
  // rules 46: the household's granary share is part of what it has put by; below 46 the home store alone, as before
  const inStore = hasWinterReserve(world) ? reserveHeld(world, p, home) : foodInBelief(home);
  const target = Math.min(DAY_FOOD * RESERVE_DAYS * members, RESERVE_CAP, inStore + roomInBelief(home));
  const short = target - inStore;
  // rules 46: the season asks for more than the one-day cushion, still bounded by the room the store has - unless a granary is
  // known, whose bins have room enough; below 46 (and with the switch off) the season target is the cushion, exactly as before
  const seasonTarget = hasWinterReserve(world) ? Math.min(DAY_FOOD * SEASON_RESERVE_DAYS * members, SEASON_CAP, knownGranary(world, p) ? Infinity : inStore + roomInBelief(home)) : target;
  const seasonShort = seasonTarget - inStore;
  if (short < MIN_SHORTFALL && seasonShort < MIN_SHORTFALL) return null;

  // hardship first: a household that can see it is short is reacting to that, whatever the date is
  const carried = foodCarried(p);
  const low = inStore + carried < DAY_FOOD * members * LOW_FOOD_DAYS;
  const hungry = wentHungryRecently(world, p);
  if ((low || hungry) && short >= MIN_SHORTFALL) {
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
  if (seasonShort < MIN_SHORTFALL || !inPreWinter(world) || left < DAY * 0.3) return null;
  return {
    target: seasonTarget,
    short: seasonShort,
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
