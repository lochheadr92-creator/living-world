// Ensemble gates: does a change leave the world broken? They replace "the state is byte-identical" as the acceptance test for a change
// that is meant to alter behaviour. A gate does not say the world is unchanged; it says its averages are still where a healthy world's are.
//
// Two quite different jobs, kept apart on purpose:
//   CHECKING a run against a baseline (the gate; exit code 1 on a failure)
//     node scripts/lab.mjs --out gate_run --seeds 8 --fork 0 --days 12 --branches none      (control-only runs, from day 0)
//     npx vite-node scripts/gates.ts -- gate_run                        against docs/gates.json, the authored baseline
//     npx vite-node scripts/gates.ts -- gate_run --file docs/gates-rich.json      against some other baseline
//   CREATING a baseline (not a check: it asserts nothing, it only writes down where a world sat)
//     npx vite-node scripts/gates.ts -- gate_run --record --file docs/gates-rich.json
//   `--record` needs an explicit `--file`, and will not overwrite one that exists without `--force`, so the authored baseline
//   cannot be replaced by a run of some other world by accident. A baseline records the world it came from (dynamics, profile,
//   fork day, days, branch, seeds) and a check refuses to compare runs of different worlds.
//
// A metric passes when the run's mean lies within 3 standard errors of the recorded mean, the standard error combining the spread of
// the recorded seeds and of this run's seeds (with a floor so that near-constant counts are not held to an impossible band).
// Every seed must also still have a living population above `minPeople`. A gated metric the baseline never recorded is skipped
// and said so, never silently passed.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { METRICS } from './lab/lab';
import type { BranchResult, Metric } from './lab/lab';
import { mean, sd } from './lab/stats';

const args = process.argv.slice(2).filter((a) => a !== '--');
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--spec') ?? '.';
const record = args.includes('--record');
const force = args.includes('--force');
// `--spec random-choice` gates another branch's rows instead of the control's (to check that the gates can fail)
const spec = args.includes('--spec') ? args[args.indexOf('--spec') + 1] : 'control';
/** the authored baseline, and the default for a check. Recording always needs the destination spelled out. */
const DEFAULT_FILE = 'docs/gates.json';
const FILE = args.includes('--file') ? args[args.indexOf('--file') + 1] : DEFAULT_FILE;
if (record && !args.includes('--file')) {
  console.log(`--record needs an explicit --file <path>: it writes a new baseline, and ${DEFAULT_FILE} is the authored one.`);
  process.exit(1);
}
if (record && existsSync(FILE) && !force) {
  console.log(`${FILE} already exists. Recording would replace a baseline other runs are checked against; pass --force if that is what you mean.`);
  process.exit(1);
}
// `tools` and `meanCondition` are what private plans are for; a rule change that quietly halved the village's tools must not pass.
// A baseline recorded before they existed (docs/gates.json, the authored one) has no band for them: they are then skipped, loudly.
const GATED: Metric[] = ['people', 'deaths', 'workplaces', 'solidHomes', 'buildings', 'plots', 'homeless', 'belowCritical', 'meanHunger', 'tools', 'meanCondition'];
const SD_FLOOR = 0.5;
const MIN_PEOPLE = 50;

type Row = BranchResult & { seed: string; profile: string; fork: number; days: number; dynamics?: 'authored' | 'rich' };
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
// a run made before a metric existed has no value for it; it is neither recorded nor gated
const metrics = METRICS.filter((m) => rows.every((r) => typeof r.outcome[m] === 'number'));
for (const m of metrics) {
  const v = rows.map((r) => r.outcome[m]);
  now[m] = { mean: Math.round(mean(v) * 100) / 100, sd: Math.round(sd(v) * 100) / 100 };
}
// what world these rows came from. A row written before `dynamics` was recorded came from an authored world, which is what the
// lab's default was and still is.
const dynamics = rows[0].dynamics ?? 'authored';
const mixed = rows.some((r) => (r.dynamics ?? 'authored') !== dynamics || r.profile !== rows[0].profile || r.fork !== rows[0].fork || r.days !== rows[0].days);
if (mixed) {
  console.log('the rows in ' + dir + ' come from different experiments (dynamics/profile/fork/days): nothing here is comparable');
  process.exit(1);
}
const header = { dynamics, profile: rows[0].profile, fork: rows[0].fork, days: rows[0].days, branch: spec, n: rows.length };

if (record) {
  writeFileSync(FILE, JSON.stringify({ ...header, recordedFrom: rows.map((r) => r.seed).sort(), metrics: now }, null, 2) + '\n');
  console.log(`recorded ${FILE}: where a ${dynamics} ${header.profile} world sat after ${header.days} days, from ${rows.length} seeds of branch “${spec}”.`);
  console.log('That is a baseline, not a check: nothing was compared, and nothing passed or failed.');
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.log(`${FILE} does not exist: record a baseline for this experiment first (--record --file ${FILE})`);
  process.exit(1);
}
const base = JSON.parse(readFileSync(FILE, 'utf8')) as typeof header & { dynamics?: 'authored' | 'rich'; branch?: string; metrics: typeof now };
const baseDyn = base.dynamics ?? 'authored';
// a gate compares like with like: a rich run checked against the authored baseline would pass or fail for the wrong reason
const differs = [
  baseDyn !== dynamics ? `dynamics ${baseDyn} vs ${dynamics}` : '',
  base.profile !== header.profile ? `profile ${base.profile} vs ${header.profile}` : '',
  base.fork !== header.fork ? `fork day ${base.fork} vs ${header.fork}` : '',
  base.days !== header.days ? `days ${base.days} vs ${header.days}` : '',
  (base.branch ?? 'control') !== spec ? `branch ${base.branch ?? 'control'} vs ${spec}` : '',
].filter(Boolean);
if (differs.length) {
  console.log(`${FILE} was recorded from a different experiment (${differs.join('; ')}). Record a baseline for this one rather than comparing across worlds.`);
  process.exit(1);
}
let failed = 0;
console.log(`gates: ${rows.length} seeds (${dynamics}, ${header.profile}, from day ${header.fork}, ${header.days} days, branch “${spec}”) against ${base.n} recorded in ${FILE}`);
for (const m of GATED) {
  if (!base.metrics[m] || !now[m]) {
    console.log(`  skip  ${m.padEnd(14)} ${!base.metrics[m] ? `not in ${FILE}: re-record the baseline to gate it` : 'not in this run'}`);
    continue;
  }
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
