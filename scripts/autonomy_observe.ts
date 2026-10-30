// Fresh fixed-seed ordinary run, or unchanged continuation of a supplied save. No forced choices.
// npx vite-node scripts/autonomy_observe.ts -- --out autonomy_evidence/baseline-r59-forest --seed forest --days 45 --budget 170
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings, type ProfileName } from '../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import { DAY } from '../src/sim/constants';
import { TimeBudget } from './observers/time_budget';
import { ToolDemandTrace } from './observers/tool_demand';
const args = process.argv.slice(2);
const arg = (key: string, fallback = '') => { const i = args.indexOf('--' + key); return i < 0 ? fallback : args[i + 1]; };
const out = arg('out'), days = Number(arg('days', '5')), budget = Number(arg('budget', '170'));
const seed = arg('seed', 'forest'), profile = arg('profile', 'normal') as ProfileName;
if (!out || existsSync(out) || !Number.isFinite(days) || days <= 0 || !Number.isFinite(budget) || budget <= 0) throw new Error('Fresh output, positive days and budget required');
const input = arg('load');
const w = input ? deserializeWorld(readFileSync(input, 'utf8')) : createWorld(currentWorldSettings(profile, seed, { immigration: false }));
const from = w.tick, until = from + Math.round(days * DAY), began = performance.now();
mkdirSync(out, { recursive: true });
const paths = ['src', 'scripts/observers'].flatMap(root => readdirSync(root, { recursive: true }).map(String).filter(p => p.endsWith('.ts')).map(p => root + '/' + p)).concat('scripts/autonomy_observe.ts').sort();
const manifest = () => Object.fromEntries(paths.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const source = manifest();
writeFileSync(out + '/provenance.json', JSON.stringify({ head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), source, settings: w.settings, input: input || null, from, until, budget, sampleEvery: 120 }, null, 2));
const observer = new TimeBudget(), detach = observer.attach(w);
const tools = args.includes('--tools') ? new ToolDemandTrace() : null, detachTools = tools?.attach(w);
let stop = 'horizon', purityChecks = 0;
while (w.tick < until) {
  observer.sampleTick(w);
  if (w.tick % 120 === 0) {
    const before = serializeWorld(w);
    observer.samplePlans(w);
    tools?.sample(w);
    if (serializeWorld(w) !== before) throw new Error('Plan observation mutated saved state or RNG');
    purityChecks++;
  }
  stepWorld(w);
  if (w.tick % 120 === 0 && performance.now() - began >= budget * 1000) { stop = 'budget'; break; }
  if (w.tick % DAY === 0 && !conservationReport(w).ok) { stop = 'conservation'; break; }
}
detachTools?.();detach();
if (JSON.stringify(source) !== JSON.stringify(manifest())) throw new Error('Source changed during run');
const report = { seed: w.settings.seed, settings: w.settings, from, until, tick: w.tick, stop, seconds: (performance.now() - began) / 1000, hash: hashWorld(w), alive: w.persons.filter(p => p.alive).length, carts: w.carts.length, conservation: conservationReport(w), purityChecks, ...observer.report() };
if (Object.values(report.totals).reduce((a,b) => a+b,0) !== report.livingTicks) throw new Error('Time categories do not partition living-person ticks');
writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
writeFileSync(out + '/plan-samples.json', JSON.stringify(observer.planSamples, null, 1));
if(tools)writeFileSync(out+'/tool-demand.json',JSON.stringify({...tools.report(),samples:tools.samples,events:tools.events},null,2));
writeFileSync(out + '/final-save.json', serializeWorld(w));
console.log(JSON.stringify({ seed: report.seed, tick: report.tick, stop, seconds: report.seconds, livingTicks: report.livingTicks, totals: report.totals, samples: report.sampleCounts, carts: report.carts, conservation: report.conservation, purityChecks }, null, 2));
if (stop !== 'horizon') process.exitCode = 1;
