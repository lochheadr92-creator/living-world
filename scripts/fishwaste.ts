// How much fish is there to keep, and how much of it is lost? (This is what the smokehouse was measured against.)
// usage: npx vite-node scripts/fishwaste.ts [seed] [days]
// Every 120 ticks, how much fish does each person hold (carried plus their own household's stores)? And over the run, how much fish
// was caught, eaten and spoiled?
import { DAY } from '../src/sim/constants';
import { stepWorld } from '../src/sim/world';
import { defaultSettings, generateNatural } from '../src/sim/worldgen';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 25);
const w = generateNatural(defaultSettings(seed));
const hist: Record<string, number> = {};
let samples = 0;
for (let t = 0; t < days * DAY; t++) {
  stepWorld(w);
  if (t % 120 !== 0 || w.tick < DAY * 3) continue;
  const hhFish: Record<number, number> = {};
  for (const b of w.buildings) if (b.hhId && (b.store.items.fish ?? 0) > 0) hhFish[b.hhId] = (hhFish[b.hhId] ?? 0) + (b.store.items.fish ?? 0);
  for (const p of w.persons) {
    if (!p.alive) continue;
    const held = (p.inv.fish ?? 0) + (hhFish[p.hhId] ?? 0);
    samples++;
    const k = held >= 8 ? '8+' : String(held);
    hist[k] = (hist[k] ?? 0) + 1;
  }
}
const caught = w.ledger.created.fish ?? 0;
const spoiled = w.ledger.spoiled.fish ?? 0;
console.log(`${seed} ${days}d: fish caught ${caught}, eaten ${w.ledger.consumed.fish ?? 0}, spoiled ${spoiled} (${((100 * spoiled) / Math.max(1, caught)).toFixed(1)}% of the catch)`);
console.log('  fish held per person-sample (carried + own household stores):', JSON.stringify(hist));
