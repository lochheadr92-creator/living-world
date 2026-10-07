// Aggregate the lab's output: paired differences against the control, against the noise floor, in plain sentences.
//   npx vite-node scripts/lab_report.ts -- lab_out [--story meadow]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { METRICS } from './lab/lab';
import type { BranchResult, Metric } from './lab/lab';
import { mean, paired, sd, verdict } from './lab/stats';

const args = process.argv.slice(2).filter((a) => a !== '--');
const dir = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--story') ?? '.';
const storySeed = args.includes('--story') ? args[args.indexOf('--story') + 1] : null;

type Row = BranchResult & { seed: string; profile: string; fork: number; days: number };
const bySeed = new Map<string, Map<string, Row>>();
for (const f of readdirSync(dir)) {
  if (!/^lab_.+\.jsonl$/.test(f)) continue;
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as Row;
    if (!bySeed.has(r.seed)) bySeed.set(r.seed, new Map());
    bySeed.get(r.seed)!.set(r.spec, r);
  }
}
const seeds = [...bySeed.keys()].filter((s) => bySeed.get(s)!.has('control')).sort();
if (!seeds.length) {
  console.log('no lab results found in ' + dir);
  process.exit(0);
}
const first = bySeed.get(seeds[0])!.get('control')!;
const specs = [...new Set(seeds.flatMap((s) => [...bySeed.get(s)!.keys()]))].filter((s) => s !== 'control');
const nudgeSpecs = specs.filter((s) => s.startsWith('nudge'));
const num = (v: number, d = 1) => (Math.abs(v) < 10 ** -d / 2 ? '0' : (v > 0 ? '+' : '') + v.toFixed(d));

console.log(`Counterfactual lab: ${seeds.length} seeds (${seeds.join(', ')}), ${first.profile} profile, forked at day ${first.fork}, run ${first.days} days.`);
console.log('Every branch starts from the same saved world as its control. Differences are branch − control, paired by seed.');

// the noise floor: how far a one-draw nudge moves each metric in a single seed
const noise = {} as Record<Metric, number>;
for (const m of METRICS) {
  const d: number[] = [];
  for (const s of seeds) for (const n of nudgeSpecs) {
    const r = bySeed.get(s)!.get(n);
    if (r) d.push(r.outcome[m] - bySeed.get(s)!.get('control')!.outcome[m]);
  }
  noise[m] = sd(d);
}
console.log('\nNoise floor: spread (sd) of the difference a one-draw nudge makes in one seed, and when it parts from the control');
const nd = nudgeSpecs.flatMap((n) => seeds.map((s) => bySeed.get(s)!.get(n)?.divergedAfterTicks).filter((x): x is number | null => x !== undefined));
const parted = nd.filter((x): x is number => x !== null);
console.log(`  nudge branches parted from the control in ${parted.length}/${nd.length} runs, median ${parted.length ? (parted.sort((a, b) => a - b)[parted.length >> 1] / 2400).toFixed(2) : '-'} days after the fork`);
console.log('  ' + METRICS.map((m) => `${m} ±${noise[m].toFixed(1)}`).join('   '));

for (const spec of specs) {
  const rows = seeds.map((s) => bySeed.get(s)!.get(spec)).filter((r): r is Row => !!r);
  if (!rows.length) continue;
  const ctl = (r: Row) => bySeed.get(r.seed)!.get('control')!;
  const same = rows.filter((r) => r.finalHash === ctl(r).finalHash).length;
  const parts = rows.map((r) => r.divergedAfterTicks).filter((x): x is number => x !== null);
  console.log(`\n── ${spec}: ${rows[0].summary}  [${rows.length} seeds${rows[0].note ? '; e.g. ' + rows[0].note : ''}]`);
  console.log(`   final state identical to control in ${same}/${rows.length} seeds; parted in ${parts.length}` + (parts.length ? `, median ${(parts.sort((a, b) => a - b)[parts.length >> 1] / 2400).toFixed(2)} days after the fork` : ''));
  console.log('   ' + 'metric'.padEnd(15) + 'control'.padStart(8) + 'branch'.padStart(8) + 'diff'.padStart(8) + '   95% interval'.padEnd(18) + 'up/down'.padStart(8) + '  verdict');
  for (const m of METRICS) {
    const c = rows.map((r) => ctl(r).outcome[m]);
    const b = rows.map((r) => r.outcome[m]);
    const st = paired(b.map((x, i) => x - c[i]));
    const v = verdict(st, noise[m], same === rows.length);
    console.log(
      '   ' + m.padEnd(15) + mean(c).toFixed(1).padStart(8) + mean(b).toFixed(1).padStart(8) + num(st.meanDiff).padStart(8) +
        `   [${num(st.lo)}, ${num(st.hi)}]`.padEnd(18) + `${st.higher}/${st.lower}`.padStart(8) + '  ' + v,
    );
  }
  // plain sentences for the metrics that moved beyond chance
  const lines: string[] = [];
  for (const m of METRICS) {
    const st = paired(rows.map((r) => r.outcome[m] - ctl(r).outcome[m]));
    if (verdict(st, noise[m], same === rows.length) !== 'larger than chance') continue;
    lines.push(`${m} ${mean(rows.map((r) => ctl(r).outcome[m])).toFixed(1)} → ${mean(rows.map((r) => r.outcome[m])).toFixed(1)} (${num(st.meanDiff)}, lower in ${st.lower} and higher in ${st.higher} of ${st.n} seeds)`);
  }
  console.log(lines.length ? '   In words: ' + lines.join('; ') + '.' : '   In words: nothing moved by more than a one-draw nudge moves it.');
}

if (storySeed) {
  const rows = bySeed.get(storySeed);
  if (!rows) console.log(`\nno results for seed ${storySeed}`);
  else {
    console.log(`\nStory of seed ${storySeed}: day after the fork on which each kind of building was first raised, and people alive on days 1, 4, 8`);
    const types = [...new Set([...rows.values()].flatMap((r) => Object.keys(r.milestones)))].sort();
    console.log('   ' + 'branch'.padEnd(16) + types.map((t) => t.slice(0, 6).padStart(7)).join('') + '   pop d1/d4/d8');
    for (const [spec, r] of [['control', rows.get('control')!] as const, ...[...rows.entries()].filter(([k]) => k !== 'control')]) {
      console.log('   ' + spec.padEnd(16) + types.map((t) => (r.milestones[t] === undefined ? '-' : r.milestones[t].toFixed(1)).padStart(7)).join('') + '   ' + [0, 3, 7].map((i) => r.popByDay[i] ?? '-').join('/'));
    }
  }
}
