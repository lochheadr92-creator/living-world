// Ensemble gates: does a change leave the world broken? They replace "the state is byte-identical" as the acceptance test for a change
// that is meant to alter behaviour. A gate does not say the world is unchanged; it says its averages are still where a healthy world's are.
//
//   node scripts/lab.mjs --out gate_run --seeds 8 --fork 0 --days 12 --branches none      (control-only runs, from day 0)
//   npx vite-node scripts/gates.ts -- gate_run                 compare with docs/gates.json (exit code 1 on a failure)
//   npx vite-node scripts/gates.ts -- gate_run --record        write docs/gates.json from this run (do this in the commit that changes rules)
//
// A metric passes when the run's mean lies within 3 standard errors of the recorded mean, the standard error combining the spread of
// the recorded seeds and of this run's seeds (with a floor so that near-constant counts are not held to an impossible band).
// Every seed must also still have a living population above `minPeople`.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { METRICS } from './lab/lab';
import type { BranchResult, Metric } from './lab/lab';
import { mean, sd } from './lab/stats';

const args = process.argv.slice(2).filter((a) => a !== '--');
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--spec') ?? '.';
const record = args.includes('--record');
// `--spec random-choice` gates another branch's rows instead of the control's (to check that the gates can fail)
const spec = args.includes('--spec') ? args[args.indexOf('--spec') + 1] : 'control';
const FILE = 'docs/gates.json';
const GATED: Metric[] = ['people', 'deaths', 'workplaces', 'solidHomes', 'buildings', 'plots', 'homeless', 'belowCritical', 'meanHunger'];
const SD_FLOOR = 0.5;
const MIN_PEOPLE = 50;

type Row = BranchResult & { seed: string; profile: string; fork: number; days: number };
const rows: Row[] = [];
for (const f of readdirSync(dir)) {
  if (!/^lab_.+\.jsonl$/.test(f)) continue;
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as Row;
    if (r.spec === spec) rows.push(r);
  }
}
if (!rows.length) {
  console.log('no rows for ' + spec + ' found in ' + dir);
  process.exit(1);
}
const now = {} as Record<Metric, { mean: number; sd: number }>;
for (const m of METRICS) {
  const v = rows.map((r) => r.outcome[m]);
  now[m] = { mean: Math.round(mean(v) * 100) / 100, sd: Math.round(sd(v) * 100) / 100 };
}
const header = { profile: rows[0].profile, fork: rows[0].fork, days: rows[0].days, n: rows.length };

if (record) {
  writeFileSync(FILE, JSON.stringify({ ...header, recordedFrom: rows.map((r) => r.seed).sort(), metrics: now }, null, 2) + '\n');
  console.log(`recorded ${FILE} from ${rows.length} seeds`);
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.log(`${FILE} does not exist: run once with --record`);
  process.exit(1);
}
const base = JSON.parse(readFileSync(FILE, 'utf8')) as typeof header & { metrics: typeof now };
let failed = 0;
console.log(`gates: ${rows.length} seeds (${header.profile}, from day ${header.fork}, ${header.days} days) against ${base.n} recorded`);
for (const m of GATED) {
  const se = Math.sqrt(Math.max(SD_FLOOR, base.metrics[m].sd) ** 2 / base.n + Math.max(SD_FLOOR, now[m].sd) ** 2 / rows.length);
  const lo = base.metrics[m].mean - 3 * se;
  const hi = base.metrics[m].mean + 3 * se;
  const ok = now[m].mean >= lo && now[m].mean <= hi;
  if (!ok) failed++;
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${m.padEnd(14)} ${now[m].mean.toFixed(1).padStart(7)}   band [${lo.toFixed(1)}, ${hi.toFixed(1)}]   recorded ${base.metrics[m].mean.toFixed(1)}`);
}
const collapsed = rows.filter((r) => r.outcome.people < MIN_PEOPLE);
if (collapsed.length) {
  failed++;
  console.log(`  FAIL  seeds under ${MIN_PEOPLE} people: ${collapsed.map((r) => r.seed + '=' + r.outcome.people).join(', ')}`);
} else console.log(`  pass  every seed keeps at least ${MIN_PEOPLE} people`);
console.log(failed ? `${failed} gate(s) failed` : 'all gates pass');
process.exit(failed ? 1 : 0);
