// Stakes: want and danger that reach people. Only in worlds with rich dynamics; every function here returns the neutral value (1 or 0)
// in any other, so those worlds are unchanged to the last digit.
//
// * LEAN SEASONS, the first stake. Without them a village lives in plenty (in twelve days a hundred people had three critically hungry
// moments between them), so nothing can cascade from want. Only in worlds with rich dynamics.
//
// Once a day (a deterministic roll from the seed and the day, using no random numbers from the world's stream) a lean season may begin (one chance in five):
// for three to six days wild food comes back at 10% of its pace and crops grow at a quarter of theirs. It is announced, it weighs on everyone's mood, and
// it ends. How hard it bites depends on the stores and the farmland the village happens to have: some worlds ride it out, some do not.
import { addEvent } from './events';
import { DAY, DAYS_PER_YEAR } from './constants';
import { hashString, hashUnit } from './rng';
import { isRich, think } from './mood';

/** An experiment switch (beside the world, not in it): with it off, a rich world has no lean seasons, winter, faster spoilage or bolder wolves (the lab uses it to tell stakes from mood). */
let stakes = true;
export function setStakes(on: boolean): void {
  stakes = on;
}
const active = (world: World): boolean => stakes && isRich(world);
import type { World } from './types';

/** chance, per day, that a lean season begins (when none is under way and the world is at least two days old) */
export const LEAN_CHANCE = 0.2;
export const LEAN_REGROW = 0.1;
export const LEAN_GROWTH = 0.25;

export function updateHardship(world: World): void {
  if (!active(world)) return;
  if (world.tick % DAY === 5) {
    const into = Math.floor(world.tick / DAY) % DAYS_PER_YEAR;
    if (into === DAYS_PER_YEAR - WINTER_LENGTH) {
      addEvent(world, 'nature', 'Winter sets in: the cold deepens and the land gives less.');
      for (const p of world.persons) if (p.alive) think(world, p, 'winter', -4, WINTER_LENGTH * DAY, 'it is winter');
    } else if (into === 0 && world.tick >= DAY) addEvent(world, 'nature', 'Winter loosens its grip.');
  }
  const h = world.hardship;
  if (h) {
    if (world.tick >= h.until) {
      delete world.hardship;
      addEvent(world, 'nature', 'The lean season is over: the land is giving again.');
      for (const p of world.persons) if (p.alive) think(world, p, 'relief', 6, DAY, 'the lean season is over');
    }
    return;
  }
  if (world.tick % DAY !== 5 || world.tick < 2 * DAY) return;
  const day = Math.floor(world.tick / DAY);
  const key = hashString(world.seed);
  if (hashUnit(key, day, 0x1ea7) >= LEAN_CHANCE) return;
  const length = Math.round((3 + 3 * hashUnit(key, day, 0x1ea8)) * DAY);
  world.hardship = { kind: 'lean', since: world.tick, until: world.tick + length };
  addEvent(world, 'nature', 'A lean season begins: wild food and crops come slowly.');
  for (const p of world.persons) if (p.alive) think(world, p, 'lean', -6, length, 'the lean season');
}

// * WINTER. A year is DAYS_PER_YEAR days; its last WINTER_LENGTH days are winter, the same every year (nothing random, and the first
//   winter is hard because the village is not ready for it, not because it is harsher). The cold deepens and eases along a sine: up to
//   WINTER_COLD degrees below the ordinary day, wild food comes back more slowly and crops grow more slowly.
// * SPOILAGE. Stored food goes off three times as fast, food left out twice as fast, so a full store is not a permanent comfort.
// * WOLVES. They are bolder: they notice people from farther, are likelier to go for them, prowl toward the houses at night much more
//   often and come closer to them, and a fire keeps them off from a shorter distance.
export const WINTER_LENGTH = 4;
export const WINTER_COLD = 12;
export const WINTER_FOOD = 0.6;
export const WINTER_CROPS = 0.7;
export const SPOIL_STORE = 3;
export const SPOIL_PILE = 2;

/** 0 outside winter, rising to 1 at midwinter and back to 0 (always 0 in a world without rich dynamics) */
export function winterDepth(world: World): number {
  if (!active(world)) return 0;
  const day = (world.tick / DAY) % DAYS_PER_YEAR;
  const into = day - (DAYS_PER_YEAR - WINTER_LENGTH);
  return into <= 0 ? 0 : Math.sin((Math.PI * into) / WINTER_LENGTH);
}
/** degrees colder than the ordinary day */
export const coldSnap = (world: World): number => WINTER_COLD * winterDepth(world);

/** how fast wild food comes back right now (1 in an ordinary world and outside lean seasons and winter) */
export const regrowRate = (world: World): number => (active(world) ? (world.hardship ? LEAN_REGROW : 1) * (1 - WINTER_FOOD * winterDepth(world)) : 1);
/** how fast crops grow right now */
export const growthRate = (world: World): number => (active(world) ? (world.hardship ? LEAN_GROWTH : 1) * (1 - WINTER_CROPS * winterDepth(world)) : 1);

/** how many times faster than ordinary stored food and food left out go off */
export const spoilStore = (world: World): number => (active(world) ? SPOIL_STORE : 1);
export const spoilPile = (world: World): number => (active(world) ? SPOIL_PILE : 1);

/** how far a wolf notices people, and how likely it is to go for them, by day and by night; and how it prowls and how far fire reaches */
export function wolfNerve(world: World): { rangeDay: number; rangeNight: number; chanceDay: number; chanceNight: number; prowl: number; prowlCloser: number; fire: number } {
  return active(world)
    ? { rangeDay: 12, rangeNight: 22, chanceDay: 0.06, chanceNight: 0.3, prowl: 0.8, prowlCloser: 11, fire: 4 }
    : { rangeDay: 9, rangeNight: 17, chanceDay: 0.03, chanceNight: 0.22, prowl: 0.5, prowlCloser: 17, fire: 6 };
}
