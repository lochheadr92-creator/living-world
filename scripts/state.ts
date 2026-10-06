// A snapshot of the production economy after N days. usage: npx vite-node scripts/state.ts [seed] [days]
import { defaultSettings, generateNatural } from '../src/sim/worldgen';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { makeCtx } from '../src/sim/optutil';
import { demandsOf, depositLead, facilitiesOf } from '../src/sim/production';
import { toolsHeldBy } from '../src/sim/toolreg';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 30);
const world = generateNatural(defaultSettings(seed));
for (let i = 0; i < days * DAY; i++) stepWorld(world);

const know = { clay: 0, ore: 0, outcrop: 0, yard: 0, kiln: 0, smithy: 0, quarry: 0, bakery: 0, granary: 0, hall: 0, smokehouse: 0 };
const leads: Record<string, number> = {};
for (const p of world.persons) {
  if (p.bykind.clay_pit?.length) know.clay++;
  if (p.bykind.ore_vein?.length) know.ore++;
  if (p.bykind.outcrop?.length) know.outcrop++;
  const ctx = makeCtx(world, p, false);
  for (const t of ['timber_yard', 'kiln', 'smithy', 'quarry', 'bakery', 'granary', 'hall', 'smokehouse'] as const) if (facilitiesOf(ctx, t).length) know[t === 'timber_yard' ? 'yard' : t]++;
  const l = depositLead(ctx);
  if (l) leads[l.what] = (leads[l.what] ?? 0) + 1;
}
console.log('people who know:', JSON.stringify(know), 'of', world.persons.length, 'deposit leads:', JSON.stringify(leads));
const wear = world.tools.map((t) => `${t.kind}${t.tier ? '*' : ''}:${Math.round(t.wear)}`).sort();
console.log('tool wear:', wear.join(' '));
for (const s of world.sites)
  console.log(`site ${s.type}#${s.id} hh${s.hhId} age ${((world.tick - s.createdTick) / DAY).toFixed(1)}d work ${Math.round(s.work)}/${s.workTotal} delivered ${JSON.stringify(s.delivered)} used ${JSON.stringify(s.used)} status "${s.status}" last worked ${((world.tick - s.lastWorkTick) / DAY).toFixed(1)}d ago`);
const dem: Record<string, number> = {};
for (const p of world.persons) {
  const ctx = makeCtx(world, p, false);
  for (const d of demandsOf(ctx)) dem[d.item] = (dem[d.item] ?? 0) + 1;
}
console.log('demands held by people:', JSON.stringify(dem));
const act: Record<string, number> = {};
for (const p of world.persons) if (p.activity) act[p.activity.kind] = (act[p.activity.kind] ?? 0) + 1;
console.log('doing now:', JSON.stringify(act));
let held = 0;
for (const p of world.persons) held += toolsHeldBy(world, p.id).length;
console.log('tools held by people', held, 'of', world.tools.length);
