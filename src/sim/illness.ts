// Illness (rich worlds only): a fever that comes to the cold, the hungry and the worn out, passes between people who talk, eat
// together or sleep under one roof, and goes with rest. It is one more thing that lasts and cascades: a sick person works
// slowly and eats their stores, those who nurse them catch it, and a cautious neighbour keeps their distance. Nothing here is
// drawn from the world's random stream: every chance is a hash of the seed, the person and the tick, so a replay is exact.
//
// An authored world never creates `p.illness` or `p.immuneUntil`, so its saves and fingerprints are untouched.
import { DAY } from './constants';
import { addEvent, addLog } from './events';
import { winterDepth } from './hardship';
import { isRich, think } from './mood';
import { hashString, hashUnit } from './rng';
import type { Illness, Person, World } from './types';
import { hyp } from './util';

/** how often one person's illness is looked at, in ticks */
const ILL_EVERY = 60;
/** after a fever, no new one for this long */
export const IMMUNE_FOR = 20 * DAY;
/** rest credit needed to get over a fever: between these, by the person (two to three and a half days of plain rest) */
const COURSE_MIN = 2 * DAY;
const COURSE_MAX = 3.5 * DAY;
/** the chance, per check, that someone catches nothing from nobody: the fever that comes from cold and want */
const ONSET_BASE = 0.00003;

const key = (world: World): number => hashString(world.seed) ^ 0x1115;

export const isIll = (p: Person): boolean => !!p.illness;

/** How visibly ill: 0 (well) to 1 (at the worst of it). 0 in an authored world. */
export function illnessOf(p: Person): number {
  const i = p.illness;
  if (!i) return 0;
  return i.severity;
}

/** Someone falls ill. Rich only; never twice at once, never while immune. */
export function fallIll(world: World, p: Person, how: string): boolean {
  if (!isRich(world) || !p.alive || p.illness || (p.immuneUntil ?? 0) > world.tick) return false;
  const course = Math.round(COURSE_MIN + (COURSE_MAX - COURSE_MIN) * hashUnit(key(world), p.id, world.tick));
  p.illness = { since: world.tick, severity: 0.4, rested: 0, course, how };
  addEvent(world, 'life', `${p.name} has come down with a fever${how ? ` (${how})` : ''}.`, [p.id], p.x, p.y);
  addLog(world, p, 'need', `Came down with a fever${how ? `, ${how}` : ''}.`);
  think(world, p, 'ill', -15, DAY, 'has a fever');
  return true;
}

/** `from`, if ill enough to pass it on, may give it to `to` with this chance (rich only). Returns true if it passed. */
export function expose(world: World, from: Person, to: Person, chance: number): boolean {
  const i = from.illness;
  if (!i || i.severity < 0.3 || from === to || to.illness) return false;
  if (hashUnit(key(world), from.id * 7919 + to.id, world.tick) >= chance * i.severity) return false;
  return fallIll(world, to, `caught from ${from.name}`);
}

function recover(world: World, p: Person): void {
  delete p.illness;
  p.immuneUntil = world.tick + IMMUNE_FOR;
  if (p.deathCause === 'fever') p.deathCause = '';
  addEvent(world, 'life', `${p.name} is over the fever.`, [p.id], p.x, p.y);
  addLog(world, p, 'need', 'Over the fever at last.');
  think(world, p, 'recovered', 8, DAY, 'over the fever');
}

/**
 * Once a minute of simulated time per person: an onset chance that rises with cold, hunger and exhaustion (and in winter); for
 * the ill, the course of the fever (worse through the first day, then eased by rest, which counts double), its cost in health
 * and strength, its thought, and whether it passes to whoever sleeps beside them.
 */
export function illnessTick(world: World, p: Person): void {
  if (!isRich(world) || (world.tick + p.id) % ILL_EVERY !== 0) return;
  const i = p.illness;
  const n = p.needs;
  if (!i) {
    if ((p.immuneUntil ?? 0) > world.tick) return;
    let risk = ONSET_BASE;
    if (n.warmth < 30) risk *= 4;
    if (n.hunger < 30) risk *= 3;
    if (n.energy < 15) risk *= 2;
    risk *= 1 + 1.5 * winterDepth(world);
    if (hashUnit(key(world), p.id, world.tick) < risk) fallIll(world, p, n.warmth < 30 ? 'after the cold' : n.hunger < 30 ? 'after going hungry' : '');
    return;
  }
  const sleeping = p.pose === 'sleep';
  const resting = sleeping || (p.pose === 'sit' && (!p.activity || p.activity.kind === 'rest' || p.activity.kind === 'warm'));
  i.rested += ILL_EVERY * (resting ? 2 : 1) * (n.hunger > 40 && n.warmth > 40 ? 1 : 0.6);
  if (i.rested >= i.course) {
    recover(world, p);
    return;
  }
  const age = world.tick - i.since;
  i.severity = Math.round(Math.min(1, 0.4 + (0.6 * age) / DAY) * (1 - i.rested / i.course) * 100) / 100;
  // the cost: health goes, strength goes faster; rest halves it, and a fever on an empty stomach is the one that kills
  p.health = Math.max(0, p.health - i.severity * (resting ? 0.5 : 1.3) * (n.hunger < 25 ? 2 : 1));
  n.energy = Math.max(0, n.energy - 1.5 * i.severity);
  if (p.health < 20) p.deathCause = 'fever';
  think(world, p, 'ill', -15 * i.severity, DAY, 'has a fever');
  // those sleeping beside them
  if (sleeping && i.severity >= 0.3) {
    for (const q of world.persons) {
      if (q === p || !q.alive || q.pose !== 'sleep' || q.hhId !== p.hhId || q.illness) continue;
      if (hyp(q.x - p.x, q.y - p.y) > 3.5) continue;
      expose(world, p, q, 0.05);
    }
  }
}

/** for the inspector */
export function describeIllness(world: World, p: Person): string | null {
  const i = p.illness;
  if (!i) return null;
  const day = Math.floor((world.tick - i.since) / DAY) + 1;
  const word = i.severity >= 0.7 ? 'bad' : i.severity >= 0.4 ? 'feverish' : 'on the mend';
  return `a fever, day ${day}: ${word}${i.how ? ` (${i.how})` : ''}`;
}

export type { Illness };
