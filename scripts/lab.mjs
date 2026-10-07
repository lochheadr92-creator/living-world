// Run the counterfactual lab on every core of this machine, then print the report. Works on Windows, macOS, Linux.
//   node scripts/lab.mjs [--out lab_out] [--seeds 8] [--fork 4] [--days 8] [--profile large] [--branches nudge:1,nudge:2,no-wood] [--story meadow]
// Needs Node 22+ and `npm ci` done. A seed costs about (fork + branches × days) simulated days of CPU.
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const out = opt('out', 'lab_out');
const n = Number(opt('seeds', '8'));
const extra = ['--fork', opt('fork', '4'), '--days', opt('days', '8'), '--profile', opt('profile', 'large')];
if (opt('branches', '')) extra.push('--branches', opt('branches', ''));
const all = ['meadow', 'river', 'fern', 'aspen', 'birch', 'cedar', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', ...Array.from({ length: 20 }, (_, i) => `nov-${i + 1}`)];
const seeds = all.slice(0, n);
const cores = Math.max(1, cpus().length);
mkdirSync(out, { recursive: true });
const vite = join('node_modules', 'vite-node', 'dist', 'cli.mjs');
const node = (script, rest, stdout) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [vite, script, '--', ...rest], { stdio: ['ignore', stdout ? 'pipe' : 'inherit', 'inherit'] });
    if (stdout) p.stdout.pipe(stdout);
    p.on('exit', (code) => resolve(code));
  });

console.log(`running ${seeds.length} seeds on ${cores} cores into ${out}/`);
let next = 0;
let finished = 0;
async function worker() {
  while (next < seeds.length) {
    const seed = seeds[next++];
    const file = createWriteStream(join(out, `lab_${seed}.jsonl`));
    const code = await node('scripts/lab_seed.ts', ['--seed', seed, ...extra], file);
    await new Promise((r) => file.end(r));
    console.log(`seed ${seed} ${code === 0 ? 'done' : 'FAILED (' + code + ')'}  [${++finished}/${seeds.length}]`);
  }
}
await Promise.all(Array.from({ length: Math.min(cores, seeds.length) }, worker));
const reportFile = join(out, 'report.txt');
const report = createWriteStream(reportFile);
await node('scripts/lab_report.ts', [out, ...(opt('story', '') ? ['--story', opt('story', '')] : [])], report);
await new Promise((r) => report.end(r));
console.log('\n' + readFileSync(reportFile, 'utf8'));
console.log(`report saved in ${reportFile}`);
