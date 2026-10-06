// Headless benchmark: runs the real simulation and records what it costs and what state it reaches.
//
//   npx vite-node scripts/bench.ts -- --days 10 --seed meadow
//   npx vite-node scripts/bench.ts -- --days 3 --pop 100 --out /tmp/pop100.json
//
//   --seed S         world seed (default meadow)
//   --days D         simulated days to run (default 5); a day is 2400 ticks
//   --pop N          founding population (default: the ordinary 28)
//   --harsh          harsh mode
//   --arrivals off   no immigration
//   --sample T       ticks between samples (default 240, a tenth of a day)
//   --check T        ticks between invariant checks (default 2400); the ledger pass is O(world), so keep it coarse at scale
//   --out FILE       write the full record as JSON
//   --quiet          print one line per simulated day instead of one per sample
//
// Wall-clock time is measured here, around stepWorld, because the simulation itself never reads a clock.
// For a function-level breakdown run the same command under:  node --cpu-prof node_modules/vite-node/dist/cli.mjs scripts/bench.ts ...
// Close the browser debug panel and anything else heavy while benchmarking: timings from a busy machine are not comparable.
import { writeFileSync } from 'node:fs';
import { CRITICAL, DAY, NEED_KEYS } from '../src/sim/constants';
import { conservationReport, foodUnits } from '../src/sim/economy';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { WATER_ID_BASE } from '../src/sim/knowledge';
import { stageOf } from '../src/sim/people';
import { COUNTER_KEYS, probe, probeReset, probeSnapshot } from '../src/sim/probe';
import type { ProbeCounters } from '../src/sim/probe';
import { toolReport } from '../src/sim/toolreg';
import type { World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const flag = (name: string): boolean => args.includes('--' + name);

const seed = opt('seed', 'meadow');
const days = Number(opt('days', '5'));
const popArg = opt('pop', '');
const sampleEvery = Math.max(1, Number(opt('sample', '240')));
const checkEvery = Math.max(1, Number(opt('check', '2400')));
const out = opt('out', '');
const quiet = flag('quiet');

const settings = { ...defaultSettings(seed), harsh: flag('harsh'), immigration: opt('arrivals', 'on') !== 'off' };
if (popArg) settings.population = Number(popArg);

const pct = (sorted: Float64Array, q: number): number => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0);
const r2 = (v: number): number => Math.round(v * 100) / 100;

const tGen = Date.now();
const world: World = createWorld(settings);
const genMs = Date.now() - tGen;

const activityStarts: Record<string, number> = {};
world.hooks = {
  onActivityStart: (_p, a) => {
    activityStarts[a.kind] = (activityStarts[a.kind] ?? 0) + 1;
  },
};

interface Sample {
  tick: number;
  day: number;
  /** wall-clock cost of stepWorld over the interval, ms per tick */
  msMean: number;
  msP95: number;
  msMax: number;
  pop: number;
  children: number;
  elders: number;
  households: number;
  homeless: number;
  buildings: number;
  sites: number;
  plots: number;
  piles: number;
  tools: number;
  carts: number;
  sources: number;
  animals: number;
  busy: number;
  conversations: number;
  requests: number;
  requestsPending: number;
  reservations: number;
  events: number;
  meals: number;
  nextId: number;
  deaths: number;
  foodPerHead: number;
  meanHunger: number;
  meanThirst: number;
  belowCritical: number;
  beliefsTotal: number;
  beliefsMax: number;
  relationsTotal: number;
  whereaboutsTotal: number;
  heapMB: number;
  /** work counters, per tick, over the interval */
  perTick: Record<keyof ProbeCounters, number>;
  buildingTypes: Record<string, number>;
}

const failures: string[] = [];
const fail = (msg: string) => {
  if (failures.length < 50) failures.push(msg);
  console.log('INVARIANT FAILED: ' + msg);
};
const firstSeen: Record<string, number> = {};
const samples: Sample[] = [];
const intervalMs = new Float64Array(sampleEvery);
let lastCounters = probeSnapshot();
let checks = 0;
const ledgerOkEvery: { tick: number; ledger: boolean; tools: boolean; hash: string }[] = [];

function takeSample(w: World, n: number): Sample {
  const buf = intervalMs.slice(0, n).sort();
  let sum = 0;
  for (let i = 0; i < n; i++) sum += buf[i];
  const alive = w.persons.filter((p) => p.alive);
  const pop = alive.length;
  const hh = new Map(w.households.map((h) => [h.id, h]));
  const homeIds = new Set(w.buildings.map((b) => b.id));
  let homeless = 0;
  let hunger = 0;
  let thirst = 0;
  let crit = 0;
  let beliefsTotal = 0;
  let beliefsMax = 0;
  let relationsTotal = 0;
  let whereaboutsTotal = 0;
  let busy = 0;
  let children = 0;
  let elders = 0;
  let food = 0;
  for (const p of alive) {
    const h = hh.get(p.hhId);
    if (!h || !h.homeId || !homeIds.has(h.homeId)) homeless++;
    hunger += p.needs.hunger;
    thirst += p.needs.thirst;
    if (NEED_KEYS.some((k) => p.needs[k] < CRITICAL[k] && CRITICAL[k] > 0)) crit++;
    for (const k of NEED_KEYS) if (!Number.isFinite(p.needs[k])) fail(`tick ${w.tick}: ${p.name} has a non-finite ${k}`);
    const nb = Object.keys(p.beliefs).length;
    beliefsTotal += nb;
    if (nb > beliefsMax) beliefsMax = nb;
    relationsTotal += Object.keys(p.relations).length;
    whereaboutsTotal += Object.keys(p.whereabouts).length;
    if (p.activity) busy++;
    const st = stageOf(w, p);
    if (st === 'child') children++;
    if (st === 'elder') elders++;
    food += foodUnits(p.inv);
  }
  for (const b of w.buildings) if (b.store.cap > 0) food += foodUnits(b.store.items);
  const types: Record<string, number> = {};
  for (const b of w.buildings) {
    types[b.type] = (types[b.type] ?? 0) + 1;
    if (firstSeen[b.type] === undefined) firstSeen[b.type] = w.tick;
  }
  const now = probeSnapshot();
  const perTick = {} as Record<keyof ProbeCounters, number>;
  for (const k of COUNTER_KEYS) perTick[k] = r2((now[k] - lastCounters[k]) / Math.max(1, n));
  lastCounters = now;
  return {
    tick: w.tick,
    day: r2(w.tick / DAY),
    msMean: r2(sum / Math.max(1, n)),
    msP95: r2(pct(buf, 0.95)),
    msMax: r2(buf[n - 1] ?? 0),
    pop,
    children,
    elders,
    households: w.households.length,
    homeless,
    buildings: w.buildings.length,
    sites: w.sites.length,
    plots: w.plots.length,
    piles: w.piles.length,
    tools: w.tools.length,
    carts: w.carts.length,
    sources: w.sources.length,
    animals: w.animals.length,
    busy,
    conversations: w.conversations.length,
    requests: w.requests.length,
    requestsPending: w.requests.filter((r) => r.status === 'pending' || r.status === 'promised').length,
    reservations: w.reservations.size,
    events: w.events.length,
    meals: w.meals.length,
    nextId: w.nextId,
    deaths: w.deceased.length,
    foodPerHead: r2(food / Math.max(1, pop)),
    meanHunger: r2(hunger / Math.max(1, pop)),
    meanThirst: r2(thirst / Math.max(1, pop)),
    belowCritical: crit,
    beliefsTotal,
    beliefsMax,
    relationsTotal,
    whereaboutsTotal,
    heapMB: Math.round(process.memoryUsage().heapUsed / 1e6),
    perTick,
    buildingTypes: types,
  };
}

function check(w: World): void {
  checks++;
  const led = conservationReport(w);
  const tools = toolReport(w);
  if (!led.ok) fail(`tick ${w.tick}: ledger does not balance: ${JSON.stringify(led.diffs)}`);
  if (!tools.ok) fail(`tick ${w.tick}: tool records disagree with holders: ${tools.problems.slice(0, 3).join('; ')}`);
  // ids at or above this are read as water-belief ids (knowledge.ts); a real entity must never get there
  if (w.nextId >= WATER_ID_BASE) fail(`tick ${w.tick}: nextId ${w.nextId} has reached the water-belief id range (${WATER_ID_BASE})`);
  ledgerOkEvery.push({ tick: w.tick, ledger: led.ok, tools: tools.ok, hash: hashWorld(w) });
}

console.log(`bench: seed ${seed}${settings.harsh ? ' harsh' : ''}, ${settings.population} founders, ${w2(world)} map, arrivals ${settings.immigration ? 'on' : 'off'}; generated in ${genMs} ms (${world.sources.length} sources)`);
function w2(w: World): string {
  return `${w.W}x${w.H}`;
}
const header = 'tick   day   ms/t  p95    max     pop  hh  home- bld sites  beliefs/p  req  conv  resv  pathC/t  pathN/t  dec/t  gen/t  opts/gen  heap';
console.log(header);

probe.on = true;
probeReset();
lastCounters = probeSnapshot();
const total = Math.round(days * DAY);
const t0 = Date.now();
let inInterval = 0;
// what exists at generation counts as present from tick 0, so the timeline only shows what the settlement builds afterwards
for (const b of world.buildings) firstSeen[b.type] ??= 0;
check(world);
for (let i = 1; i <= total; i++) {
  const a = performance.now();
  stepWorld(world);
  intervalMs[inInterval++] = performance.now() - a;
  if (i % sampleEvery === 0 || i === total) {
    const s = takeSample(world, inInterval);
    inInterval = 0;
    samples.push(s);
    const isDay = world.tick % DAY === 0;
    if (!quiet || isDay) {
      const bpp = s.pop ? Math.round(s.beliefsTotal / s.pop) : 0;
      const optsPerGen = s.perTick.generations > 0 ? r2(s.perTick.optionsGenerated / s.perTick.generations) : 0;
      console.log(
        [s.tick, s.day, s.msMean, s.msP95, s.msMax, s.pop, s.households, s.homeless, s.buildings, s.sites, bpp, s.requests, s.conversations, s.reservations, s.perTick.pathCalls, s.perTick.pathNull, s.perTick.decisions, s.perTick.generations, optsPerGen, s.heapMB].map((v) => String(v).padEnd(6)).join(''),
      );
    }
  }
  if (i % checkEvery === 0) check(world);
}
check(world);
probe.on = false;
const wall = (Date.now() - t0) / 1000;

const all = new Float64Array(samples.map((s) => s.msMean)).sort();
const last = samples[samples.length - 1];
const summary = {
  wallSeconds: r2(wall),
  ticks: total,
  msPerTickOverall: r2((wall * 1000) / Math.max(1, total)),
  msPerTickMedianSample: r2(pct(all, 0.5)),
  msPerTickP95Sample: r2(pct(all, 0.95)),
  msPerTickWorstTick: r2(Math.max(...samples.map((s) => s.msMax))),
  /** how many ticks per second the run sustained, against the 10/s that 1x playback needs */
  ticksPerSecond: r2(total / Math.max(0.001, wall)),
  finalPop: last?.pop ?? 0,
  finalHash: hashWorld(world),
  firstBuildingTick: firstSeen,
  activityStarts,
  invariantChecks: checks,
  invariantFailures: failures,
};
console.log('\nsummary', JSON.stringify(summary, null, 1));
if (out) {
  writeFileSync(out, JSON.stringify({ meta: { seed, settings, days, sampleEvery, checkEvery, node: process.version, generationMs: genMs }, summary, samples, checks: ledgerOkEvery }, null, 1));
  console.log('written', out);
}
process.exit(failures.length === 0 ? 0 : 1);
