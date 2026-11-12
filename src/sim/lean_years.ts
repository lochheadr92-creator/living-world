// Rules 220 (the seasons stream, `docs/LEAN_YEARS.md`): a lean season is an occasional bad year, not the ordinary state of the land.
//
// Before 220 a lean season could begin on any day with one chance in five (hardship.ts LEAN_CHANCE) and lasted three to six days,
// so the land was lean on four to six days in ten in every seed, and most winters had a lean season running through them. A
// 60-day run of twelve ordinary worlds (12 November 2026) showed what that does: a settlement that grew to 39 people starved in
// its fifth winter with wild food coming back at a twentieth of its pace, and the same world with lean and dry seasons cleared
// lost nobody in 72 days. The owner's instruction was to keep the lean season and make it rare, like an El Nino or La Nina year:
// one every two or three years, so that it can happen without being a regular occurrence.
//
// From 220 a world has LEAN YEARS. The first is the world's second or third year, and each one after comes two or three years
// later. In a lean year one lean season begins, on a day of the year before winter sets in, and runs its three to six days as it
// always did (so one that begins late in the year still runs into the winter). No dry spell begins in a lean year: the lean
// season is that year's hardship. In every other year no lean season begins; a dry spell may, as before.
//
// Which years are lean, and the day the season begins, come from the seed alone (the same hash the old daily roll used, with
// its own salts), never from the world's random stream, and nothing new is saved: a loaded world reaches the same calendar.
// What a lean season does once begun (regrowth at a tenth, crops at a quarter, the thought, the feed line) is unchanged.
//
// Rich worlds at rules 220 and later only; rules 219 and earlier, authored worlds and the switch thrown keep the daily roll.
import { hashUnit } from './rng';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

/** years from one lean year to the next: at least, and at most */
export const LEAN_GAP_MIN = 2;
export const LEAN_GAP_MAX = 3;
/** a lean year's season begins on one of the first this-many days of the year, the days before winter sets in
 * (DAYS_PER_YEAR - WINTER_LENGTH; tests/lean_years.test.ts holds the two together) */
export const LEAN_START_DAYS = 8;

const on = { rare: true };
export type LeanYearsPart = keyof typeof on;
export const LEAN_YEARS_PARTS = Object.keys(on) as LeanYearsPart[];
/** Lab switches (never saved or hashed). */
export const leanYearsPartOn = (part: LeanYearsPart): boolean => on[part];
export function setLeanYears(enabled: boolean, part?: LeanYearsPart): void {
  if (part) on[part] = enabled;
  else for (const k of LEAN_YEARS_PARTS) on[k] = enabled;
}

/** A diagnostic switch for the lab alone, not a rules version: with it off no lean season ever begins, at any rules version
 * (dry spells, winter, spoilage and wolves are untouched). It answers "what does the lean season cost at all". */
let seasons = true;
export const leanSeasonsOn = (): boolean => seasons;
export function setLeanSeasons(enabled: boolean): void {
  seasons = enabled;
}

/** years from the lean year `prev` to the next one (prev is -1 before the first) */
const gapAfter = (key: number, prev: number): number =>
  Math.min(LEAN_GAP_MAX, LEAN_GAP_MIN + Math.floor(hashUnit(key, prev + 1, 0x1ea9) * (LEAN_GAP_MAX - LEAN_GAP_MIN + 1)));

/** Whether `year` (0 is the world's first) is a lean year for the seed with this key. */
export function isLeanYear(key: number, year: number): boolean {
  let y = -1;
  while (y < year) y += gapAfter(key, y);
  return y === year;
}

/** The day of a lean year (0 is its first day) on which its lean season begins. */
export const leanStartDay = (key: number, year: number): number => Math.min(LEAN_START_DAYS - 1, Math.floor(hashUnit(key, year, 0x1eaa) * LEAN_START_DAYS));

/** Whether this world keeps lean years (rules 220) instead of the daily roll. */
export function leanYearsOn(world: World): boolean {
  return on.rare && world.settings.dynamics === 'rich' && runsRulesVersion(world, 220);
}
