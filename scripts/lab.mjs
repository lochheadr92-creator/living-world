// Run the counterfactual lab on every core of this machine, then print the report. Works on Windows, macOS, Linux.
//   node scripts/lab.mjs [--out current_lab_out] [--seeds 8] [--fork 4] [--days 8] [--profile large] [--branches nudge:1,nudge:2,no-wood] [--dynamics rich] [--story meadow]
//     [--arrivals on|off] [--rules N]   (arrivals on by default, as in the app; --rules pins an earlier rich rules version)
//     [--arms parallel|serial]          (parallel: every arm of every seed is its own process, so a three-arm lab takes about one arm's
//                                        time on a machine with the cores; the rows are the ones the serial run writes. Default: parallel
//                                        when --fork is 0 and --branches is given, serial otherwise, because each arm process replays the
//                                        days before the fork.)
// Re-running with the same --out skips seeds that finished, so an interrupted run can be resumed.
// Needs Node 22+ and `npm ci` done. A seed costs about (fork + branches × days) simulated days of CPU.
import { spawn, spawnSync } from 'node:child_process';
import { cpus } from 'node:os';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

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
// both are validated by the guard below before any worker starts
const arrivals = opt('arrivals', 'on');
const pinnedRules = opt('rules', '');
extra.push('--arrivals', arrivals);
if (pinnedRules) extra.push('--rules', pinnedRules);
const all = ['meadow', 'river', 'fern', 'aspen', 'birch', 'cedar', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', ...Array.from({ length: 20 }, (_, i) => `nov-${i + 1}`)];
const seeds = all.slice(0, n);
const cores = Math.max(1, cpus().length);
const vite = join('node_modules', 'vite-node', 'dist', 'cli.mjs');
// Keep the runner plain JavaScript on supported Node releases; the shared TS helper uses the same loader as workers.
const labProvenance = () => {
  const result = spawnSync(process.execPath, [vite, 'scripts/lab/provenance_cli.ts'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Could not capture lab provenance');
  return JSON.parse(result.stdout);
};
const assertLabSourceUnchanged = before => {
  if (JSON.stringify(labProvenance().source) !== JSON.stringify(before.source)) throw new Error('Source changed during lab run; results rejected.');
};
const provenancePath = join(out, 'provenance.json');
// A changed default must never resume old results as if they measured the current simulation - and "both rich" does not mean
// "the same rules", since every generation of the rich rules has carried that one word. The comparison is by rules VERSION
// and lives in scripts/lab/guard.ts, which owns it and can read the version constant. It runs here, before anything is
// created and before any worker starts, and it only reads the existing files. It checks rules, arrivals and generation-comparison setting, not source provenance:
// use a fresh directory after any source revision change.
{
  const guard = spawnSync(process.execPath, [vite, join('scripts', 'lab', 'guard_cli.ts'), '--', '--out', out, '--seeds', seeds.join(','), '--dynamics', dynamics, '--geology-comparison', opt('geology-comparison','no'), '--arrivals', arrivals, ...(pinnedRules ? ['--rules', pinnedRules] : [])], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (guard.status !== 0) process.exit(guard.status ?? 1);
}
// Captured after the guard: a refused directory is refused in one process start, not two (the guard only reads the existing rows).
// New lab directories retain the runner's start snapshot. Legacy directories cannot be relabelled with today's source.
const provenance = labProvenance();
if (existsSync(out)) {
  if (!existsSync(provenancePath) && readdirSync(out).some(f => /^lab_.+\.jsonl$/.test(f)))
    throw new Error('Lab directory has no source provenance; use a fresh output directory.');
  if (existsSync(provenancePath) && JSON.stringify(JSON.parse(readFileSync(provenancePath, 'utf8')).source) !== JSON.stringify(provenance.source))
    throw new Error('Lab source differs from the retained run; use a fresh output directory.');
}
mkdirSync(out, { recursive: true });
if (!existsSync(provenancePath)) writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
// The seed workers and the report are bundled once into plain JavaScript and run from the bundle (esbuild, already a dependency
// of vite). The same TypeScript runs either way and gives the same rows; through vite-node every call across two source files
// goes by way of the loader's module object, and the bundle was measured about a quarter quicker (docs/GROWTH_PLAN.md "Engine speed").
// `--runner vite` runs the workers through vite-node as before; a bundle that fails to build falls back to it and says so.
const runner = opt('runner', 'bundle');
if (runner !== 'bundle' && runner !== 'vite') throw new Error('--runner must be bundle or vite');
const bundles = new Map();
const bundleOf = (script) => {
  if (runner !== 'bundle') return null;
  if (bundles.has(script)) return bundles.get(script);
  const file = join(out, 'bundle', basename(script).replace(/\.ts$/, '.mjs'));
  const built = spawnSync(process.execPath, [join('node_modules', 'esbuild', 'bin', 'esbuild'), script, '--bundle', '--platform=node', '--format=esm', '--target=node22', `--outfile=${file}`, '--log-level=error'], { encoding: 'utf8' });
  const ok = built.status === 0 && existsSync(file);
  if (!ok) console.error(`could not bundle ${script}; running it through vite-node: ${(built.stderr || '').trim()}`);
  bundles.set(script, ok ? file : null);
  return bundles.get(script);
};
const node = (script, rest, stdout) =>
  new Promise((resolve) => {
    const bundle = bundleOf(script);
    const p = spawn(process.execPath, bundle ? [bundle, '--', ...rest] : [vite, script, '--', ...rest], { stdio: ['ignore', stdout ? 'pipe' : 'inherit', 'inherit'] });
    if (stdout) p.stdout.pipe(stdout);
    p.on('exit', (code) => resolve(code));
  });

const geology = opt('geology-comparison', 'no') === 'yes';
const armsMode = opt('arms', opt('fork', '4') === '0' && opt('branches', '') && !geology ? 'parallel' : 'serial');
if (armsMode !== 'parallel' && armsMode !== 'serial') throw new Error('--arms must be parallel or serial');
if (armsMode === 'parallel' && (!opt('branches', '') || geology)) throw new Error('--arms parallel needs --branches and no geology comparison');
const seedDone = (seed) => {
  const path = join(out, `lab_${seed}.jsonl`);
  return existsSync(path) && readFileSync(path, 'utf8').trimEnd().endsWith('"done":true}');
};
let next = 0;
let finished = 0;
let failed = 0;
if (armsMode === 'parallel') {
  // Every arm of every seed is one process. An arm prints its row with its sampled hashes; when a seed's arms are all in, the rows are
  // written to lab_<seed>.jsonl in the serial order (control first), each branch's parting from the control worked out from the two
  // hash lists exactly as runBranch does when it is handed the control's (the first sample that differs, in ticks after the fork),
  // and the hashes dropped. The arm files are scratch and are removed once the seed's file is written.
  const specs = ['control', ...opt('branches', '').split(',').filter((b) => b && b !== 'none')];
  const sample = Number(opt('sample', '120'));
  const armDir = join(out, 'arms');
  mkdirSync(armDir, { recursive: true });
  const armPath = (seed, i) => join(armDir, `lab_${seed}__${i}.jsonl`); // by index: a spec may hold a colon, which a Windows file name cannot
  const armDone = (seed, i) => existsSync(armPath(seed, i)) && readFileSync(armPath(seed, i), 'utf8').trimEnd().endsWith('"done":true}');
  const todo = seeds.filter((s) => !seedDone(s));
  for (const s of seeds) if (!todo.includes(s)) console.log(`seed ${s} already done  [${++finished}/${seeds.length}]`);
  const tasks = todo.flatMap((seed) => specs.map((spec, i) => ({ seed, spec, i }))).filter((t) => !armDone(t.seed, t.i));
  const bad = new Set();
  console.log(`running ${todo.length} seeds x ${specs.length} arms (${tasks.length} processes to run) on ${cores} cores into ${out}/`);
  const merge = (seed) => {
    const rows = specs.map((_, i) => JSON.parse(readFileSync(armPath(seed, i), 'utf8').split(/\r?\n/)[0]));
    const control = rows[0].hashes;
    const lines = rows.map((row, i) => {
      if (i > 0) {
        let parted = null;
        for (let k = 0; k < row.hashes.length; k++) if (control[k] !== row.hashes[k]) { parted = (k + 1) * sample; break; }
        row.divergedAfterTicks = parted;
      }
      delete row.hashes;
      return JSON.stringify(row);
    });
    writeFileSync(join(out, `lab_${seed}.jsonl`), lines.join('\n') + '\n' + JSON.stringify({ seed, done: true }) + '\n');
    for (let i = 0; i < specs.length; i++) rmSync(armPath(seed, i), { force: true });
  };
  let at = 0;
  const armWorker = async () => {
    while (at < tasks.length) {
      const t = tasks[at++];
      const file = createWriteStream(armPath(t.seed, t.i));
      const code = await node('scripts/lab_seed.ts', ['--seed', t.seed, '--arm', t.spec, ...extra.filter((_, k) => extra[k - 1] !== '--branches' && extra[k] !== '--branches')], file);
      await new Promise((r) => file.end(r));
      if (code !== 0) bad.add(t.seed);
      if (specs.every((_, i) => armDone(t.seed, i))) {
        merge(t.seed);
        console.log(`seed ${t.seed} done  [${++finished}/${seeds.length}]`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(cores, tasks.length) }, armWorker));
  for (const seed of todo) if (!seedDone(seed)) {
    if (specs.every((_, i) => armDone(seed, i))) { merge(seed); console.log(`seed ${seed} done  [${++finished}/${seeds.length}]`); }
    else { failed++; console.log(`seed ${seed} FAILED (an arm did not finish)  [${++finished}/${seeds.length}]`); }
  }
  if (!readdirSync(armDir).length) rmSync(armDir, { recursive: true, force: true });
} else console.log(`running ${seeds.length} seeds on ${cores} cores into ${out}/`);
async function worker() {
  while (next < seeds.length) {
    const seed = seeds[next++];
    const path = join(out, `lab_${seed}.jsonl`);
    if (seedDone(seed)) {
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
if (armsMode === 'serial') await Promise.all(Array.from({ length: Math.min(cores, seeds.length) }, worker));
assertLabSourceUnchanged(provenance);
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
