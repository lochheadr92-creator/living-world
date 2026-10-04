// Headless run: prints a periodic census so the simulation can be tuned without a browser.
//   npm run census -- <seed> <days> [harsh]
import { conservationReport } from '../src/sim/economy';
import { clockText, dayNumber } from '../src/sim/environment';
import { DAY } from '../src/sim/constants';
import { stageOf } from '../src/sim/people';
import { foodUnits } from '../src/sim/economy';
import { defaultSettings, createWorld } from '../src/sim/factory';
import { hashWorld, stepWorld } from '../src/sim/world';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 3);
const harsh = process.argv[4] === 'harsh';
const verbose = process.argv.includes('-v');

const settings = { ...defaultSettings(seed), harsh };
const t0 = Date.now();
const world = createWorld(settings);
console.log(`world "${seed}" created in ${Date.now() - t0}ms: ${world.persons.length} people, ${world.sources.length} sources, ${world.households.length} households`);

const total = Math.round(days * DAY);
const every = Math.round(DAY / 4);
let lastEvent = 0;
const tStart = Date.now();
for (let i = 0; i <= total; i++) {
  if (i % every === 0) {
    const ps = world.persons.filter((p) => p.alive);
    const avg = (f: (p: (typeof ps)[number]) => number) => (ps.reduce((s, p) => s + f(p), 0) / Math.max(1, ps.length)).toFixed(0);
    const acts: Record<string, number> = {};
    for (const p of ps) {
      const k = p.activity ? p.activity.kind : 'none';
      acts[k] = (acts[k] ?? 0) + 1;
    }
    const kids = ps.filter((p) => stageOf(world, p) === 'child').length;
    const elders = ps.filter((p) => stageOf(world, p) === 'elder').length;
    const cons = conservationReport(world);
    let inInv = 0, inStores = 0, inSources = 0, inCrops = 0;
    for (const p of ps) inInv += foodUnits(p.inv);
    for (const b of world.buildings) inStores += foodUnits(b.store.items);
    for (const s of world.sources) if (s.item === 'berries' || s.item === 'fruit' || s.item === 'fish' || s.item === 'grain') inSources += s.amount;
    for (const pl of world.plots) inCrops += pl.stock;
    console.log(
      `day ${dayNumber(world.tick)} ${clockText(world.tick)} [${world.weather.kind}] pop ${ps.length} (kids ${kids}, elders ${elders}) hunger ${avg((p) => p.needs.hunger)} thirst ${avg((p) => p.needs.thirst)} energy ${avg((p) => p.needs.energy)} warmth ${avg((p) => p.needs.warmth)} social ${avg((p) => p.needs.social)} safety ${avg((p) => p.needs.safety)} | bld ${world.buildings.length} sites ${world.sites.length} plots ${world.plots.length} | food: pack ${inInv} stores ${inStores} wild ${inSources} crops ${inCrops} | ledger ${cons.ok ? 'ok' : 'MISMATCH ' + JSON.stringify(cons.diffs)}`,
    );
    console.log('   ', Object.entries(acts).map(([k, v]) => `${k}:${v}`).join(' '));
    if (verbose) {
      const newEvents = world.events.filter((e) => e.tick >= lastEvent);
      for (const e of newEvents.slice(-14)) console.log(`     · [${e.kind}] ${e.text}`);
      lastEvent = world.tick;
    }
  }
  if (i < total) stepWorld(world);
}
const ms = Date.now() - tStart;
console.log(`simulated ${total} ticks (${days} days) in ${ms}ms = ${(ms / total).toFixed(3)} ms/tick; hash ${hashWorld(world)}`);
const kinds: Record<string, number> = {};
for (const e of world.events) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
console.log('events:', JSON.stringify(kinds), '| deaths:', world.deceased.map((d) => `${d.name}(${d.cause})`).join(', ') || 'none');
console.log('ledger created:', JSON.stringify(world.ledger.created));
console.log('ledger consumed:', JSON.stringify(world.ledger.consumed));
console.log('ledger spoiled:', JSON.stringify(world.ledger.spoiled));
