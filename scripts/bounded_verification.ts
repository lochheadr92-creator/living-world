// Natural autonomous observation; no model, commands, staged resources or changed choices.
// npx --no-install vite-node scripts/bounded_verification.ts
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { observeInhabitant } from '../src/agent/observe';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { describePerson } from '../src/sim/inspect';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { toolReport } from '../src/sim/toolreg';
import { hashWorld, stepWorld } from '../src/sim/world';
import { deepEqualState, firstDiffs } from './statediff';

const outArg = process.argv.indexOf('--out');
const out = outArg >= 0 ? process.argv[outArg + 1] : 'verification_evidence/2026-10-26';
if (!out || out.startsWith('--')) throw new Error('--out requires a directory');
if (existsSync(`${out}/report.json`)) throw new Error(`Refusing to overwrite evidence in ${out}; choose a fresh --out directory`);
mkdirSync(out, { recursive: true });
const settings = currentWorldSettings('normal', 'meadow', { immigration: false });
const watched = createWorld(settings);
const control = createWorld(settings);
const id = watched.persons.find(p => p.alive)!.id; // Predeclared: first living founder, no selection for success.
const person = watched.persons.find(p => p.id === id)!;
const initial = { name: person.name, id, health: person.health, needs: { ...person.needs }, inv: { ...person.inv } };
const trace: unknown[] = [];
const checkpoints: unknown[] = [];
const failures: { label: string; diffs: string[] }[] = [];
const activityTicks: Record<string, number> = {};
let previous = '';
let restored: ReturnType<typeof createWorld> | undefined;
let purityChecks = 0;
function equal(a: unknown, b: unknown, label: string): boolean {
  if (deepEqualState(a, b)) return true;
  failures.push({ label, diffs: firstDiffs(a,b,8) });
  return false;
}
for (let t = 0; t <= 2 * DAY; t++) {
  const p = watched.persons.find(q => q.id === id);
  const signature = JSON.stringify([p?.alive, p?.lastDecision, p?.lastResult, p?.lastInteraction, p?.activity?.kind, p?.activity?.phase, p?.convId]);
  if (p?.alive && (signature !== previous || t % 240 === 0)) {
    const before = serializeWorld(watched);
    const ctx = generateOptions(watched, p, true, true);
    const observation = observeInhabitant(watched, p, ctx, rankOptions(ctx));
    describePerson(watched, id, { opportunities: true });
    equal(JSON.parse(before), JSON.parse(serializeWorld(watched)), `observer mutation at ${t}`);
    trace.push({ tick: t, observation });
    purityChecks++;
  }
  previous = signature;
  if (t % 240 === 0 || t === 2 * DAY) {
    const saved = JSON.parse(serializeWorld(watched));
    const exactReplay = equal(saved, JSON.parse(serializeWorld(control)), `unobserved replay at ${t}`);
    const exactSaveContinuation = restored ? equal(saved, JSON.parse(serializeWorld(restored)), `save continuation at ${t}`) : null;
    if (restored && exactSaveContinuation === false && !failures.some(f=>f.label === 'first continuation mismatch saved')) {
      writeFileSync(`${out}/first-mismatch-original.json.gz`, gzipSync(serializeWorld(watched)));
      writeFileSync(`${out}/first-mismatch-restored.json.gz`, gzipSync(serializeWorld(restored)));
      failures.push({label:'first continuation mismatch saved',diffs:[]});
    }
    const ledger = conservationReport(watched), tools = toolReport(watched);
    if (!ledger.ok || !tools.ok) throw new Error(`invariants at ${t}: ${JSON.stringify({ledger,tools})}`);
    checkpoints.push({ tick: t, hash: hashWorld(watched), ledger, tools, exactReplay, exactSaveContinuation });
  }
  if (t === DAY) restored = deserializeWorld(serializeWorld(watched));
  if (t === 2 * DAY) break;
  if (p) { const key = p.alive ? p.activity?.kind ?? (p.convId ? 'conversation' : 'idle') : 'dead'; activityTicks[key] = (activityTicks[key] ?? 0) + 1; }
  stepWorld(watched); stepWorld(control); if (restored) stepWorld(restored);
}
const p = watched.persons.find(q => q.id === id);
const report = { source: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  trackedDiff: execFileSync('git', ['diff', 'HEAD', '--', 'src', 'scripts/bounded_verification.ts'], { encoding: 'utf8' }),
  settings, ticks: 2*DAY, initial,
  final: p ? { alive:p.alive, health:p.health, needs:p.needs, inv:p.inv, lastDecision:p.lastDecision, lastResult:p.lastResult } : null,
  activityTicks, purityChecks, checkpoints, failures, survivors: watched.persons.filter(q=>q.alive).length,
  limits: 'One ordinary seed, two days. Autonomous engine choices; no AI control. Trace exposes personal observations, not a proof of all knowledge provenance or rendered usability. Replay compares every serialized field at 240-tick checkpoints; save/reload occurs at day one. Not an ensemble or long-term civilisation claim.' };
writeFileSync(`${out}/trace.json.gz`, gzipSync(JSON.stringify(trace,null,2)));
writeFileSync(`${out}/report.json`, JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
process.exitCode = failures.length ? 1 : 0;
