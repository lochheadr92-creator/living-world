// Mood: how a person is doing, summed from what has happened to them, and what that does to what they choose.
//
// Only in worlds with `settings.dynamics === 'rich'`; every function here is a no-op in any other world, which therefore behaves, is saved
// and is hashed exactly as before.
//
// A person has THOUGHTS: things weighing on them or lifting them for a while (was bitten, argued with someone, went hungry, was given
// something, lost someone). Each has a signed value that fades linearly to nothing over its duration. The same kind of thought is refreshed,
// not stacked; different kinds add up. Mood is a base from how well their needs are met plus the fresh thoughts, from -100 to 100.
//
// What mood does (the couplings, deliberately few and legible):
//  * what they pick: a low mood pulls people away from each other and from effortful work, toward rest and idling; a high mood the reverse
//    (moodWeight, applied when options are ranked, decision.ts)
//  * whether they quarrel: a low mood makes a contested resource more likely to turn into a row, a high one less (quarrelFactor)
// Survival options (eating, drinking, sleeping, fleeing, keeping warm) are never weighted by mood.
import { CRITICAL, DAY } from './constants';
import { addEvent } from './events';
import { moodOf } from './needs';
import { hashUnit } from './rng';
import { startArgument } from './social';
import { hyp } from './util';
import type { ActivityKind, Person, Thought, World } from './types';

export const isRich = (world: World): boolean => world.settings.dynamics === 'rich';

/** An experiment switch (kept beside the world, not in it: not saved, not hashed): with it off, moods are kept but change nothing (the lab uses it to tell mood from stakes). */
let effects = true;
export function setMoodEffects(on: boolean): void {
  effects = on;
}

const MAX_THOUGHTS = 14;
/** below this level a person reaches the end of their patience (once in BREAK_COOLDOWN) */
export const BREAK_LEVEL = -35;
export const BREAK_LENGTH = Math.round(DAY * 0.4);
export const BREAK_COOLDOWN = DAY * 2;

/**
 * How much a given person takes a given thing to heart: what frightens (a bite, a fright) counts for more with a cautious person, what
 * happens between people (a row, a death, a gift, a meal, a birth) with a sociable one. 0.6 to 1.4 times the thought's size, so two people
 * to whom the same thing happens do not end the day in the same mood.
 */
export function sensitivity(p: Person, kind: string): number {
  const base = kind.split(':')[0];
  if (base === 'bitten' || base === 'afraid') return 0.6 + 0.8 * p.traits.caution;
  if (base === 'argued' || base === 'lost' || base === 'gift' || base === 'shared_meal' || base === 'birth') return 0.6 + 0.8 * p.traits.sociability;
  return 1;
}
/** ticks between recomputations of a person's mood and the checks of their present condition */
export const MOOD_EVERY = 30;

function level(world: World, p: Person): number {
  const m = p.mood;
  let sum = (moodOf(p) - 70) * 0.5;
  if (m) {
    for (const t of m.thoughts) {
      const span = Math.max(1, t.until - t.since);
      const left = (t.until - world.tick) / span;
      if (left > 0) sum += t.value * Math.min(1, left);
    }
  }
  return Math.max(-100, Math.min(100, Math.round(sum * 10) / 10));
}

/** Give a person a thought. Same `kind` replaces the earlier one (it is renewed, not doubled). */
export function think(world: World, p: Person, kind: string, value: number, ticks: number, why: string): void {
  if (!isRich(world) || !p.alive) return;
  const m = (p.mood ??= { level: 0, thoughts: [] });
  const t: Thought = { kind, value: Math.round(value * sensitivity(p, kind) * 10) / 10, since: world.tick, until: world.tick + ticks, why };
  const i = m.thoughts.findIndex((x) => x.kind === kind);
  if (i >= 0) m.thoughts[i] = t;
  else {
    m.thoughts.push(t);
    if (m.thoughts.length > MAX_THOUGHTS) m.thoughts.shift();
  }
  m.level = level(world, p);
}

/** Called for each person every tick in a rich world; does its work every MOOD_EVERY ticks. */
export function updateMood(world: World, p: Person): void {
  if (!isRich(world) || (world.tick + p.id) % MOOD_EVERY !== 0) return;
  const m = (p.mood ??= { level: 0, thoughts: [] });
  m.thoughts = m.thoughts.filter((t) => t.until > world.tick);
  const n = p.needs;
  // present conditions keep renewing their thought for as long as they last, and fade after
  if (n.hunger < CRITICAL.hunger) think(world, p, 'hungry', -20, DAY, 'has gone hungry');
  if (n.thirst < CRITICAL.thirst) think(world, p, 'thirsty', -24, DAY, 'has gone thirsty');
  if (n.warmth < 20) think(world, p, 'cold', -10, DAY / 2, 'is cold');
  if (n.safety < 35) think(world, p, 'afraid', -12, DAY / 2, 'is frightened');
  if (p.health < 60) think(world, p, 'hurt', -12, DAY, 'is hurt');
  m.level = level(world, p);
  if (m.breakUntil !== undefined && world.tick >= m.breakUntil) {
    delete m.breakUntil;
    if (effects) think(world, p, 'catharsis', 18, DAY, 'got it out of their system');
  } else if (m.breakUntil === undefined && m.level < BREAK_LEVEL && (p.cooldowns.break ?? 0) <= world.tick) startBreak(world, p);
}

/** A person at the bottom reaches the end of their patience: for a while they withdraw from people and work, and may snap at whoever is near. */
function startBreak(world: World, p: Person): void {
  const m = p.mood!;
  m.breakUntil = world.tick + BREAK_LENGTH;
  p.cooldowns.break = world.tick + BREAK_COOLDOWN;
  // with the mood effects switched off (an experiment) the moment is recorded so it can be counted, and nothing else happens: no thought, no
  // re-think, no snap, no event
  if (!effects) return;
  p.nextThink = world.tick;
  think(world, p, 'break', -10, BREAK_LENGTH, 'is at the end of their patience');
  let near: Person | null = null;
  let nd = 6;
  for (const q of world.persons) {
    if (q === p || !q.alive || q.convId) continue;
    const d = hyp(q.x - p.x, q.y - p.y);
    if (d < nd) {
      nd = d;
      near = q;
    }
  }
  if (near && !p.convId && hashUnit(p.id, world.tick >> 5, 0xb7ea) < 0.6) startArgument(world, p, near, 'a bad mood', 'harm');
  else addEvent(world, 'social', `${p.name} is at the end of their patience and has withdrawn.`, [p.id], p.x, p.y);
}

const SOCIAL: ReadonlySet<ActivityKind> = new Set(['socialize', 'converse', 'visit', 'host_meal', 'attend_meal', 'give', 'care']);
const EFFORT: ReadonlySet<ActivityKind> = new Set(['build', 'haul', 'repair', 'craft', 'till', 'plant', 'tend', 'harvest', 'gather', 'operate', 'tool_work', 'cart_haul', 'plan_site', 'explore']);
const IDLE: ReadonlySet<ActivityKind> = new Set(['rest', 'wander']);

/** A factor on an option's utility: below 1 for the things a low mood puts off, above 1 for what it favours. 1 for everything else. */
export function moodWeight(world: World, p: Person, kind: ActivityKind): number {
  const m = p.mood;
  if (!m || !effects) return 1;
  const x = m.level / 100;
  const breaking = isBreaking(world, p);
  if (SOCIAL.has(kind)) return breaking ? 0.25 : 1 + 0.6 * x;
  if (EFFORT.has(kind)) return breaking ? 0.25 : 1 + 0.3 * x;
  if (IDLE.has(kind)) return breaking ? 2 : 1 - 0.5 * x;
  return 1;
}

/** at the end of their patience right now? */
export const isBreaking = (world: World, p: Person): boolean => p.mood?.breakUntil !== undefined && world.tick < p.mood.breakUntil;

/** How much likelier (above 1) or less likely (below 1) this person is to let a contested resource become a row. */
export function quarrelFactor(world: World, p: Person): number {
  if (!isRich(world) || !p.mood || !effects) return 1;
  return (1 - 0.7 * (p.mood.level / 100)) * (isBreaking(world, p) ? 2.5 : 1);
}

/** What is weighing on, or lifting, a person, most important first (for the inspector). */
export function thoughtsOf(world: World, p: Person): { why: string; value: number }[] {
  return (p.mood?.thoughts ?? [])
    .filter((t) => t.until > world.tick)
    .map((t) => ({ why: t.why, value: Math.round(t.value * Math.min(1, (t.until - world.tick) / Math.max(1, t.until - t.since)) * 10) / 10 }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

/** A death weighs on those close to the one who died: partner, child and parent most, then siblings, the household, then friends. */
export function mourn(world: World, dead: Person): void {
  if (!isRich(world)) return;
  for (const q of world.persons) {
    if (!q.alive || q === dead) continue;
    const r = q.relations[dead.id];
    const kin = r?.kin ?? '';
    let v = 0;
    if (kin === 'partner' || kin === 'child') v = -50;
    else if (kin === 'parent') v = -35;
    else if (kin === 'sibling') v = -25;
    else if (q.hhId === dead.hhId) v = -15;
    else if (r && r.affinity > 50) v = -8;
    if (v) think(world, q, 'lost:' + dead.id, v, Math.round(DAY * (v <= -35 ? 5 : 3)), `${dead.name} has died`);
  }
}
