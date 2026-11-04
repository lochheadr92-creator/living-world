// P0.1a rules bisection runner: 4 rules x 3 seeds, arrivals off, from the frozen 3f65f8c worktree.
import {spawn, execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync, existsSync, createWriteStream} from 'node:fs';
import {join} from 'node:path';

const SRC = 'C:/dev/Claude Experiment/living-world-p01-noarrivals-3f65f8c';
const OUT = 'C:/dev/Claude Experiment/living-world-integrate/p01_evidence/p01a-bisection-noarrivals';
const RULES = [118, 119, 120, 121], SEEDS = ['forest', 'river', 'meadow'];
const DAYS = 25, BUDGET = 5400, CONC = 12;

if (existsSync(OUT)) throw new Error('Output exists: ' + OUT);
mkdirSync(join(OUT, 'logs'), {recursive: true});
const git = (...a) => execFileSync('git', ['-C', SRC, ...a], {encoding: 'utf8'}).trim();
const manifest = {
  step: 'P0.1a rules bisection', plan: 'brain knowledge/living-world/domain-plan-revised',
  source: SRC, commit: git('rev-parse', 'HEAD'), dirtyTracked: git('status', '--porcelain', '--untracked-files=no') !== '',
  node: process.version, observer: 'scripts/household_supply_observe.ts', days: DAYS, budgetSeconds: BUDGET,
  concurrency: CONC, rules: RULES, seeds: SEEDS, arrivals: 'off (observer forces immigration:false at 3f65f8c)',
  crossCheck: 'forest r121 must reproduce 1 alive / 28 deaths (integration121_evidence/longrun-25days-noarrivals); forest r118 compared with Stage 3 21 alive / 10 deaths at 50f2f78',
  started: new Date().toISOString(),
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Forest first so the cross-check and the forest bisection finish earliest.
const jobs = [];
for (const seed of SEEDS) for (const rules of [...RULES].reverse()) jobs.push({seed, rules, name: `${seed}-r${rules}`});
const status = {};
const save = () => writeFileSync(join(OUT, 'status.json'), JSON.stringify(status, null, 2));

const run = job => new Promise(resolve => {
  const started = Date.now();
  status[job.name] = {state: 'running', started: new Date(started).toISOString()};
  save();
  const child = spawn(process.execPath,
    ['node_modules/vite-node/dist/cli.mjs', 'scripts/household_supply_observe.ts', '--',
      job.seed, join(OUT, job.name), String(DAYS), String(BUDGET), String(job.rules)],
    {cwd: SRC, windowsHide: true});
  child.stdout.pipe(createWriteStream(join(OUT, 'logs', job.name + '.stdout.log')));
  child.stderr.pipe(createWriteStream(join(OUT, 'logs', job.name + '.stderr.log')));
  child.on('close', code => {
    status[job.name] = {state: code === 0 ? 'done' : 'failed', exit: code,
      started: status[job.name].started, seconds: Math.round((Date.now() - started) / 1000)};
    save();
    console.log(`${new Date().toISOString()} ${job.name} exit=${code} ${status[job.name].seconds}s`);
    resolve();
  });
});

let next = 0;
const worker = async () => { while (next < jobs.length) await run(jobs[next++]); };
await Promise.all(Array.from({length: CONC}, worker));
manifest.finished = new Date().toISOString();
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const failed = Object.entries(status).filter(([, s]) => s.exit !== 0).map(([n]) => n);
console.log(failed.length ? 'FAILED: ' + failed.join(', ') : 'ALL 12 DONE');
process.exitCode = failed.length ? 1 : 0;
