import { DAY, DAYS_PER_YEAR } from './constants';
import { hashString, hashUnit } from './rng';
import type { Person, World } from './types';
import { clamp } from './util';

/**
 * How a life goes. Three separate things, all derived from a person's age and an inborn frailty (no stored state, no random stream):
 *
 *  - **mortality**: the chance of dying in a year, for each age. Two parts: a baseline (sudden death, failing health: high in the first
 *    year, very low through childhood and the prime, then rising steeply with age), and illness, which is a visible spell people can
 *    recover from (illness.ts), with a case fatality that depends on age, frailty, severity and whether they were cared for. Both are
 *    scaled by frailty. Fitted together so that, of people who reach fifteen, about 98% see forty, 92% sixty, 79% seventy, 54% eighty and
 *    18% ninety. (Hunger, thirst, cold and wolves are separate and unchanged.)
 *  - **vigour**: strength and stamina. Full through the prime, declining from about forty-five (earlier for the frail).
 *  - **fertility**: highest in the twenties, gone by the mid-forties.
 */

/** Ticks in a year of life in this world (the life pace setting; 12 days by default). */
export function yearTicks(world: { settings: { daysPerYear?: number } }): number {
  return DAY * (world.settings.daysPerYear ?? DAYS_PER_YEAR);
}

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

export const INFANT_HAZARD = 0.02; // per year, first year, apart from illness
const BASE_ADULT = 0.0001;
const OLD_SCALE = 1.1254e-7; // e^-16
const OLD_GROWTH = 0.16; // the senescent hazard doubles about every four years

/**
 * Chance per year of dying suddenly or of failing health, at this age, apart from illness (illness is a visible episode: see
 * illness.ts, and `illnessDeathsPerYear` below for what it adds). `health` is 0..100.
 */
export function mortalityPerYear(age: number, frailty: number, health = 100): number {
  let h: number;
  if (age < 1) h = INFANT_HAZARD;
  else if (age < 5) h = 0.005 - 0.003 * ((age - 1) / 4); // 0.5% a year at one, 0.2% by five
  else if (age < 15) h = 0.0007;
  else h = BASE_ADULT + OLD_SCALE * Math.exp(OLD_GROWTH * age);
  const unwell = 1 + Math.max(0, 60 - health) / 30; // someone hurt or worn out is likelier to die
  return h * frailty * unwell;
}

/** How often a serious spell of illness starts, per year, at this age. */
export function illnessRatePerYear(age: number, frailty: number): number {
  const base = age < 1 ? 0.3 : age < 12 ? 0.18 : age < 45 ? 0.1 : age < 62 ? 0.14 : 0.22;
  return base * frailty;
}

/**
 * The chance that a spell of illness kills, when it comes to a head. Worse for the very young and the old, the frail, the severe
 * and the starving; better for someone who was brought food and water while they were ill (care halves it at three kindnesses).
 */
export function caseFatality(age: number, frailty: number, severity: number, care: number, starving: boolean): number {
  const base = age < 1 ? 0.05 : age < 12 ? 0.008 : age < 45 ? 0.008 : age < 62 ? 0.02 : age < 75 ? 0.06 : 0.12;
  let c = base * frailty * (0.4 + 1.2 * severity);
  c *= 1 - 0.5 * Math.min(1, care / 3);
  if (starving) c *= 1.4;
  return clamp(c, 0, 0.6);
}

/** About how many deaths a year illness adds at this age, for a typical case (average severity, a little care), for checking the curve. */
export function illnessDeathsPerYear(age: number, frailty: number): number {
  return illnessRatePerYear(age, frailty) * caseFatality(age, frailty, 0.52, 0.8, false);
}

/** Chance of surviving from age `a0` to `a1` at the given frailty and good health, illness included, for checking the curve. */
export function survival(a0: number, a1: number, frailty = 1): number {
  let H = 0;
  for (let a = a0; a < a1; a += 0.1) H += (mortalityPerYear(a, frailty) + illnessDeathsPerYear(a, frailty)) * 0.1;
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
