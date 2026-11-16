// Stage 4 of the growth plan (docs/GROWTH_PLAN.md "Stage 4"): what holds a settlement back past about 130 people. Read-only: it steps a
// saved world as it is and looks; it writes nothing to the world and changes no rules.
//
// Each window of 12 days (a "year" in the traces) it records: people by stage, births, arrivals, deaths by cause; the food the settlement
// holds (stores, packs, wild) a head; the goods ledger's created, consumed and spoiled food by item and by reason for the window; and,
// once a day at midday, the two gates that admit an arrival (lifecycle.ts immigrationTick): food a head under 3.2 (stores and packs,
// what the gate reads) and roofs under ceil(people / 3.2) - 1. So the table says which gate was shut on how many days, and what the
// food account looked like when it was.
//
//   node scripts/fast.mjs scripts/past130_probe.ts -- --load <save> --days <absolute day to run to> --out <file.json>
import { writeFileSync } from 'node:fs';
import { argsOf, worldFromArgs } from './world_args';
import { DAY } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { isHomeType } from '../src/sim/constants';
import { stepWorld } from '../src/sim/world';
import { stageOf } from '../src/sim/people';
import type { Items, World } from '../src/sim/types';

const { opt } = argsOf(process.argv);
const { w, startDay } = worldFromArgs(opt);
const endDay = Number(opt('days', String(startDay + 48)));
const out = opt('out', 'past130.json');
const WINDOW = 12;
const FOODS = ['berries', 'fruit', 'grain', 'fish', 'meat', 'bread', 'flour', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat'];

const copy = (o: Items): Record<string, number> => ({ ...(o as Record<string, number>) });
const diff = (a: Record<string, number>, b: Record<string, number>): Record<string, number> => {
  const r: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (b[k] ?? 0) - (a[k] ?? 0);
    if (Math.abs(d) > 1e-9) r[k] = Math.round(d * 10) / 10;
  }
  return r;
};
const alive = (x: World) => x.persons.filter((p) => p.alive);

interface Snap { created: Record<string, number>; consumed: Record<string, number>; spoiled: Record<string, number>; reasons: Record<string, number> }
const snapNow = (): Snap => ({ created: copy(w.ledger.created), consumed: copy(w.ledger.consumed), spoiled: copy(w.ledger.spoiled), reasons: { ...w.ledger.reasons } });
let base = snapNow();
let dayRows: { day: number; pop: number; perHead: number; roofsNeed: number; roofs: number; foodGateShut: boolean; roofGateShut: boolean; wild: number; wildCap: number; storeHead: number }[] = [];
const windows: unknown[] = [];

const gate = () => {
  const pop = alive(w).length;
  let food = 0;
  for (const q of w.persons) food += foodUnits(q.inv);
  for (const b of w.buildings) if (b.store.cap > 0) food += foodUnits(b.store.items);
  let storeFood = 0;
  for (const b of w.buildings) if (b.store.cap > 0) storeFood += foodUnits(b.store.items);
  const roofs = w.buildings.filter((b) => isHomeType(b.type)).length;
  const need = Math.ceil(pop / 3.2) - 1;
  let wild = 0, cap = 0;
  for (const s of w.sources) if (s.type === 'berry_bush' || s.type === 'fruit_tree' || s.type === 'fish_spot' || s.type === 'wild_grain') { wild += s.amount; cap += s.max; }
  return { day: Math.floor(w.tick / DAY), pop, perHead: food / Math.max(1, pop), roofsNeed: need, roofs, foodGateShut: food / Math.max(1, pop) < 3.2, roofGateShut: roofs < need, wild, wildCap: cap, storeHead: storeFood / Math.max(1, pop) };
};

let windowStart = startDay;
while (w.tick < endDay * DAY) {
  stepWorld(w);
  if (w.tick % DAY === 1200) dayRows.push(gate());
  if (w.tick % (WINDOW * DAY) === 0 || w.tick >= endDay * DAY) {
    const now = snapNow();
    const al = alive(w);
    const stages: Record<string, number> = {};
    for (const p of al) stages[stageOf(w, p)] = (stages[stageOf(w, p)] ?? 0) + 1;
    const pick = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).filter(([k]) => FOODS.includes(k)));
    const rd = diff(base.reasons, now.reasons);
    const arr = w.stats.arrivals ?? 0;
    windows.push({
      days: `${windowStart}-${Math.floor(w.tick / DAY)}`,
      people: al.length,
      stages,
      arrivals: arr,
      foodCreated: pick(diff(base.created, now.created)),
      foodConsumed: pick(diff(base.consumed, now.consumed)),
      foodSpoiled: pick(diff(base.spoiled, now.spoiled)),
      reasons: Object.fromEntries(Object.entries(rd).filter(([, v]) => Math.abs(v) >= 3)),
      foodGateShutDays: dayRows.filter((d) => d.foodGateShut).length,
      roofGateShutDays: dayRows.filter((d) => d.roofGateShut).length,
      rows: dayRows.length,
      meanPerHead: dayRows.reduce((a, d) => a + d.perHead, 0) / Math.max(1, dayRows.length),
      meanStoreHead: dayRows.reduce((a, d) => a + d.storeHead, 0) / Math.max(1, dayRows.length),
    });
    base = now;
    dayRows = [];
    windowStart = Math.floor(w.tick / DAY);
  }
}
writeFileSync(out, JSON.stringify({ startDay, endDay, windows }, null, 1));
console.log(JSON.stringify({ startDay, endDay, windows: windows.length, people: alive(w).length }));
