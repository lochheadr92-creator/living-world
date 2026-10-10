// Run the counterfactual lab on every core of this machine, then print the report. Works on Windows, macOS, Linux.
//   node scripts/lab.mjs [--out lab_out] [--seeds 8] [--fork 4] [--days 8] [--profile large] [--branches nudge:1,nudge:2,no-wood] [--dynamics rich] [--story meadow]
// Re-running with the same --out skips seeds that finished, so an interrupted run can be resumed.
// Needs Node 22+ and `npm ci` done. A seed costs about (fork + branches × days) simulated days of CPU.
import { execSync, spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
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
if (opt('dynamics', '')) extra.push('--dynamics', opt('dynamics', ''));
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

// A seed is skipped only if its file is complete AND says it was made by this commit, with these settings (a file from other code or other
// settings is run again, and so is any file when the working tree has uncommitted changes to tracked files).
const gitOut = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const commit = gitOut('git rev-parse HEAD');
const dirty = gitOut('git status --porcelain --untracked-files=no') !== '';
const want = { fork: Number(opt('fork', '4')), days: Number(opt('days', '8')), profile: opt('profile', 'large'), dynamics: opt('dynamics', 'authored') };
const wantBranches = opt('branches', '');
function isCurrent(path, seed) {
  const text = readFileSync(path, 'utf8').trimEnd();
  if (!text.endsWith('"done":true}')) return false;
  let meta;
  try {
    meta = JSON.parse(text.split('\n')[0]).meta;
  } catch {
    return false;
  }
  if (!meta || !commit || dirty || meta.dirty || meta.commit !== commit || meta.seed !== seed) return false;
  if (meta.fork !== want.fork || meta.days !== want.days || meta.profile !== want.profile || meta.dynamics !== want.dynamics) return false;
  return !wantBranches || meta.branches.join(',') === wantBranches.split(',').filter((b) => b && b !== 'none').join(',');
}

console.log(`running ${seeds.length} seeds on ${cores} cores into ${out}/`);
let next = 0;
let finished = 0;
async function worker() {
  while (next < seeds.length) {
    const seed = seeds[next++];
    const path = join(out, `lab_${seed}.jsonl`);
    if (existsSync(path) && isCurrent(path, seed)) {
      console.log(`seed ${seed} already done  [${++finished}/${seeds.length}]`);
      continue;
    }
    const file = createWriteStream(path);
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
