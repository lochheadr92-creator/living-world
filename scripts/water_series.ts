// Read-only: for each save named on the command line, the people, wells, ground water, lake and rain. npx vite-node scripts/water_series.ts -- <save>...
import { readFileSync } from 'node:fs';
import { deserializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
for (const f of process.argv.slice(2).filter((a) => a !== '--')) {
  const w = deserializeWorld(readFileSync(f, 'utf8'));
  const alive = w.persons.filter((p) => p.alive);
  const wells = w.buildings.filter((b) => b.type === 'well');
  const gw = w.groundwater ?? {};
  const g = wells.map((b) => gw[b.id]?.amount ?? 0);
  const lake = (w.waterBodies ?? []).reduce((n, b) => n + b.amount, 0);
  const cap = (w.waterBodies ?? []).reduce((n, b) => n + b.capacity, 0);
  console.log(`d${(w.tick / DAY).toFixed(0)} alive ${alive.length} wells ${wells.length} ground ${Math.round(g.reduce((a, b) => a + b, 0))}/${wells.length * 240} lake ${Math.round(lake)}/${Math.round(cap)} rain ${w.weather.rain.toFixed(2)} thirstMean ${(alive.reduce((n, p) => n + p.needs.thirst, 0) / alive.length).toFixed(0)}`);
}
