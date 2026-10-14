// A life of one's own (rich worlds only): what a person hopes for, what hurts them, and how age tells.
//
// * LIFE GOALS. On coming of age (or, for the founders, at the start) each adult takes up one hope from their nature: a home of
//   their own, a family, a trade, a full store, or a good name. It is not a plan (intent.ts) and not a need: it is a bounded nudge
//   toward the options that serve it, a small weight on the mood while it is far off, and a lift for days when it is reached;
//   it is read from the world (a home's condition, a partner and child, a trade, the store, what others think) and never from
//   the person's own account of it.
// * INJURY. Felling a tree, breaking stone or building may hurt someone (a hashed chance, never the world's random stream): a
//   sprain, a cut or a broken bone, which slows walking and work for days and keeps them from heavy work at its worst. It heals
//   with time, faster for the young.
// * AGEING. An elder carries less, mends slower and is hurt more easily; the ordinary slower walk is as it always was.
//
// An authored world never creates `p.goal` or `p.injury`, so its saves and fingerprints are untouched.
import { homeOf, householdOf } from './buildings';
import { DAY, isSolidHome } from './constants';
import { foodUnits } from './economy';
import { addEvent, addLog } from './events';
import { isRich, think } from './mood';
import type { Option } from './optutil';
import { stageOf } from './people';
import { hashString, hashUnit } from './rng';
import type { Goal, GoalKind, Injury, InjuryKind, Person, SkillKey, World } from './types';

const key = (world: World): number => hashString(world.seed) ^ 0x11fe;

// ───────────────────────── injury ─────────────────────────
const INJURY_NAME: Record<InjuryKind, string> = { sprain: 'a sprained ankle', cut: 'a bad cut', broken: 'a broken arm' };
const HEAL: Record<InjuryKind, number> = { sprain: 2 * DAY, cut: 3 * DAY, broken: 6 * DAY };

export const isHurt = (p: Person): boolean => !!p.injury;

/** how much an injury slows walking (0.6 at its worst, back to 1 as it heals); 1 when whole */
export function injuryFactor(world: World, p: Person): number {
  const i = p.injury;
  if (!i) return 1;
  const left = Math.max(0, (i.until - world.tick) / (i.until - i.since));
  return 1 - 0.4 * left;
}

/** Someone is hurt doing `how`. Rich only, never twice at once. */
export function injure(world: World, p: Person, kind: InjuryKind, how: string): boolean {
  if (!isRich(world) || !p.alive || p.injury) return false;
  const elder = stageOf(world, p) === 'elder';
  const heal = Math.round(HEAL[kind] * (elder ? 1.5 : stageOf(world, p) === 'youth' ? 0.8 : 1));
  p.injury = { kind, since: world.tick, until: world.tick + heal, how };
  p.health = Math.max(1, p.health - (kind === 'broken' ? 18 : kind === 'cut' ? 10 : 6));
  p.nextThink = world.tick;
  addEvent(world, 'danger', `${p.name} got ${INJURY_NAME[kind]} ${how}.`, [p.id], p.x, p.y);
  addLog(world, p, 'danger', `Got ${INJURY_NAME[kind]} ${how}.`);
  think(world, p, 'injured', kind === 'broken' ? -16 : -8, heal, `has ${INJURY_NAME[kind]}`);
  return true;
}

/** a hashed chance of harm at a risky piece of work, higher for the worn out and for elders (rich only) */
export function riskOfHarm(world: World, p: Person, task: 'tree' | 'rock' | 'build', base: number): void {
  if (!isRich(world) || p.injury) return;
  let risk = base;
  if (p.needs.energy < 20) risk *= 2;
  if (stageOf(world, p) === 'elder') risk *= 2;
  if (p.illness) risk *= 1.5;
  if (hashUnit(key(world), p.id, world.tick) >= risk) return;
  const r = hashUnit(key(world), p.id * 3 + 1, world.tick);
  const kind: InjuryKind = task === 'build' ? (r < 0.15 ? 'broken' : r < 0.5 ? 'sprain' : 'cut') : task === 'tree' ? (r < 0.6 ? 'cut' : r < 0.9 ? 'sprain' : 'broken') : r < 0.5 ? 'cut' : r < 0.85 ? 'sprain' : 'broken';
  injure(world, p, kind, task === 'build' ? 'at the building site' : task === 'tree' ? 'felling a tree' : 'breaking stone');
}

function healTick(world: World, p: Person): void {
  const i = p.injury;
  if (!i || world.tick < i.until) return;
  delete p.injury;
  addEvent(world, 'life', `${p.name} has healed from ${INJURY_NAME[i.kind]}.`, [p.id], p.x, p.y);
  addLog(world, p, 'need', `Healed from ${INJURY_NAME[i.kind]}.`);
}

// ───────────────────────── ageing ─────────────────────────
/** an elder's share of a grown person's carrying, mending and the like (rich only; 1 otherwise) */
export function elderFactor(world: World, p: Person): number {
  return isRich(world) && stageOf(world, p) === 'elder' ? 0.75 : 1;
}

// ───────────────────────── life goals ─────────────────────────
export const GOAL_NUDGE = 4;
export const GOAL_TEXT: Record<GoalKind, string> = {
  home: 'a solid home of their own',
  family: 'a family',
  trade: 'a trade of their own',
  stocked: 'a store that would see them through a lean season',
  respected: 'a good name among their neighbours',
};

function pickGoal(world: World, p: Person): GoalKind {
  const t = p.traits;
  const r = hashUnit(key(world), p.id, 0x60a1);
  // the nature leans, the draw decides
  const weights: [GoalKind, number][] = [
    ['home', 1 + t.caution],
    ['family', 1 + t.sociability * 1.2],
    ['trade', 0.6 + t.diligence * 1.4],
    ['stocked', 0.6 + t.caution + t.diligence * 0.5],
    ['respected', 0.5 + t.generosity * 1.4],
  ];
  const total = weights.reduce((s, w) => s + w[1], 0);
  let x = r * total;
  for (const [k, w] of weights) {
    x -= w;
    if (x <= 0) return k;
  }
  return 'home';
}

/** how far along the goal is, 0..1, read from the world */
export function goalProgress(world: World, p: Person, g: Goal): number {
  switch (g.kind) {
    case 'home': {
      const home = homeOf(world, householdOf(world, p));
      if (!home) return 0;
      return isSolidHome(home.type) ? Math.min(1, home.condition / 60) : 0.25;
    }
    case 'family':
      return (p.partnerId ? 0.5 : 0) + (p.children.length ? 0.5 : 0);
    case 'trade':
      return p.trade ? (p.trade.master ? 0.6 : 1) : Math.max(0, Math.min(0.5, (Math.max(...Object.values(p.skills)) - 1) * 2));
    case 'stocked': {
      const home = homeOf(world, householdOf(world, p));
      const members = Math.max(1, householdOf(world, p)?.members.length ?? 1);
      return home ? Math.min(1, foodUnits(home.store.items) / (12 * members)) : 0;
    }
    case 'respected': {
      let n = 0;
      for (const q of world.persons) if (q.alive && q !== p && (q.relations[p.id]?.affinity ?? 0) >= 40) n++;
      return Math.min(1, n / 5);
    }
  }
}

/** the goal's pull on an option: GOAL_NUDGE for one that serves it (0 in an authored world) */
export function goalNudge(world: World, p: Person, o: Option): number {
  const g = p.goal;
  if (!g || g.done || !isRich(world)) return 0;
  switch (g.kind) {
    case 'home':
      return o.kind === 'build' || o.kind === 'repair' || o.kind === 'haul' || o.kind === 'plan_site' ? GOAL_NUDGE : 0;
    case 'family':
      return o.kind === 'socialize' && (o.tag === 'household' || o.tag === 'social') ? GOAL_NUDGE : 0;
    case 'trade':
      return o.kind === 'operate' || o.kind === 'craft' || o.kind === 'tool_work' ? GOAL_NUDGE : 0;
    case 'stocked':
      return (o.kind === 'gather' && o.need === 'hunger') || o.kind === 'deposit' || o.kind === 'harvest' ? GOAL_NUDGE : 0;
    case 'respected':
      return o.kind === 'give' || o.kind === 'care' || o.kind === 'fulfill' || (o.kind === 'socialize' && o.tag === 'help') ? GOAL_NUDGE : 0;
  }
}

/** Twice a day per person: take up a hope on coming of age, feel how far it is, and mark it reached. Also heals injuries. */
export function lifeTickRich(world: World, p: Person): void {
  if (!isRich(world)) return;
  healTick(world, p);
  if ((world.tick + p.id * 53) % (DAY / 2) !== 0) return;
  const stage = stageOf(world, p);
  if (stage === 'child' || stage === 'youth') return;
  let g = p.goal;
  if (!g) {
    g = p.goal = { kind: pickGoal(world, p), since: world.tick, progress: 0, done: 0 };
    addLog(world, p, 'life', `What I hope for: ${GOAL_TEXT[g.kind]}.`);
  }
  if (g.done) return;
  g.progress = Math.round(goalProgress(world, p, g) * 100) / 100;
  if (g.progress >= 1) {
    g.done = world.tick;
    addEvent(world, 'life', `${p.name} has what they hoped for: ${GOAL_TEXT[g.kind]}.`, [p.id], p.x, p.y);
    addLog(world, p, 'life', `I have what I hoped for: ${GOAL_TEXT[g.kind]}.`);
    think(world, p, 'goal', 12, 3 * DAY, `has ${GOAL_TEXT[g.kind]}`);
    return;
  }
  // a hope long unmet weighs a little; one coming closer does not
  if (world.tick - g.since > 10 * DAY && g.progress < 0.5) think(world, p, 'goal', -3, DAY, `still hopes for ${GOAL_TEXT[g.kind]}`);
}

/** for the inspector */
export function describeGoal(world: World, p: Person): string | null {
  const g = p.goal;
  if (!g) return null;
  if (g.done) return `has what they hoped for, ${GOAL_TEXT[g.kind]}`;
  return `hopes for ${GOAL_TEXT[g.kind]} (${Math.round(g.progress * 100)}% there)`;
}
export function describeInjury(world: World, p: Person): string | null {
  const i = p.injury;
  if (!i) return null;
  const days = Math.ceil((i.until - world.tick) / DAY);
  return `${INJURY_NAME[i.kind]} (${i.how}), ${days} ${days === 1 ? 'day' : 'days'} to heal`;
}

export type { Goal, Injury, SkillKey };
