// Bounded autonomous audit, not an ensemble or an acceptance threshold.
// No simulation input changes: hooks count actual starts, sampling reads existing state.
// Usage: npx vite-node scripts/audit_rules28.ts -- normal river 8 output.json
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings, type ProfileName } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { DAY, isSolidHome } from '../src/sim/constants';
import { stepWorld, hashWorld } from '../src/sim/world';
import { conservationReport, foodUnits } from '../src/sim/economy';
import { toolReport } from '../src/sim/toolreg';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson } from '../src/sim/inspect';
import { stageOf } from '../src/sim/people';
import { relocationDestination } from '../src/sim/relocation';
import { civilisationOutcome } from './lab/civilisation';

const [profile = 'normal', seed = 'river', daysArg = '8', output] = process.argv.slice(2).filter(a => a !== '--');
if (!['normal', 'large', 'town', 'huge'].includes(profile) || !output) throw new Error('profile seed days output.json required');
const days = Number(daysArg);
if (!Number.isFinite(days) || days <= 0 || days > 8) throw new Error('Bounded audit requires 0 < days <= 8');
if (Number(CURRENT_RULES_VERSION) !== 28) throw new Error('This audit is pinned to rules 28; declare a new audit for later rules');
const w = createWorld(currentWorldSettings(profile as ProfileName, seed, { immigration: false }));
const starts: Record<string, number> = {};
const relocationSteps: Record<string, number> = {};
const startedProjects = new Set<number>(), finishedProjects = new Set<number>(), failedProjects = new Set<number>();
const startedRelocations = new Set<number>(), settledRelocations = new Set<number>();
const startedJourneys = new Set<number>(), completedJourneys = new Set<number>();
const hunger = { personTicks: 0, below14: 0 };
const exposure = { adultSamples: 0, sustainedHardship: 0, hardshipWithDestination: 0, hardshipWithDestinationAndHouseholdPresent: 0, tradeLeadHolderSamples: 0 };
const invariantFailures: unknown[] = [];
const checkpoints: unknown[] = [];
w.hooks = { onActivityStart: (_p, a) => {
  starts[a.kind] = (starts[a.kind] ?? 0) + 1;
  if (a.kind === 'relocate') relocationSteps[a.data.step] = (relocationSteps[a.data.step] ?? 0) + 1;
} };
const started = performance.now();
while (w.tick < days * DAY) {
  stepWorld(w);
  for (const p of w.persons) {
    hunger.personTicks++; if (p.needs.hunger < 14) hunger.below14++;
    for (const j of p.exchangeJourneys ?? []) { startedJourneys.add(j.id); if (j.status === 'fulfilled') completedJourneys.add(j.id); }
  }
  for (const q of w.civicProjects ?? []) {
    startedProjects.add(q.id);
    if (q.status === 'completed') finishedProjects.add(q.id);
    if (q.status === 'failed') failedProjects.add(q.id);
  }
  for (const h of w.households) for (const r of h.relocations ?? []) {
    startedRelocations.add(r.id); if (r.phase === 'settled') settledRelocations.add(r.id);
  }
  if (w.tick % 120 === 0) for (const p of w.persons) {
    if (p.tradeLeads?.length) exposure.tradeLeadHolderSamples++;
    if (stageOf(w, p) !== 'adult') continue;
    exposure.adultSamples++;
    if (p.relocationHardship === undefined || w.tick - p.relocationHardship < DAY) continue;
    exposure.sustainedHardship++;
    if (!relocationDestination(w, p)) continue;
    exposure.hardshipWithDestination++;
    const members = w.persons.filter(q => q.hhId === p.hhId);
    if (!p.indoors && members.every(q => q.alive && !q.indoors && !q.convId && q.pose !== 'sleep' && Math.hypot(q.x-p.x, q.y-p.y) <= 3)) exposure.hardshipWithDestinationAndHouseholdPresent++;
  }
  if (w.tick % DAY === 0 || w.tick >= days * DAY) {
    const ledger = conservationReport(w), tools = toolReport(w);
    if (!ledger.ok || !tools.ok) invariantFailures.push({ tick: w.tick, ledger, tools });
    checkpoints.push({ tick: w.tick, alive: w.persons.length, deaths: w.deceased.length, solidHomes: w.buildings.filter(b => isSolidHome(b.type)).length, storedFood: w.buildings.reduce((n,b) => n+foodUnits(b.store.items),0), metrics: civilisationOutcome(w,0) });
  }
}
const simulationMs = performance.now() - started;
const projectDetails = structuredClone((w.civicProjects ?? []).map(q => ({ ...q, site: w.sites.find(s => s.id === q.siteId) })));
const saved = serializeWorld(w);
const beforeQueries = serializeWorld(w);
for (const p of w.persons) describePerson(w, p.id, { opportunities: true });
civilisationOutcome(w, 0);
const observerPure = serializeWorld(w) === beforeQueries;
const loaded = deserializeWorld(saved);
const roundtripEqual = serializeWorld(loaded) === saved;
const untouched = deserializeWorld(saved);
for (let i=0; i<120; i++) { stepWorld(w); stepWorld(loaded); stepWorld(untouched); }
const continuationEqual = serializeWorld(w) === serializeWorld(loaded) && serializeWorld(loaded) === serializeWorld(untouched);
const report = {
  source: execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8' }).trim(), rules: CURRENT_RULES_VERSION,
  classification: 'bounded autonomous observation; sample exposures are person-samples, not decisions; no aggregate or generational claim',
  settings: w.settings, seed, profile, days, endTick: days * DAY, continuationTicks:120,
  observed: { projects: startedProjects.size, projectsCompleted: finishedProjects.size, projectsFailed: failedProjects.size, relocationProposals: startedRelocations.size, relocationsSettled: settledRelocations.size, exchangeJourneys: startedJourneys.size, exchangeCompleted: completedJourneys.size },
  starts, relocationSteps, exposure, hunger, checkpoints, projectDetails,
  integrity: { invariantFailures, observerPure, roundtripEqual, continuationEqual, continuationHash: hashWorld(w) },
  performance: { simulationMs, meanMsPerTick: simulationMs/(days*DAY), saveBytes: Buffer.byteLength(saved), heapBytes:process.memoryUsage().heapUsed, note:'includes audit collection overhead; heap includes runtime and continuation copies' },
};
writeFileSync(output, JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify({ output, observed:report.observed, integrity:report.integrity, exposure }));
if (invariantFailures.length || !observerPure || !roundtripEqual || !continuationEqual) process.exitCode = 1;
