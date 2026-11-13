// Where the food is when people starve. Read-only measurement: one ordinary world stepped to a chosen day, and from then,
// every 200 ticks, where food is held (packs, households' own buildings, shared stores, the wild), how it is spread across
// households, and what the starving are doing. For each death by hunger: what the person and their household held at the last
// reading before it, and how far the nearest shared food was.
//
//   npx vite-node scripts/famine_probe.ts -- --seed gen-4 --from 100 --to 108 [--rules 236] [--out famine.json]
import { writeFileSync } from 'node:fs';
import { CRITICAL, DAY } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'gen-4');
const from = Number(opt('from', '100'));
const to = Number(opt('to', '108'));
const out = opt('out', '');
const settings = freshRunSettings(parseRunRules('rich'), 'normal', seed, { immigration: opt('arrivals', 'on') === 'on' });
const pinned = opt('rules', '');
if (pinned) settings.rulesVersion = Number(pinned);
const w: World = deserializeWorld(serializeWorld(createWorld(settings)));

const bump = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };
const r1 = (n: number): number => Math.round(n * 10) / 10;
type Seen = { tick: number; hunger: number; pack: number; hhAHead: number; hhOwn: number; act: string; nearShared: number; sharedFood: number; age: number };
const last = new Map<number, Seen>();
const rows: Record<string, unknown>[] = [];
const hungerDeaths: Record<string, unknown>[] = [];
let deathsSoFar = 0;
const doing: Record<string, number> = {}; // what the starving (hunger under the critical line) were doing, summed over readings
let starvingReadings = 0, starvingWithFoodAtHome = 0, starvingWithFoodInPack = 0;
// the day's flow of food through the goods account: made (gathered, harvested, hunted, cooked), eaten or used, and spoiled
const foodOf = (items: Record<string, number | undefined>): number => { let n = 0; for (const k of Object.keys(items)) if (isFood(k)) n += items[k] ?? 0; return n; };
const isFood = (k: string): boolean => foodUnits({ [k]: 1 } as never) > 0;
let flowAt = { made: 0, eaten: 0, spoiled: 0, reasons: {} as Record<string, number> };
const flows: Record<string, unknown>[] = [];
const snapFlow = () => ({ made: foodOf(w.ledger.created as never), eaten: foodOf(w.ledger.consumed as never), spoiled: foodOf(w.ledger.spoiled as never), reasons: { ...w.ledger.reasons } });

for (let i = 1; i <= to * DAY; i++) {
  stepWorld(w);
  if (i < from * DAY) { deathsSoFar = w.deceased.length; if (i === from * DAY - 1) flowAt = snapFlow(); continue; }
  const todays = w.deceased.slice(deathsSoFar);
  deathsSoFar = w.deceased.length;
  for (const d of todays) {
    if (d.cause !== 'hunger') continue;
    const s = last.get(d.id);
    hungerDeaths.push({ day: r1(d.tick / DAY), age: Math.round(d.age), ...(s ? { ticksSinceReading: d.tick - s.tick, hunger: r1(s.hunger), pack: r1(s.pack), householdFoodAHead: r1(s.hhAHead), householdOwnStores: r1(s.hhOwn), doing: s.act, nearestSharedFoodTiles: s.nearShared < 0 ? null : Math.round(s.nearShared), sharedFood: Math.round(s.sharedFood) } : {}) });
  }
  if (i % DAY === 0) {
    const now = snapFlow();
    const why: [string, number][] = [];
    for (const [k, n] of Object.entries(now.reasons)) { const d = n - (flowAt.reasons[k] ?? 0); if (d >= 3) why.push([k, Math.round(d)]); }
    let capOwn = 0, capShared = 0;
    for (const b of w.buildings) if (b.store.cap > 0 && (b.type === 'cellar' || b.type === 'granary' || b.type === 'storehouse' || b.type === 'food_rack')) { if (b.hhId) capOwn += b.store.cap; else capShared += b.store.cap; }
    flows.push({ day: i / DAY, alive: w.persons.filter((p) => p.alive).length, made: Math.round(now.made - flowAt.made), eaten: Math.round(now.eaten - flowAt.eaten), spoiled: Math.round(now.spoiled - flowAt.spoiled), plots: w.plots.length, roomInHouseholdStores: capOwn, roomInSharedStores: capShared, why: why.sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => `${k} ${n}`).join('; ') });
    flowAt = now;
  }
  if (i % 200 !== 0) continue;
  const alive = w.persons.filter((p) => p.alive);
  let packs = 0, own = 0, shared = 0, wild = 0;
  const hhFood = new Map<number, number>(), hhOwn = new Map<number, number>(), hhSize = new Map<number, number>();
  for (const p of alive) { const f = foodUnits(p.inv); packs += f; hhFood.set(p.hhId, (hhFood.get(p.hhId) ?? 0) + f); hhSize.set(p.hhId, (hhSize.get(p.hhId) ?? 0) + 1); }
  const sharedStores: { x: number; y: number; f: number }[] = [];
  for (const b of w.buildings) {
    const f = foodUnits(b.store.items);
    if (f <= 0) continue;
    if (b.hhId) { own += f; hhFood.set(b.hhId, (hhFood.get(b.hhId) ?? 0) + f); hhOwn.set(b.hhId, (hhOwn.get(b.hhId) ?? 0) + f); }
    else { shared += f; sharedStores.push({ x: b.x, y: b.y, f }); }
  }
  for (const s of w.sources) if (s.type === 'berry_bush' || s.type === 'fruit_tree' || s.type === 'fish_spot' || s.type === 'wild_grain') wild += s.amount;
  const aHead = [...hhSize.entries()].map(([id, n]) => (hhFood.get(id) ?? 0) / n);
  let starving = 0;
  const doingNow: Record<string, number> = {};
  for (const p of alive) {
    const n = hhSize.get(p.hhId) ?? 1, hh = (hhFood.get(p.hhId) ?? 0) / n, pack = foodUnits(p.inv);
    let near = -1;
    for (const s of sharedStores) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (near < 0 || d < near) near = d; }
    const act = p.activity ? p.activity.kind + (p.activity.need ? ` (for ${p.activity.need})` : '') : p.pose === 'sleep' ? 'asleep' : 'nothing';
    last.set(p.id, { tick: w.tick, hunger: p.needs.hunger, pack, hhAHead: hh, hhOwn: hhOwn.get(p.hhId) ?? 0, act, nearShared: near, sharedFood: shared, age: 0 });
    if (p.needs.hunger < CRITICAL.hunger) {
      starving++; starvingReadings++;
      bump(doing, act); bump(doingNow, act);
      if ((hhOwn.get(p.hhId) ?? 0) >= 1) starvingWithFoodAtHome++;
      if (pack >= 1) starvingWithFoodInPack++;
    }
  }
  if (i % 800 === 0) rows.push({ day: r1(i / DAY), alive: alive.length, starving, packs: Math.round(packs), householdStores: Math.round(own), sharedStores: Math.round(shared), wild: Math.round(wild),
    households: aHead.length, householdsWithNone: aHead.filter((f) => f < 0.5).length, householdsUnderOneAHead: aHead.filter((f) => f < 1).length, householdsOverThreeAHead: aHead.filter((f) => f >= 3).length, richestAHead: r1(Math.max(0, ...aHead)),
    hardship: w.hardship ? w.hardship.kind : '', starvingDoing: Object.entries(doingNow).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${n} ${k}`).join(', ') });
}
const result = { seed, from, to, rulesVersion: w.settings.rulesVersion, flows, rows, hungerDeaths, starvingReadings, starvingWithFoodAtHome, starvingWithFoodInPack, doing };
if (out) writeFileSync(out, JSON.stringify(result));
console.log(`${seed}: days ${from} to ${to}, rules ${result.rulesVersion}`);
console.log('  day    alive starving | food: packs  households  shared  wild | households: none  under 1 a head  over 3 a head  (of) richest | hardship | the starving are');
for (const r of rows as Record<string, number | string>[]) console.log(`  ${String(r.day).padStart(6)} ${String(r.alive).padStart(5)} ${String(r.starving).padStart(8)} | ${String(r.packs).padStart(11)} ${String(r.householdStores).padStart(11)} ${String(r.sharedStores).padStart(7)} ${String(r.wild).padStart(5)} | ${String(r.householdsWithNone).padStart(16)} ${String(r.householdsUnderOneAHead).padStart(15)} ${String(r.householdsOverThreeAHead).padStart(14)}  (${r.households}) ${String(r.richestAHead).padStart(6)} | ${String(r.hardship).padEnd(4)} | ${r.starvingDoing}`);
console.log('  food through the goods account, by day (all goods in the reasons, largest first):');
for (const f of flows as Record<string, number | string>[]) console.log(`    day ${String(f.day).padStart(4)}: ${f.alive} alive, ${f.plots} plots; food made ${f.made}, eaten or used ${f.eaten}, spoiled ${f.spoiled}; store room: households ${f.roomInHouseholdStores}, shared ${f.roomInSharedStores} | ${f.why}`);
const pct = (n: number, d: number): string => (d ? Math.round((100 * n) / d) : 0) + '%';
console.log(`  readings of a starving person: ${starvingReadings}; with food in their own household's stores ${pct(starvingWithFoodAtHome, starvingReadings)}; with food in their pack ${pct(starvingWithFoodInPack, starvingReadings)}`);
console.log('  what the starving were doing: ' + Object.entries(doing).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${pct(n, starvingReadings)} ${k}`).join('; '));
console.log(`  deaths by hunger: ${hungerDeaths.length}`);
const hd = hungerDeaths as { pack?: number; householdFoodAHead?: number; householdOwnStores?: number; nearestSharedFoodTiles?: number | null; sharedFood?: number; doing?: string }[];
const withS = hd.filter((d) => d.pack !== undefined);
if (withS.length) {
  console.log(`    at the last reading before death: food in own pack ${withS.filter((d) => (d.pack ?? 0) >= 1).length} of ${withS.length}; household held 1 a head or more ${withS.filter((d) => (d.householdFoodAHead ?? 0) >= 1).length}; household's own stores held food ${withS.filter((d) => (d.householdOwnStores ?? 0) >= 1).length}; shared food stood somewhere ${withS.filter((d) => (d.sharedFood ?? 0) >= 1).length}, within 20 tiles ${withS.filter((d) => d.nearestSharedFoodTiles !== null && (d.nearestSharedFoodTiles ?? 99) <= 20).length}`);
  const dd: Record<string, number> = {};
  for (const d of withS) bump(dd, d.doing ?? '');
  console.log('    doing then: ' + Object.entries(dd).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${n} ${k}`).join('; '));
}
