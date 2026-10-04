// Watch the production chains develop. usage: npx vite-node scripts/chains.ts [seed] [days] [-v]
import { defaultSettings, generateNatural } from '../src/sim/worldgen';
import { stepWorld, hashWorld } from '../src/sim/world';
import { totalItems, conservationReport } from '../src/sim/economy';
import { DAY } from '../src/sim/constants';
import { toolReport } from '../src/sim/toolreg';
import type { World } from '../src/sim/types';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 20);
const verbose = process.argv.includes('-v');
const world: World = generateNatural(defaultSettings(seed));

const acts: Record<string, number> = {};
world.hooks = {
  onActivityStart: (_p, a) => {
    acts[a.kind] = (acts[a.kind] ?? 0) + 1;
  },
};

let lastEvent = 0;
function line(): string {
  const bt: Record<string, number> = {};
  for (const b of world.buildings) bt[b.type] = (bt[b.type] ?? 0) + 1;
  const st: Record<string, number> = {};
  for (const s of world.sites) st[s.type] = (st[s.type] ?? 0) + 1;
  const t = totalItems(world);
  const alive = world.persons.length;
  const tools = world.tools.map((x) => x.kind + (x.tier ? '*' : '')).reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});
  return `day ${Math.floor(world.tick / DAY)}: pop ${alive} deaths ${world.deceased.length} B${JSON.stringify(bt)} S${JSON.stringify(st)} carts ${world.carts.length} tools${JSON.stringify(tools)} planks ${t.planks ?? 0} bricks ${t.bricks ?? 0} char ${t.charcoal ?? 0} iron ${t.iron ?? 0} clay ${t.clay ?? 0} ore ${t.ore ?? 0} flour ${t.flour ?? 0} bread ${t.bread ?? 0}`;
}

for (let d = 0; d < days; d++) {
  for (let i = 0; i < DAY; i++) stepWorld(world);
  console.log(line());
  if (verbose) {
    for (const e of world.events.slice(lastEvent)) if (e.kind === 'work' || e.kind === 'build') console.log(`   [${Math.floor(e.tick / DAY)}:${String(Math.floor(((e.tick % DAY) / DAY) * 24)).padStart(2, '0')}] ${e.text}`);
    lastEvent = world.events.length;
  }
}
for (const b of world.buildings) if (b.ops) console.log(`  ${b.type}#${b.id} hh${b.hhId} batches ${b.ops.batches} produced ${JSON.stringify(b.ops.produced)} wasted ${JSON.stringify(b.ops.wasted)} contributors ${Object.keys(b.ops.contributions).length} store ${JSON.stringify(b.store.items)}`);
const mealTally: Record<string, number> = {};
for (const m of world.meals) mealTally[m.status + (m.status === 'cancelled' ? ': ' + m.end : '')] = (mealTally[m.status + (m.status === 'cancelled' ? ': ' + m.end : '')] ?? 0) + 1;
console.log('meals:', JSON.stringify(mealTally));
for (const m of world.meals.slice(0, 12)) console.log(`  meal#${m.id} host ${world.persons.find((p) => p.id === m.host)?.name} at ${m.placeName} t=${m.at} invited ${m.invited.length} accepted ${m.accepted.length} arrived ${m.arrived.length} ate ${m.ate.length} ${m.status} ${m.end} missed ${JSON.stringify(m.missed)}`);
const rep = conservationReport(world);
console.log('ledger ok:', rep.ok, rep.ok ? '' : JSON.stringify(rep.diffs));
const tr = toolReport(world);
console.log('tools ok:', tr.ok, tr.ok ? '' : tr.problems.slice(0, 5).join(' | '));
console.log('activities:', JSON.stringify(acts));
console.log('hash', hashWorld(world));
