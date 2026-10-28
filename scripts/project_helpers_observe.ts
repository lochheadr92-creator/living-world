// Pre-registered occurrence probe; no model/controller, edits to people or score changes.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld, hashWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { serializeWorld } from '../src/app/save';
import { parseIntervention } from './lab/lab';
import type { Request } from '../src/sim/types';

const [out, seed] = process.argv.slice(2);
if (!out || !['meadow', 'river', 'forest'].includes(seed)) throw new Error('Specify a fresh output directory and a registered seed');
if (existsSync(out)) throw new Error('Never overwrite a prior experiment');
mkdirSync(out, { recursive: true });
const sourceFiles = [...readdirSync('src', { recursive: true }).map(String).filter(p => p.endsWith('.ts')).map(p => 'src/' + p), 'scripts/project_helpers_observe.ts', 'scripts/lab/lab.ts'].sort();
const manifest = () => Object.fromEntries(sourceFiles.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const source = manifest();
writeFileSync(`${out}/provenance.json`, JSON.stringify({ head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), source, seed, profile: 'normal', days: 6, immigration: false, runtimeBudgetSeconds: 180, stoppingRule: 'day 6, invariant failure, or runtime budget; no tuning/retry to change a null' }, null, 2));
const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
const choices: unknown[] = [], requests = new Map<number, Request>(), daily: unknown[] = [];
let comparisons = 0, changed = 0, savedExample = false;
w.hooks = { onActivityStart(p, a) {
  const key = String(a.data.optKey ?? '');
  if (!key.includes(':request:plan:')) return;
  const item = key.slice(key.lastIndexOf(':') + 1);
  const before = serializeWorld(w);
  const restore = parseIntervention('rich-no-project-helper-choice').install!();
  let alternative;
  try { alternative = generateOptions(w, p, true, true).options.find(o => o.key.endsWith(':plan:' + item)); }
  finally { restore(); }
  if (serializeWorld(w) !== before) throw new Error('Counterfactual observation changed the world');
  comparisons++;
  const differs = alternative !== undefined && alternative.targetId !== a.targetId;
  if (differs) changed++;
  const row = { tick: w.tick, person: p.id, name: p.name, item, chosen: a.targetId, disabled: alternative?.targetId ?? null, changed: differs, reason: a.data.why, trust: p.relations[a.targetId]?.trust ?? 10, history: (p.relations[a.targetId]?.history ?? []).map(h => ({ ...h })) };
  choices.push(row);
  if (differs && !savedExample) { writeFileSync(`${out}/changed-choice.json`, before); savedExample = true; }
}, onTransfer(t) {
  if (t.reason === 'gift on request') choices.push({ tick: w.tick, kind: 'executed-transfer', ...t });
} };
const started = Date.now();
let stop = 'day 6';
while (w.tick < 6 * DAY) {
  stepWorld(w);
  for (const r of w.requests) if (r.planId) requests.set(r.id, { ...r });
  if (w.tick % DAY === 0) {
    const ledger = conservationReport(w); daily.push({ day: w.tick / DAY, alive: w.persons.filter(p => p.alive).length, comparisons, changed, ledger });
    if (!ledger.ok) { stop = 'conservation failure'; break; }
  }
  if (w.tick % 240 === 0 && Date.now() - started > 180000) { stop = 'runtime budget'; break; }
}
if (JSON.stringify(manifest()) !== JSON.stringify(source)) throw new Error('Source changed during the run');
const results = [...requests.values()];
const report = { seed, profile: 'normal', staged: false, ticks: w.tick, days: w.tick / DAY, stop, seconds: (Date.now() - started) / 1000, comparisons, changed, projectRequests: results.length, outcomes: Object.fromEntries([...new Set(results.map(r => r.status))].map(status => [status, results.filter(r => r.status === status).length])), delivered: results.reduce((n, r) => n + (r.delivered ?? 0), 0), hash: hashWorld(w), conservation: conservationReport(w) };
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${out}/choices.json`, JSON.stringify(choices, null, 2));
writeFileSync(`${out}/requests.json`, JSON.stringify(results, null, 2));
writeFileSync(`${out}/daily.json`, JSON.stringify(daily, null, 2));
writeFileSync(`${out}/final.json`, serializeWorld(w));
console.log(JSON.stringify(report));
if (stop === 'conservation failure') process.exitCode = 1;
