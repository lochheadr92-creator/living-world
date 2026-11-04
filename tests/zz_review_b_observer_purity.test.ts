// REVIEW B (read-only audit): observers not covered by a full-serialization purity test.
import { expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { serializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { describeEntity, describePerson, summarizeWorld, planViews, auditOpportunities } from '../src/sim/inspect';
import { describeCartSections, describeFacility, describeSiteSections, toolViews, commitmentViews, interactionViews, mealViews, grievanceViews, concernViews, workshopProgress } from '../src/sim/inspect_work';
import { projectHistory, civicHistory, householdHistory, relationshipHistory, decisionHistory } from '../src/sim/history';
import { selectedWater } from '../src/sim/inspect_water';
import { selectedFlood } from '../src/sim/inspect_flood';
const REPORT = 'C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/agent_b/observer_report.txt';

function firstDiff(a: unknown, b: unknown, path = ''): string | null {
  if (Object.is(a, b)) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return `${path || '(root)'}: ${JSON.stringify(a)?.slice(0, 160)} vs ${JSON.stringify(b)?.slice(0, 160)}`;
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  if (ka.length !== kb.length) return `${path}: keys ${ka.filter(k=>!kb.includes(k))} | ${kb.filter(k=>!ka.includes(k))}`;
  for (const k of ka) { const d = firstDiff((a as any)[k], (b as any)[k], path ? `${path}.${k}` : k); if (d) return d; }
  return null;
}

it('REVIEW B: every inspector/history view on every entity every 100 ticks leaves the world as its twin', () => {
  const make = () => createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const looked = make(), twin = make();
  const lines: string[] = [];
  let looks = 0;
  for (let t = 0; t < 3000; t++) {
    stepWorld(looked); stepWorld(twin);
    if ((t + 1) % 100 !== 0) continue;
    const before = serializeWorld(looked);
    const steps: [string, () => unknown][] = [
      ['summarizeWorld', () => summarizeWorld(looked)],
      ['describeEntity(all)', () => { for (const id of looked.byId.keys()) describeEntity(looked, id); }],
      ['describePerson(opps)', () => { for (const p of looked.persons) if (p.alive) describePerson(looked, p.id, { opportunities: true }); }],
      ['planViews/auditOpportunities', () => { for (const p of looked.persons) if (p.alive) { planViews(looked, p); auditOpportunities(looked, p); } }],
      ['inspect_work views', () => { for (const p of looked.persons) if (p.alive) { toolViews(looked, p); commitmentViews(looked, p); interactionViews(looked, p); mealViews(looked, p); grievanceViews(looked, p); concernViews(looked, p); workshopProgress(looked, p); } for (const b of looked.buildings) describeFacility(looked, b); for (const s of looked.sites) describeSiteSections(looked, s); for (const c of looked.carts) describeCartSections(looked, c); }],
      ['history', () => { for (const p of looked.persons) if (p.alive) { civicHistory(looked, p); householdHistory(looked, p); relationshipHistory(looked, p); decisionHistory(looked, p); } for (const q of looked.civicProjects ?? []) projectHistory(looked, q); }],
      ['water/flood', () => { for (const p of looked.persons) if (p.alive) { (selectedWater as any)(looked, p); (selectedFlood as any)(looked, p); } }],
    ];
    for (const [name, fn] of steps) {
      const h = hashWorld(looked);
      fn(); looks++;
      const after = serializeWorld(looked);
      if (after !== before) lines.push(`tick ${looked.tick}: ${name} CHANGED the looked-at world: ${firstDiff(JSON.parse(before), JSON.parse(after))}`);
      if (hashWorld(looked) !== h) lines.push(`tick ${looked.tick}: ${name} changed the hash`);
    }
    const a = serializeWorld(looked), b = serializeWorld(twin);
    if (a !== b) { lines.push(`tick ${looked.tick}: looked-at world DRIFTED from twin: ${firstDiff(JSON.parse(a), JSON.parse(b))}`); break; }
  }
  appendFileSync(REPORT, `looks=${looks}\n` + (lines.length ? lines.join('\n') : 'no observer changed saved state; no drift') + '\n');
  expect(lines, lines.join('\n')).toEqual([]);
}, 600_000);
