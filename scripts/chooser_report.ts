// Compare runs made with `bench --chooser utility` and `--chooser random` (paired by seed).
//   for sd in meadow river fern; do for m in utility random; do
//     npx vite-node scripts/bench.ts -- --profile large --seed $sd --arrivals off --days 12 --quiet --chooser $m --out /tmp/r_${m}_${sd}.json; done; done
//   npx vite-node scripts/chooser_report.ts -- /tmp
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv.slice(2).filter((a) => a !== '--')[0] ?? '.';
type Run = Record<string, number>;
const runs = new Map<string, Run>();
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
for (const f of readdirSync(dir)) {
  const m = f.match(/^r_(utility|random)_(.+)\.json$/);
  if (!m) continue;
  const d = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const sm = d.samples as { buildingTypes: Record<string, number>; deaths: number; pop: number; homeless: number; meanHunger: number; belowCritical: number; buildings: number }[];
  const last = sm[sm.length - 1];
  const bt = last.buildingTypes;
  const count = (...k: string[]) => k.reduce((n, x) => n + (bt[x] ?? 0), 0);
  runs.set(`${m[1]}|${m[2]}`, {
    workplaces: count('storehouse', 'timber_yard', 'quarry', 'kiln', 'granary', 'hall', 'bakery', 'smithy'),
    solidHomes: count('hut', 'house'),
    buildings: last.buildings,
    deaths: last.deaths,
    people: last.pop,
    homeless: last.homeless,
    hunger: mean(sm.slice(sm.length >> 1).map((x) => x.meanHunger)),
    belowCritical: mean(sm.map((x) => x.belowCritical)),
    firstYardDay: (d.summary.firstBuildingTick.timber_yard ?? 13 * 2400) / 2400,
  });
}
const seeds = [...new Set([...runs.keys()].map((k) => k.split('|')[1]))].filter((s) => runs.has(`utility|${s}`) && runs.has(`random|${s}`)).sort();
console.log(`paired seeds: ${seeds.length} (${seeds.join(', ')})`);
console.log('metric'.padEnd(16), 'utility'.padStart(8), 'random'.padStart(8), 'mean diff'.padStart(10), 'utility higher / lower');
for (const k of Object.keys(runs.get(`utility|${seeds[0]}`)!)) {
  const u = seeds.map((s) => runs.get(`utility|${s}`)![k]);
  const r = seeds.map((s) => runs.get(`random|${s}`)![k]);
  const diffs = u.map((x, i) => x - r[i]);
  console.log(k.padEnd(16), mean(u).toFixed(1).padStart(8), mean(r).toFixed(1).padStart(8), (mean(diffs) >= 0 ? '+' : '') + mean(diffs).toFixed(1).padStart(9), `${diffs.filter((x) => x > 0).length} / ${diffs.filter((x) => x < 0).length}`);
}
