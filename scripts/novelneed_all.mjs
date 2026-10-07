// Run the whole novel-need test (scripts/novelneed.ts) on every core of this machine, then print the report. Works on Windows, macOS, Linux.
//   node scripts/novelneed_all.mjs [--out nn_out] [--seeds 20] [--fork 6] [--days 10]
// Needs Node 22+ and `npm ci` done. Each seed = `fork` simulated days + four branches of `days` days (roughly 13 CPU-minutes a seed).
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const out = opt('out', 'nn_out');
const n = Number(opt('seeds', '20'));
const fork = opt('fork', '6');
const days = opt('days', '10');
const all = ['meadow', 'river', 'fern', 'aspen', 'birch', 'cedar', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', ...Array.from({ length: 20 }, (_, i) => `nov-${i + 1}`)];
const seeds = all.slice(0, n);
const cores = Math.max(1, cpus().length);
mkdirSync(out, { recursive: true });
const vite = join('node_modules', 'vite-node', 'dist', 'cli.mjs');
const node = (script, extra, stdout) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [vite, script, '--', ...extra], { stdio: ['ignore', stdout ? 'pipe' : 'inherit', 'inherit'] });
    if (stdout) p.stdout.pipe(stdout);
    p.on('exit', (code) => resolve(code));
  });

console.log(`running ${seeds.length} seeds on ${cores} cores into ${out}/ (fork day ${fork}, ${days} days per branch)`);
let next = 0;
let finished = 0;
async function worker() {
  while (next < seeds.length) {
    const seed = seeds[next++];
    const file = createWriteStream(join(out, `nn_${seed}.jsonl`));
    const code = await node('scripts/novelneed.ts', ['--seed', seed, '--fork', fork, '--days', days], file);
    await new Promise((r) => file.end(r));
    console.log(`seed ${seed} ${code === 0 ? 'done' : 'FAILED (' + code + ')'}  [${++finished}/${seeds.length}]`);
  }
}
await Promise.all(Array.from({ length: Math.min(cores, seeds.length) }, worker));
const reportFile = join(out, 'report.txt');
const report = createWriteStream(reportFile);
await node('scripts/novelneed_report.ts', [out], report);
await new Promise((r) => report.end(r));
console.log('\n' + readFileSync(reportFile, 'utf8'));
console.log(`report saved in ${reportFile}`);
