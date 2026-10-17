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
import { setNightPlans, setProjectAsks } from '../../src/sim/intent';
import { setLearning } from '../../src/sim/learning';
import { setTrades } from '../../src/sim/trade';
import { SOURCE_SKILL } from '../../src/sim/constants';
import type { Activity, Person } from '../../src/sim/types';
import { setMoodEffects } from '../../src/sim/mood';
import { unregisterSource } from '../../src/sim/registry';
import type { SourceType, World } from '../../src/sim/types';
import { setWolfSearchMemory } from '../../src/sim/wildlife';
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
  // the switch removes every private plan, projects included, so the plainer name is the accurate one
  'rich-no-plans': 'rich-no-night',
  'no-wood': 'remove:tree:22',
  'no-food': 'remove:berry_bush+fruit_tree+wild_grain+fish_spot:35',
  'no-clay': 'remove:clay_pit+ore_vein:1000000000',
};

export const DEFAULT_BRANCHES = ['nudge:1', 'nudge:2', 'no-wolf-memory', 'random-choice', 'no-wood', 'no-food', 'no-clay'];

/**
 * Specs: `control`; `nudge:N` (draw N random numbers and change nothing else: the noise floor); `remove:<type+type>:<radius>` (delete
 * those sources within the radius of any settlement); `random-choice` (rank options by a hash, not by utility); `no-wolf-memory`
 * (switch off an optimisation that is meant to be exact: a branch that is not identical to the control would be a bug).
 * `rich-no-night` (alias `rich-no-plans`) is rich with private plans removed altogether - night preparation AND the projects
 * built on the same mechanism (making a tool, mending a roof) - to isolate what planning as such contributes. `rich-no-ask` keeps
 * every plan and removes only Stage D1's ask for a project's missing material, to isolate what the cooperation contributes on top
 * of planning. `rich-no-learning` keeps everything else about a rich world and removes only Stage 3's estimates of what pays, to
 * isolate what learning from one's own outcomes contributes. `rich-no-trades` keeps everything else about a rich world and removes
 * trades and their apprenticeship mechanism together (trade.ts, apprentice.ts); it does not isolate trades alone. `rich-stakes-only` and `rich-mood-only` separate the original stakes/mood mechanisms, not all later systems. `rich` switches current dynamics on at the fork of a legacy run. `no-wood`, `no-food`, `no-clay` are aliases of `remove`.
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
  if (kind === 'rich-no-night') {
    return {
      spec: label,
      summary: 'rich dynamics with private plans removed: nobody gets ready for the night, nobody takes on making a tool or mending a roof, and sheltering until light is not on offer',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, private plans off';
      },
      install: () => {
        setNightPlans(false);
        return () => setNightPlans(true);
      },
    };
  }
  if (kind === 'rich-no-ask') {
    return {
      spec: label,
      summary: 'rich dynamics with private plans kept and only the project ask removed: nobody asks a neighbour for material their own project lacks',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, project asks off';
      },
      install: () => {
        setProjectAsks(false);
        return () => setProjectAsks(true);
      },
    };
  }
  if (kind === 'rich-no-learning') {
    return {
      spec: label,
      summary: 'rich dynamics with the estimates of what pays removed: nobody learns from their own gathering what to do more of',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, learning off';
      },
      install: () => {
        setLearning(false);
        return () => setLearning(true);
      },
    };
  }
  if (kind === 'rich-no-trades') {
    return {
      spec: label,
      summary: 'current dynamics with trades and apprenticeship disabled: no trade preference or apprentice teaching',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, trades off';
      },
      install: () => {
        setTrades(false);
        return () => setTrades(true);
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
  'meanMood',
  'lowMood',
  // what projects are for: tools in people's hands and roofs that are sound. Not gated (scripts/gates.ts GATED), so an old
  // recorded baseline without them still works; they are here so the ensemble run can see whether planning changes either.
  'tools',
  'meanCondition',
  // what Stage D1 is for, counted over the whole branch rather than read off the end state (an ended plan and an answered request
  // are trimmed from the records in time): tool and repair plans taken on and finished, asks made for a project's material, and the
  // units that really arrived in answer to them. Not gated either.
  'projectsAdopted',
  'projectsDone',
  'projectAsks',
  'askUnitsDelivered',
  // what Stage 3 is for: do people come to differ in what they do? `specialisation` is the mean, over everyone who set off to gather
  // at least four times, of how concentrated their gathering was on one kind (a Herfindahl index over forage/fish/wood/stone/…: 1 =
  // always the same kind, 1/kinds = spread evenly); `topKindShare` is the share of all gathering in the village's single most-used
  // kind, to tell a village of specialists from a village that all does one thing. Not gated.
  'specialisation',
  'topKindShare',
] as const;
export type Metric = (typeof METRICS)[number];
export type Outcome = Record<Metric, number>;

/**
 * The projects of a branch, tallied tick by tick, because the end state does not keep them: an ended plan is trimmed from a person's
 * record once enough have ended, and an answered request from the world's once enough have been made. `tick` is called after every
 * step; a plan is counted once, when first seen, and again when first seen ended; a request that names a plan is counted once, and
 * its `delivered` re-read every tick so the sum holds what had arrived when it was last on the record. (A request trimmed on the
 * very tick its last unit arrived is counted at what was last seen: a bounded undercount, never an overcount.)
 */
export class ProjectTally {
  private plans = new Map<string, boolean>();
  private delivered = new Map<number, number>();
  adopted = 0;
  done = 0;
  asks = 0;
  tick(w: World): void {
    for (const p of w.persons) {
      if (!p.intentions.length) continue;
      for (const i of p.intentions) {
        if (i.kind === 'night') continue;
        const k = p.id + ':' + i.id;
        const ended = this.plans.get(k);
        if (ended === undefined) {
          this.adopted++;
          this.plans.set(k, i.status !== 'active');
          if (i.status === 'done') this.done++;
        } else if (!ended && i.status !== 'active') {
          this.plans.set(k, true);
          if (i.status === 'done') this.done++;
        }
      }
    }
    for (const r of w.requests) {
      if (r.planId === undefined) continue;
      if (!this.delivered.has(r.id)) this.asks++;
      this.delivered.set(r.id, r.delivered ?? 0);
    }
  }
  get units(): number {
    let n = 0;
    for (const v of this.delivered.values()) n += v;
    return n;
  }
}

/**
 * Who set off to gather what, counted from the activity-start hook: one count per person per kind of gathering (the skill the
 * source trains). Starts, not units: what a person chooses to do is the question, and a choice is made at the start.
 */
export class GatherTally {
  private byPerson = new Map<number, Map<string, number>>();
  start(p: Person, a: Activity): void {
    if (a.kind !== 'gather') return;
    const type = a.data.stype as SourceType | undefined;
    const k = type ? SOURCE_SKILL[type] : undefined;
    if (!k) return;
    let m = this.byPerson.get(p.id);
    if (!m) this.byPerson.set(p.id, (m = new Map()));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  /** mean Herfindahl index over people with at least `atLeast` starts; 0 when nobody qualifies */
  specialisation(atLeast = 4): number {
    let sum = 0;
    let n = 0;
    for (const m of this.byPerson.values()) {
      let total = 0;
      for (const v of m.values()) total += v;
      if (total < atLeast) continue;
      let h = 0;
      for (const v of m.values()) h += (v / total) ** 2;
      sum += h;
      n++;
    }
    return n ? Math.round((sum / n) * 1000) / 1000 : 0;
  }
  /** the share of every start that went to the one kind the village used most */
  topKindShare(): number {
    const all = new Map<string, number>();
    let total = 0;
    for (const m of this.byPerson.values())
      for (const [k, v] of m) {
        all.set(k, (all.get(k) ?? 0) + v);
        total += v;
      }
    let top = 0;
    for (const v of all.values()) top = Math.max(top, v);
    return total ? Math.round((top / total) * 1000) / 1000 : 0;
  }
}

/** What a branch ends with. `from` is the tick of the fork: deaths are those since then, first-build days are counted from the fork's day 0. */
export function outcomeOf(w: World, from: number, endTick: number, projects = new ProjectTally(), gathers = new GatherTally()): { outcome: Outcome; milestones: Record<string, number> } {
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
  // tools held by the living (a tool in a hand, not one in a store) and how sound the standing buildings are
  let tools = 0;
  for (const t of w.tools) if (t.holder && (w.byId.get(t.holder) as { alive?: boolean } | undefined)?.alive) tools++;
  let cond = 0;
  for (const b of w.buildings) cond += b.condition;
  const first: Record<string, number> = {};
  for (const b of w.buildings) first[b.type] = Math.min(first[b.type] ?? Infinity, b.builtTick);
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
      deaths: w.deceased.length,
      homeless,
      belowCritical: crit,
      meanHunger: Math.round((hunger / Math.max(1, alive.length)) * 10) / 10,
      firstYardDay: day('timber_yard'),
      firstHallDay: day('hall'),
      meanMood: Math.round((mood / Math.max(1, alive.length)) * 10) / 10,
      lowMood: low,
      tools,
      meanCondition: Math.round((cond / Math.max(1, w.buildings.length)) * 10) / 10,
      projectsAdopted: projects.adopted,
      projectsDone: projects.done,
      projectAsks: projects.asks,
      askUnitsDelivered: projects.units,
      specialisation: gathers.specialisation(),
      topKindShare: gathers.topKindShare(),
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
    let diverged: number | null = null;
    const end = from + days * DAY;
    const projects = new ProjectTally();
    const gathers = new GatherTally();
    // a deserialized world has no hooks of its own; the tally is the only listener, and it reads, never writes
    w.hooks = { onActivityStart: (p, a) => gathers.start(p, a) };
    for (let i = 1; w.tick < end; i++) {
      stepWorld(w);
      projects.tick(w);
      if (i % sampleEvery === 0) {
        const h = hashWorld(w);
        hashes.push(h);
        if (controlHashes && diverged === null && controlHashes[hashes.length - 1] !== h) diverged = w.tick - from;
      }
      if (i % DAY === 0) popByDay.push(w.persons.filter((p) => p.alive).length);
    }
    const { outcome, milestones } = outcomeOf(w, from, end, projects, gathers);
    return {
      spec: iv.spec,
      summary: iv.summary,
      note,
      divergedAfterTicks: diverged,
      finalHash: hashWorld(w),
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
