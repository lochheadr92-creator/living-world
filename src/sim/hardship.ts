// Lean seasons: the first stake. Without them a village lives in plenty (in twelve days a hundred people had three critically hungry
// moments between them), so nothing can cascade from want. Only in worlds with rich dynamics.
//
// Once a day (a deterministic roll from the seed and the day, using no random numbers from the world's stream) a lean season may begin (one chance in five):
// for three to six days wild food comes back at 10% of its pace and crops grow at a quarter of theirs. It is announced, it weighs on everyone's mood, and
// it ends. How hard it bites depends on the stores and the farmland the village happens to have: some worlds ride it out, some do not.
import { addEvent } from './events';
import { DAY } from './constants';
import { hashString, hashUnit } from './rng';
import { isRich, think } from './mood';
import type { World } from './types';

/** chance, per day, that a lean season begins (when none is under way and the world is at least two days old) */
export const LEAN_CHANCE = 0.2;
export const LEAN_REGROW = 0.1;
export const LEAN_GROWTH = 0.25;

export function updateHardship(world: World): void {
  if (!isRich(world)) return;
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

/** how fast wild food comes back right now (1 when it is not a lean season) */
export const regrowRate = (world: World): number => (world.hardship ? LEAN_REGROW : 1);
/** how fast crops grow right now */
export const growthRate = (world: World): number => (world.hardship ? LEAN_GROWTH : 1);
