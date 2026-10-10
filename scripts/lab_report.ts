// Aggregate the lab's output: paired differences against the control, against the noise floor, in plain sentences.
//   npx vite-node scripts/lab_report.ts -- lab_out [--story meadow] [--compare rich,rich-stakes-only]
// `--compare a,b` prints the paired difference a - b directly (what a adds to b), instead of each against the reference.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { METRICS } from './lab/lab';
import type { BranchResult, Metric } from './lab/lab';
import { mean, paired, sd, verdict } from './lab/stats';

const args = process.argv.slice(2).filter((a) => a !== '--');
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--story' && args[i - 1] !== '--compare') ?? '.';
const storySeed = args.includes('--story') ? args[args.indexOf('--story') + 1] : null;
const compare = args.includes('--compare') ? args[args.indexOf('--compare') + 1].split(',') : null;

type Row = BranchResult & { seed: string; profile: string; fork: number; days: number };
const bySeed = new Map<string, Map<string, Row>>();
const metas = new Set<string>();
for (const f of readdirSync(dir)) {
  if (!/^lab_.+\.jsonl$/.test(f)) continue;
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as Row;
    if (!r.spec) {
      const m = (r as unknown as { meta?: { commit: string; dirty: boolean } }).meta;
      if (m) metas.add(`${m.commit.slice(0, 7) || 'unknown'}${m.dirty ? '+uncommitted changes' : ''}`);
      continue; // the meta line or the end-of-seed marker
    }
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
// The reference a branch is compared with, per seed: the mean of the control and every nudge branch other than the branch itself. One control
// alone is one draw from a chaotic process: if it happened to be lucky or unlucky, every branch would seem to differ from it the same way.
const refMean = (seed: string, spec: string, m: Metric): number =>
  mean([...bySeed.get(seed)!.values()].filter((r) => (r.spec === 'control' || r.spec.startsWith('nudge')) && r.spec !== spec).map((r) => r.outcome[m]));
const num = (v: number, d = 1) => (Math.abs(v) < 10 ** -d / 2 ? '0' : (v > 0 ? '+' : '') + v.toFixed(d));

console.log(`Counterfactual lab: ${seeds.length} seeds (${seeds.join(', ')}), ${first.profile} profile, forked at day ${first.fork}, run ${first.days} days.`);
console.log(`Made by code: ${metas.size ? [...metas].join(', ') : 'unrecorded (files from before runs recorded their commit)'}${metas.size > 1 ? '  <-- MORE THAN ONE: the seeds were not all made by the same code' : ''}`);
console.log('Every branch starts from the same saved world as its control. Differences are branch − reference, paired by seed; the reference is the mean of the control and the nudge branches (not counting the branch itself).');

// the noise floor: how far a one-draw nudge moves each metric in a single seed
const noise = {} as Record<Metric, number>;
for (const m of METRICS) {
  const d: number[] = [];
  for (const s of seeds) for (const n of nudgeSpecs) {
    const r = bySeed.get(s)!.get(n);
    if (r) d.push(r.outcome[m] - refMean(s, n, m));
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
  const sameState = (a: Row, b: Row) => (a.stateHash && b.stateHash ? a.stateHash === b.stateHash : a.finalHash === b.finalHash);
  const same = rows.filter((r) => sameState(r, ctl(r))).length;
  const parts = rows.map((r) => r.divergedAfterTicks).filter((x): x is number => x !== null);
  console.log(`\n── ${spec}: ${rows[0].summary}  [${rows.length} seeds${rows[0].note ? '; e.g. ' + rows[0].note : ''}]`);
  console.log(`   state identical to control in ${same}/${rows.length} seeds${rows.every((r) => r.stateHash) ? ' (whole serialised world compared)' : ' (compact fingerprint only: older files)'}; parted in ${parts.length}` + (parts.length ? `, median ${(parts.sort((a, b) => a - b)[parts.length >> 1] / 2400).toFixed(2)} days after the fork` : ''));
  console.log('   ' + 'metric'.padEnd(15) + 'reference'.padStart(9) + 'branch'.padStart(8) + 'diff'.padStart(8) + '   95% interval'.padEnd(18) + 'up/down'.padStart(8) + '  verdict');
  for (const m of METRICS) {
    const c = rows.map((r) => refMean(r.seed, r.spec, m));
    const b = rows.map((r) => r.outcome[m]);
    const st = paired(b.map((x, i) => x - c[i]));
    const v = verdict(st, noise[m], same === rows.length);
    console.log(
      '   ' + m.padEnd(15) + mean(c).toFixed(1).padStart(9) + mean(b).toFixed(1).padStart(8) + num(st.meanDiff).padStart(8) +
        `   [${num(st.lo)}, ${num(st.hi)}]`.padEnd(18) + `${st.higher}/${st.lower}`.padStart(8) + '  ' + v,
    );
  }
  // plain sentences for the metrics that moved beyond chance
  const lines: string[] = [];
  for (const m of METRICS) {
    const st = paired(rows.map((r) => r.outcome[m] - refMean(r.seed, r.spec, m)));
    if (verdict(st, noise[m], same === rows.length) !== 'larger than chance') continue;
    lines.push(`${m} ${mean(rows.map((r) => refMean(r.seed, r.spec, m))).toFixed(1)} → ${mean(rows.map((r) => r.outcome[m])).toFixed(1)} (${num(st.meanDiff)}, lower in ${st.lower} and higher in ${st.higher} of ${st.n} seeds)`);
  }
  console.log(same === rows.length ? '   In words: the branch ended in exactly the control\'s state in every seed.' : lines.length ? '   In words: ' + lines.join('; ') + '.' : '   In words: nothing moved by more than a one-draw nudge moves it.');
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

if (compare && compare.length === 2) {
  const [a, b] = compare;
  const pairs = seeds.map((sd) => [bySeed.get(sd)!.get(a), bySeed.get(sd)!.get(b)] as const).filter((x): x is readonly [Row, Row] => !!x[0] && !!x[1]);
  console.log(`\nDirect comparison: ${a} minus ${b}, paired by seed (${pairs.length} seeds)`);
  console.log('   ' + 'metric'.padEnd(15) + b.slice(0, 12).padStart(13) + a.slice(0, 12).padStart(13) + 'diff'.padStart(8) + '   95% interval'.padEnd(18) + 'up/down'.padStart(8) + '  verdict');
  for (const m of METRICS) {
    const xs = pairs.map(([, y]) => y.outcome[m]);
    const ys = pairs.map(([x]) => x.outcome[m]);
    const st = paired(ys.map((v, i) => v - xs[i]));
    console.log('   ' + m.padEnd(15) + mean(xs).toFixed(1).padStart(13) + mean(ys).toFixed(1).padStart(13) + num(st.meanDiff).padStart(8) + `   [${num(st.lo)}, ${num(st.hi)}]`.padEnd(18) + `${st.higher}/${st.lower}`.padStart(8) + '  ' + verdict(st, noise[m], false));
  }
}
