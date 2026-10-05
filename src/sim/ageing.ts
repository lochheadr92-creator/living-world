import { hashString, hashUnit } from './rng';
import type { Person, World } from './types';
import { clamp } from './util';

/**
 * How a life goes. Three separate things, all derived from a person's age and an inborn frailty (no stored state, no random stream):
 *
 *  - **mortality**: the chance of dying of ordinary causes in a year, for each age. High in the first year, low through childhood and
 *    the prime of life, then rising steeply (a Gompertz curve, doubling about every seven years), scaled by frailty and by poor health.
 *    Fitted so that, of people who reach fifteen, about 94% see forty, three in four sixty, half seventy, a quarter eighty and one in
 *    thirty ninety, with most deaths falling on the very young and the old. (Hunger, thirst, cold and wolves are separate and unchanged.)
 *  - **vigour**: strength and stamina. Full through the prime, declining from about forty-five (earlier for the frail).
 *  - **fertility**: highest in the twenties, gone by the mid-forties.
 */

export const INFANT_HAZARD = 0.07; // per year, first year
const BASE_ADULT = 0.0015;
const OLD_SCALE = 0.0000454; // e^-10
const OLD_GROWTH = 0.1; // the hazard doubles about every seven years

/** Inborn robustness, 0.6 (hardy) to 1.9 (frail), fixed by the seed and the person, centred just above 1. */
const frailtyCache = new WeakMap<Person, number>();
export function frailtyOf(world: World, p: Person): number {
  const hit = frailtyCache.get(p);
  if (hit !== undefined) return hit;
  const seed = hashString(world.seed) & 0xffff;
  const z = (hashUnit(p.id, seed, 77) + hashUnit(p.id, seed, 78) + hashUnit(p.id, seed, 79) - 1.5) * 2;
  const f = clamp(Math.exp(0.35 * z), 0.6, 1.9);
  frailtyCache.set(p, f);
  return f;
}

const seedKeys = new Map<string, number>();
/**
 * A deterministic draw in [0, 1) for this person at this moment, specific to this world. The world's seed has to be part of it:
 * people have the same ids in every world, so a draw that ignored the seed would give the same person the same fate at the same
 * moment in every world.
 */
export function lifeDraw(world: World, p: Person, step: number, salt: number): number {
  let k = seedKeys.get(world.seed);
  if (k === undefined) {
    k = hashString(world.seed) | 0;
    seedKeys.set(world.seed, k);
  }
  return hashUnit(p.id, step, k ^ (salt * 0x9e3779b1));
}

/** Chance per year of dying of ordinary causes, at this age. `health` is 0..100. */
export function mortalityPerYear(age: number, frailty: number, health = 100): number {
  let h: number;
  if (age < 1) h = INFANT_HAZARD;
  else if (age < 5) h = 0.02 - 0.014 * ((age - 1) / 4); // 2% a year at one, 0.6% by five
  else if (age < 15) h = 0.002;
  else h = BASE_ADULT + OLD_SCALE * Math.exp(OLD_GROWTH * age);
  const unwell = 1 + Math.max(0, 60 - health) / 30; // someone hurt or worn out is likelier to die
  return h * frailty * unwell;
}

/** Chance of surviving from age `a0` to `a1` at the given frailty and good health, for checking the curve. */
export function survival(a0: number, a1: number, frailty = 1): number {
  let H = 0;
  for (let a = a0; a < a1; a += 0.1) H += mortalityPerYear(a, frailty) * 0.1;
  return Math.exp(-H);
}

/** Physical vigour, 0.45 (frail old age) to 1 (prime). Children are handled by their own stage, so this is 1 below sixteen. */
export function vigourAt(age: number, frailty: number): number {
  if (age < 16) return 1;
  const onset = 46 - clamp((frailty - 1) * 8, -6, 8);
  const d = Math.max(0, age - onset);
  return clamp(1 - 0.008 * d - 0.00018 * d * d, 0.45, 1);
}

export function vigourOf(world: World, p: Person, age: number): number {
  return age < 16 ? 1 : vigourAt(age, frailtyOf(world, p));
}

/** Fertility, 0..1: full to thirty, falling to nothing at forty-five. */
export function fertilityAt(age: number): number {
  if (age < 17 || age >= 45) return 0;
  if (age <= 30) return 1;
  return clamp(1 - (age - 30) / 15, 0, 1);
}

/** Chance that a birth kills the mother: about one in a hundred in the twenties, more after thirty-five and for the frail. */
export function childbirthRisk(age: number, frailty: number): number {
  return 0.01 * frailty * (1 + Math.max(0, age - 30) / 8);
}

/** How much longer hard physical work takes than it would at the prime (1 for children and for anyone in their prime). */
export function workDrag(world: World, p: Person, age: number): number {
  const v = vigourOf(world, p, age);
  return v >= 1 ? 1 : 1 / (0.65 + 0.35 * v);
}
