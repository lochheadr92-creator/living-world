// Aggregate the output of scripts/novelneed.ts: control against each perturbation, paired by seed.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv.slice(2).filter((a) => a !== '--')[0] ?? '.';
interface Row { seed: string; scenario: string; removed: number; deaths: number; deathCauses: Record<string, number>; pop: number; newBuildings: number; newBuildingTypes: Record<string, number>; newPlots: number; farthestNewBuilding: number; newSettlement: boolean; explores: number; cartHauls: number; pairs: Record<string, number> }
const rows: Row[] = [];
for (const f of readdirSync(dir)) if (/^nn_.*\.jsonl$/.test(f)) for (const l of readFileSync(join(dir, f), 'utf8').split('\n')) if (l.startsWith('{')) rows.push(JSON.parse(l));
const seeds = [...new Set(rows.map((r) => r.seed))].sort();
const get = (seed: string, sc: string) => rows.find((r) => r.seed === seed && r.scenario === sc);
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const complete = seeds.filter((s) => ['control', 'no-wood', 'no-food', 'no-clay'].every((sc) => get(s, sc)));
console.log(`seeds with all four branches: ${complete.length}`);
// every (kind:target) pair any control run ever started
const seenInControl = new Set<string>();
for (const s of complete) for (const k of Object.keys(get(s, 'control')!.pairs)) seenInControl.add(k);
console.log(`activity (kind:target) pairs seen across all control branches: ${seenInControl.size}\n`);
const cols = ['deaths', 'pop', 'newBuildings', 'newPlots', 'farthestNewBuilding', 'explores', 'cartHauls'] as const;
console.log('scenario'.padEnd(10), ...cols.map((c) => c.padStart(20)), 'new settlement'.padStart(16), 'pairs unseen in any control'.padStart(30));
for (const sc of ['control', 'no-wood', 'no-food', 'no-clay']) {
  const rs = complete.map((s) => get(s, sc)!);
  const unseen = new Set<string>();
  for (const r of rs) for (const k of Object.keys(r.pairs)) if (!seenInControl.has(k)) unseen.add(k);
  console.log(
    sc.padEnd(10),
    ...cols.map((c) => mean(rs.map((r) => r[c] as number)).toFixed(1).padStart(20)),
    `${rs.filter((r) => r.newSettlement).length}/${rs.length}`.padStart(16),
    String(unseen.size).padStart(30),
    unseen.size ? [...unseen].slice(0, 6).join(', ') : '',
  );
}
console.log('\nbuildings raised after the fork (all seeds, per type):');
for (const sc of ['control', 'no-wood', 'no-food', 'no-clay']) {
  const t: Record<string, number> = {};
  for (const s of complete) for (const [k, v] of Object.entries(get(s, sc)!.newBuildingTypes)) t[k] = (t[k] ?? 0) + v;
  console.log(sc.padEnd(10), JSON.stringify(t));
}
console.log('\ndeaths by cause (all seeds):');
for (const sc of ['control', 'no-wood', 'no-food', 'no-clay']) {
  const t: Record<string, number> = {};
  for (const s of complete) for (const [k, v] of Object.entries(get(s, sc)!.deathCauses)) t[k] = (t[k] ?? 0) + v;
  console.log(sc.padEnd(10), JSON.stringify(t));
}
