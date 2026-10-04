// Reproducible ordinary-world baseline.  Usage:  npx vite-node scripts/baseline.ts [seed] [harsh] [--out file.json]
// Runs the default settings for the given seed and records daily trajectories plus cumulative counters.
import { writeFileSync } from 'node:fs';
import { conservationReport, foodUnits, totalItems } from '../src/sim/economy';
import { defaultSettings, createWorld } from '../src/sim/factory';
import { stageOf } from '../src/sim/people';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const seed = args.find((a) => !a.startsWith('--') && a !== 'harsh') ?? 'meadow';
const harsh = flag('harsh');
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : '';
const DAYS = 30;
const DAY = 2400;

const w: World = createWorld({ ...defaultSettings(seed), harsh });
const starts: Record<string, number> = {};
w.hooks = { onActivityStart: (_p, a) => { starts[a.kind] = (starts[a.kind] ?? 0) + 1; } };

const PATTERNS: Record<string, RegExp> = {
  born: /was born to/,
  expecting: /expecting a child/,
  arrivals: /arrive/,
  gifts: / gave |fed /,
  promised: / promised /,
  promiseKept: /kept a promise/,
  promiseBroken: /did not keep a promise/,
  agreedToHelp: /agreed to help/,
  argued: /argued over/,
  madePeace: /made peace/,
  refused: /refused/,
  swapped: /swapped/,
  warned: /warned/,
  finished: /finished a|lit a/,
  markedOut: /marked out/,
  repaired: /repaired a/,
  madeTool: / made an? /,
  couples: /became a couple/,
  collapsed: /collapsed/,
  abandoned: /abandoned/,
};
const counts: Record<string, number> = {};
for (const k of Object.keys(PATTERNS)) counts[k] = 0;
let lastEventId = -1;
const scan = () => {
  for (let i = w.events.length - 1; i >= 0; i--) {
    const e = w.events[i];
    if (e.id <= lastEventId) break;
    for (const [k, re] of Object.entries(PATTERNS)) if (re.test(e.text)) counts[k]++;
  }
  if (w.events.length) lastEventId = Math.max(lastEventId, w.events[w.events.length - 1].id);
};

const trajectory: Record<string, unknown>[] = [];
const snapshot = (day: number) => {
  const alive = w.persons.filter((p) => p.alive);
  const items = totalItems(w);
  const types: Record<string, number> = {};
  for (const b of w.buildings) types[b.type] = (types[b.type] ?? 0) + 1;
  const mean = (f: (p: (typeof alive)[number]) => number) => +(alive.reduce((s, p) => s + f(p), 0) / Math.max(1, alive.length)).toFixed(1);
  trajectory.push({
    day,
    tick: w.tick,
    pop: alive.length,
    children: alive.filter((p) => stageOf(w, p) === 'child').length,
    elders: alive.filter((p) => stageOf(w, p) === 'elder').length,
    households: w.households.filter((h) => alive.some((p) => p.hhId === h.id)).length,
    homeless: w.households.filter((h) => alive.some((p) => p.hhId === h.id) && !h.homeId).length,
    buildings: types,
    sites: w.sites.length,
    plots: w.plots.length,
    stock: items,
    foodPerHead: +((foodUnits(items)) / Math.max(1, alive.length)).toFixed(2),
    meanHunger: mean((p) => p.needs.hunger),
    meanThirst: mean((p) => p.needs.thirst),
    meanWarmth: mean((p) => p.needs.warmth),
    belowCritical: alive.filter((p) => p.needs.hunger < 14 || p.needs.thirst < 14 || p.needs.warmth < 14).length,
    deaths: w.deceased.length,
    ledgerOk: conservationReport(w).ok,
  });
};

snapshot(0);
for (let d = 1; d <= DAYS; d++) {
  for (let i = 0; i < DAY; i++) {
    stepWorld(w);
    if (i % 5 === 0) scan();
  }
  scan();
  snapshot(d);
}
const reqs: Record<string, number> = {};
for (const r of w.requests) reqs[r.kind + ':' + r.status] = (reqs[r.kind + ':' + r.status] ?? 0) + 1;
const result = {
  seed,
  harsh,
  settings: w.settings,
  ticks: w.tick,
  hash: hashWorld(w),
  deaths: w.deceased.map((d) => ({ name: d.name, cause: d.cause, age: d.age, tick: d.tick })),
  counters: counts,
  activityStarts: starts,
  requestsInBuffer: reqs,
  trajectory,
};
const text = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, text);
// compact console report
console.log(`seed ${seed}${harsh ? ' (harsh)' : ''} after ${w.tick} ticks (${DAYS} days): hash ${result.hash}`);
for (const t of trajectory.filter((_, i) => i % 5 === 0 || i === trajectory.length - 1)) {
  const tt = t as Record<string, any>;
  console.log(`  day ${String(tt.day).padStart(2)} pop ${tt.pop} (kids ${tt.children}, elders ${tt.elders}) hh ${tt.households} homeless ${tt.homeless} bld ${JSON.stringify(tt.buildings)} sites ${tt.sites} plots ${tt.plots} food/head ${tt.foodPerHead} hunger ${tt.meanHunger} thirst ${tt.meanThirst} critical ${tt.belowCritical} deaths ${tt.deaths} ledger ${tt.ledgerOk ? 'ok' : 'MISMATCH'}`);
}
console.log('deaths:', JSON.stringify(result.deaths));
console.log('counters:', JSON.stringify(counts));
console.log('activity starts:', JSON.stringify(starts));
console.log('requests in buffer:', JSON.stringify(reqs));
