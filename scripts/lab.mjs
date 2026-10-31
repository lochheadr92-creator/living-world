// Run the counterfactual lab on every core of this machine, then print the report. Works on Windows, macOS, Linux.
//   node scripts/lab.mjs [--out current_lab_out] [--seeds 8] [--fork 4] [--days 8] [--profile large] [--branches nudge:1,nudge:2,no-wood] [--dynamics rich] [--story meadow]
// Re-running with the same --out skips seeds that finished, so an interrupted run can be resumed.
// Needs Node 22+ and `npm ci` done. A seed costs about (fork + branches × days) simulated days of CPU.
import { spawn, spawnSync } from 'node:child_process';
import { cpus } from 'node:os';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const out = opt('out', 'current_lab_out');
const dynamics = opt('dynamics', 'rich');
if (dynamics !== 'rich' && dynamics !== 'authored' && dynamics !== 'rich-unversioned') {
  throw new Error('--dynamics must be one of rich, authored, rich-unversioned');
}
const n = Number(opt('seeds', '8'));
const extra = ['--fork', opt('fork', '4'), '--days', opt('days', '8'), '--profile', opt('profile', 'large')];
if (opt('branches', '')) extra.push('--branches', opt('branches', ''));
extra.push('--dynamics', dynamics);
if(opt('geology-comparison','no')==='yes')extra.push('--geology-comparison','yes');
const all = ['meadow', 'river', 'fern', 'aspen', 'birch', 'cedar', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', ...Array.from({ length: 20 }, (_, i) => `nov-${i + 1}`)];
const seeds = all.slice(0, n);
const cores = Math.max(1, cpus().length);
const vite = join('node_modules', 'vite-node', 'dist', 'cli.mjs');
// A changed default must never resume old results as if they measured the current simulation - and "both rich" does not mean
// "the same rules", since every generation of the rich rules has carried that one word. The comparison is by rules VERSION
// and lives in scripts/lab/guard.ts, which owns it and can read the version constant. It runs here, before anything is
// created and before any worker starts, and it only reads the existing files. It checks rules and generation-comparison setting, not source provenance:
// use a fresh directory after any source revision change.
{
  const guard = spawnSync(process.execPath, [vite, join('scripts', 'lab', 'guard_cli.ts'), '--', '--out', out, '--seeds', seeds.join(','), '--dynamics', dynamics, '--geology-comparison', opt('geology-comparison','no')], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (guard.status !== 0) process.exit(guard.status ?? 1);
}
mkdirSync(out, { recursive: true });
const node = (script, rest, stdout) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [vite, script, '--', ...rest], { stdio: ['ignore', stdout ? 'pipe' : 'inherit', 'inherit'] });
    if (stdout) p.stdout.pipe(stdout);
    p.on('exit', (code) => resolve(code));
  });

console.log(`running ${seeds.length} seeds on ${cores} cores into ${out}/`);
let next = 0;
let finished = 0;
let failed = 0;
async function worker() {
  while (next < seeds.length) {
    const seed = seeds[next++];
    const path = join(out, `lab_${seed}.jsonl`);
    if (existsSync(path) && readFileSync(path, 'utf8').trimEnd().endsWith('"done":true}')) {
      console.log(`seed ${seed} already done  [${++finished}/${seeds.length}]`);
      continue;
    }
    const file = createWriteStream(path);
    const code = await node('scripts/lab_seed.ts', ['--seed', seed, ...extra], file);
    await new Promise((r) => file.end(r));
    if (code !== 0) failed++;
    console.log(`seed ${seed} ${code === 0 ? 'done' : 'FAILED (' + code + ')'}  [${++finished}/${seeds.length}]`);
  }
}
await Promise.all(Array.from({ length: Math.min(cores, seeds.length) }, worker));
const reportFile = join(out, 'report.txt');
const report = createWriteStream(reportFile);
const reportCode = await node('scripts/lab_report.ts', [out, ...(opt('story', '') ? ['--story', opt('story', '')] : [])], report);
await new Promise((r) => report.end(r));
console.log('\n' + readFileSync(reportFile, 'utf8'));
console.log(`report saved in ${reportFile}`);
// A seed that failed is a measurement that does not exist: the run as a whole must say so to whoever reads only the exit code.
if (failed > 0 || reportCode !== 0) {
  console.error(`lab incomplete: ${failed} of ${seeds.length} seed worker(s) failed${reportCode !== 0 ? ', report exited ' + reportCode : ''}`);
  process.exitCode = 1;
}
