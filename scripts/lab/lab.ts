// The counterfactual lab: fork a saved world, change one thing, run it forward, and compare it with the untouched control.
//
// A world is deterministic and a save round trip is exact (tests/save.test.ts), so a fork is a true "same world, one difference" pair.
// But the world is also chaotic: any change, however small, moves every later random draw, so one pair proves nothing. Two things make
// the comparison usable:
//   * the NOISE FLOOR: a `nudge` branch changes nothing but one random draw. Whatever it does to the outcome is what chance alone does.
//   * the ENSEMBLE: the same pair is made for many seeds and compared as paired differences (scripts/lab/stats.ts).
// An effect is only worth reporting if it is systematic across seeds (its confidence interval excludes 0) and larger than the nudge's.
//
// Nothing here is read by the simulation: interventions act on a deserialised copy, or flip a switch that is off by default and is never
// saved or hashed (the option chooser, the wolf search memory).
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import { CRITICAL, DAY, NEED_KEYS } from '../../src/sim/constants';
import { setOptionChooser } from '../../src/sim/decision';
import { setStakes } from '../../src/sim/hardship';
import { setMoodEffects } from '../../src/sim/mood';
import { unregisterSource } from '../../src/sim/registry';
import type { SourceType, World } from '../../src/sim/types';
import { setWolfSearchMemory } from '../../src/sim/wildlife';
import { hashString } from '../../src/sim/rng';
import { hashWorld, stepWorld } from '../../src/sim/world';

/** What a branch is allowed to change. `apply` edits the forked copy; `install` flips a module-level switch and returns how to flip it back. */
export interface Intervention {
  spec: string;
  summary: string;
  apply?: (w: World) => string;
  install?: () => () => void;
}

const hubsOf = (w: World) => [w.camp, ...(w.extraSettlements ?? [])];
const nearHub = (w: World, x: number, y: number, r: number) => hubsOf(w).some((h) => Math.hypot(h.x - x, h.y - y) <= r);

function removeSources(w: World, types: SourceType[], r: number): number {
  let n = 0;
  for (const s of w.sources.slice()) {
    if (types.includes(s.type) && nearHub(w, s.x, s.y, r)) {
      unregisterSource(w, s);
      n++;
    }
  }
  return n;
}

const ALIASES: Record<string, string> = {
  'no-wood': 'remove:tree:22',
  'no-food': 'remove:berry_bush+fruit_tree+wild_grain+fish_spot:35',
  'no-clay': 'remove:clay_pit+ore_vein:1000000000',
};

export const DEFAULT_BRANCHES = ['nudge:1', 'nudge:2', 'no-wolf-memory', 'random-choice', 'no-wood', 'no-food', 'no-clay'];

/**
 * Specs: `control`; `nudge:N` (draw N random numbers and change nothing else: the noise floor); `remove:<type+type>:<radius>` (delete
 * those sources within the radius of any settlement); `random-choice` (rank options by a hash, not by utility); `no-wolf-memory`
 * (switch off an optimisation that is meant to be exact: a branch that is not identical to the control would be a bug).
 * `rich-stakes-only` and `rich-mood-only` split `rich` into its two halves (to tell which one does what). `rich` switches rich dynamics on (mood.ts, hardship.ts). `no-wood`, `no-food`, `no-clay` are aliases of `remove`.
 */
export function parseIntervention(specIn: string): Intervention {
  const spec = ALIASES[specIn] ?? specIn;
  const [kind, a, b] = spec.split(':');
  const label = specIn;
  if (kind === 'control') return { spec: label, summary: 'nothing changes' };
  if (kind === 'nudge') {
    const n = Number(a ?? 1);
    return {
      spec: label,
      summary: `${n} extra random draw${n === 1 ? '' : 's'} at the fork and nothing else (the noise floor)`,
      apply: (w) => {
        for (let i = 0; i < n; i++) w.rng.next();
        return `${n} draws`;
      },
    };
  }
  if (kind === 'remove') {
    const types = (a ?? '').split('+') as SourceType[];
    const r = Number(b ?? 22);
    const where = r >= 1e6 ? 'anywhere' : `within ${r} tiles of a settlement`;
    return {
      spec: label,
      summary: `every ${types.join(', ')} ${where} is removed`,
      apply: (w) => `${removeSources(w, types, r)} sources removed`,
    };
  }
  if (kind === 'rich') {
    return {
      spec: label,
      summary: 'rich dynamics switched on at the fork: people have a mood that changes what they do, and lean seasons happen',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on';
      },
    };
  }
  if (kind === 'rich-stakes-only') {
    return {
      spec: label,
      summary: 'rich dynamics with the stakes (lean seasons, winter, faster spoilage, bolder wolves) but moods change nothing',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'stakes on, mood effects off';
      },
      install: () => {
        setMoodEffects(false);
        return () => setMoodEffects(true);
      },
    };
  }
  if (kind === 'rich-mood-only') {
    return {
      spec: label,
      summary: 'rich dynamics with moods that change choices and quarrels but none of the stakes',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'mood effects on, stakes off';
      },
      install: () => {
        setStakes(false);
        return () => setStakes(true);
      },
    };
  }
  if (kind === 'random-choice') {
    return {
      spec: label,
      summary: 'people pick among the options they may take by a hash, not by utility',
      install: () => {
        setOptionChooser('random');
        return () => setOptionChooser('utility');
      },
    };
  }
  if (kind === 'no-wolf-memory') {
    return {
      spec: label,
      summary: 'wolves repeat searches that cannot give a new answer (an exact optimisation, so expected: identical to control)',
      install: () => {
        setWolfSearchMemory(false);
        return () => setWolfSearchMemory(true);
      },
    };
  }
  throw new Error(`unknown branch "${specIn}"`);
}

const WORKPLACES = ['storehouse', 'timber_yard', 'quarry', 'kiln', 'granary', 'hall', 'bakery', 'smithy'];
export const METRICS = [
  'workplaces',
  'solidHomes',
  'buildings',
  'plots',
  'people',
  'deaths',
  'homeless',
  'belowCritical',
  'meanHunger',
  'firstYardDay',
  'firstHallDay',
  'hallBuilt',
  'bakeryBuilt',
  'meanMood',
  'lowMood',
  'needDays',
  'lowMoodDays',
  'breaks',
] as const;
export type Metric = (typeof METRICS)[number];
export type Outcome = Record<Metric, number>;

/** What a branch ends with. `from` is the tick of the fork: deaths are those since then, first-build days are counted from the fork's day 0. */
export interface Watch {
  /** earliest build tick of each building type seen at any sample, so a building that was raised and later lost still counts */
  seen: Record<string, number>;
  /** person-days spent below a critical need, and below a mood of -25, summed over the samples */
  needDays: number;
  lowMoodDays: number;
  /** distinct times someone reached the end of their patience (a break is long enough to be caught by a sample) */
  breaks: Set<string>;
  /** how many had died when the branch began, so that `deaths` counts those since the fork */
  deadAtFork: number;
}

/** Look at a world between steps; everything here is read-only. */
export function watchWorld(w: World, watch: Watch, everyTicks: number): void {
  for (const b of w.buildings) watch.seen[b.type] = Math.min(watch.seen[b.type] ?? Infinity, b.builtTick);
  const days = everyTicks / DAY;
  for (const p of w.persons) {
    if (!p.alive) continue;
    if (NEED_KEYS.some((k) => p.needs[k] < CRITICAL[k] && CRITICAL[k] > 0)) watch.needDays += days;
    if ((p.mood?.level ?? 0) < -25) watch.lowMoodDays += days;
    if (p.mood?.breakUntil !== undefined && w.tick < p.mood.breakUntil) watch.breaks.add(`${p.id}:${p.mood.breakUntil}`);
  }
}

/**
 * What a branch ends with. Most counts are of the world at the end (so they leave out anyone who died and anything lost); the `*Days` and
 * `breaks` counts and the building milestones are accumulated across the run by `watchWorld`.
 */
export function outcomeOf(w: World, from: number, endTick: number, watch?: Watch): { outcome: Outcome; milestones: Record<string, number> } {
  const count = (types: string[]) => w.buildings.filter((b) => types.includes(b.type)).length;
  const alive = w.persons.filter((p) => p.alive);
  const homeIds = new Set(w.buildings.map((b) => b.id));
  const hh = new Map(w.households.map((h) => [h.id, h]));
  let homeless = 0;
  let hunger = 0;
  let crit = 0;
  let mood = 0;
  let low = 0;
  for (const p of alive) {
    mood += p.mood?.level ?? 0;
    if ((p.mood?.level ?? 0) < -25) low++;
    const h = hh.get(p.hhId);
    if (!h || !h.homeId || !homeIds.has(h.homeId)) homeless++;
    hunger += p.needs.hunger;
    if (NEED_KEYS.some((k) => p.needs[k] < CRITICAL[k] && CRITICAL[k] > 0)) crit++;
  }
  const first: Record<string, number> = {};
  for (const b of w.buildings) first[b.type] = Math.min(first[b.type] ?? Infinity, b.builtTick);
  if (watch) for (const t of Object.keys(watch.seen)) first[t] = Math.min(first[t] ?? Infinity, watch.seen[t]);
  // days after the fork; 0 if the type already stood at the fork (then it says nothing about the branch); a type never built counts as
  // the end of the run (censored), so that it can be averaged
  const endDay = (endTick - from) / DAY;
  const day = (t: string) => (first[t] === undefined ? endDay : first[t] < from ? 0 : Math.round(((first[t] - from) / DAY) * 10) / 10);
  const milestones: Record<string, number> = {};
  for (const t of Object.keys(first)) if (first[t] >= from) milestones[t] = day(t);
  return {
    outcome: {
      workplaces: count(WORKPLACES),
      solidHomes: count(['hut', 'house']),
      buildings: w.buildings.length,
      plots: w.plots.length,
      people: alive.length,
      deaths: w.deceased.length - (watch?.deadAtFork ?? 0),
      homeless,
      belowCritical: crit,
      meanHunger: Math.round((hunger / Math.max(1, alive.length)) * 10) / 10,
      firstYardDay: day('timber_yard'),
      firstHallDay: day('hall'),
      hallBuilt: first.hall === undefined ? 0 : 1,
      bakeryBuilt: first.bakery === undefined ? 0 : 1,
      meanMood: Math.round((mood / Math.max(1, alive.length)) * 10) / 10,
      lowMood: low,
      needDays: Math.round((watch?.needDays ?? 0) * 10) / 10,
      lowMoodDays: Math.round((watch?.lowMoodDays ?? 0) * 10) / 10,
      breaks: watch?.breaks.size ?? 0,
    },
    milestones,
  };
}

export interface BranchResult {
  spec: string;
  summary: string;
  note: string;
  /** first sampled tick, counted from the fork, at which the world's hash differs from the control's; null if it never does */
  divergedAfterTicks: number | null;
  finalHash: string;
  /** a hash of the whole serialised world (the compact `finalHash` leaves out parts of it), so "identical" can be claimed of the state and not just of its fingerprint */
  stateHash: string;
  outcome: Outcome;
  milestones: Record<string, number>;
  /** people alive by day after the fork, one per day (to tell a story of when branches part) */
  popByDay: number[];
}

export interface ForkRun {
  saved: ReturnType<typeof serializeWorld>;
  fromTick: number;
}

/** Run one branch from a save. `controlHashes` (the sampled hashes of the control) lets later branches say when they first part from it. */
export function runBranch(
  saved: ReturnType<typeof serializeWorld>,
  iv: Intervention,
  days: number,
  sampleEvery: number,
  controlHashes?: string[],
): BranchResult & { hashes: string[] } {
  const restore = iv.install?.();
  try {
    const w = deserializeWorld(saved);
    const from = w.tick;
    const note = iv.apply?.(w) ?? '';
    const hashes: string[] = [];
    const popByDay: number[] = [];
    const watch: Watch = { seen: {}, needDays: 0, lowMoodDays: 0, breaks: new Set(), deadAtFork: w.deceased.length };
    let diverged: number | null = null;
    const end = from + days * DAY;
    for (let i = 1; w.tick < end; i++) {
      stepWorld(w);
      if (i % sampleEvery === 0) {
        const h = hashWorld(w);
        hashes.push(h);
        watchWorld(w, watch, sampleEvery);
        if (controlHashes && diverged === null && controlHashes[hashes.length - 1] !== h) diverged = w.tick - from;
      }
      if (i % DAY === 0) popByDay.push(w.persons.filter((p) => p.alive).length);
    }
    const { outcome, milestones } = outcomeOf(w, from, end, watch);
    return {
      spec: iv.spec,
      summary: iv.summary,
      note,
      divergedAfterTicks: diverged,
      finalHash: hashWorld(w),
      stateHash: hashString(serializeWorld(w)).toString(16),
      outcome,
      milestones,
      popByDay,
      hashes,
    };
  } finally {
    restore?.();
  }
}

/** Run the world to `forkDay`, then the control and every branch from the same save. */
export function runLab(
  world: World,
  forkDay: number,
  days: number,
  branches: string[],
  sampleEvery = 120,
  each?: (r: BranchResult & { hashes: string[] }) => void,
): (BranchResult & { hashes: string[] })[] {
  while (world.tick < forkDay * DAY) stepWorld(world);
  const saved = serializeWorld(world);
  const control = runBranch(saved, parseIntervention('control'), days, sampleEvery);
  const out: (BranchResult & { hashes: string[] })[] = [control];
  each?.(control);
  for (const spec of branches) {
    const r = runBranch(saved, parseIntervention(spec), days, sampleEvery, control.hashes);
    out.push(r);
    each?.(r);
  }
  return out;
}
