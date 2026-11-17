// Read-only diagnosis probe: load a save, optionally throw a lab switch, step it, and every 240 ticks say who is thirsty and what water is left.
//   npx vite-node scripts/thirst_probe.ts -- --load <save> --days 4 [--no-draw] [--rules-up N]
import { worldFromArgs } from './world_args';
import { DAY } from '../src/sim/constants';
import { stepWorld } from '../src/sim/world';
import { setFarmDraw } from '../src/sim/farm_draw';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (n: string, d: string): string => { const i = args.indexOf('--' + n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const { w } = worldFromArgs(opt, 'fern');
if (args.includes('--no-draw')) setFarmDraw(false);
const days = Number(opt('days', '4'));
const end = w.tick + days * DAY;
const every = Number(opt('every', '240'));
const kinds = (xs: string[]): string => { const o: Record<string, number> = {}; for (const x of xs) o[x] = (o[x] ?? 0) + 1; return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k}${n}`).join(' '); };
while (w.tick < end) {
  stepWorld(w);
  if (w.tick % every !== 0) continue;
  const alive = w.persons.filter((p) => p.alive);
  const thirsty = alive.filter((p) => p.needs.thirst < 35);
  const wells = w.buildings.filter((b) => b.type === 'well');
  const gw = w.groundwater ?? {};
  const gAmts = wells.map((b) => gw[b.id]?.amount ?? 0);
  const lake = (w.waterBodies ?? []).reduce((n, b) => n + b.amount, 0);
  const lakeCap = (w.waterBodies ?? []).reduce((n, b) => n + b.capacity, 0);
  const meanThirst = alive.reduce((n, p) => n + p.needs.thirst, 0) / Math.max(1, alive.length);
  console.log(`d${(w.tick / DAY).toFixed(2)} alive ${alive.length} thirsty<35 ${thirsty.length} meanThirst ${meanThirst.toFixed(0)} rain ${w.weather.rain.toFixed(2)} wells ${wells.length} ground sum ${Math.round(gAmts.reduce((a, b) => a + b, 0))} empty<5 ${gAmts.filter((x) => x < 5).length} lake ${Math.round(lake)}/${Math.round(lakeCap)} | thirstyDoing ${kinds(thirsty.map((p) => p.activity?.kind ?? 'idle'))} | allDoing ${kinds(alive.map((p) => p.activity?.kind ?? 'idle'))}`);
}
