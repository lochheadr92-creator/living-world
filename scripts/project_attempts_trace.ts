// Developer-only ordinary-world diagnostic. No actor, knowledge, resource or choice edits.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import { stepWorld, hashWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { serializeWorld } from '../src/app/save';
import type { Request } from '../src/sim/types';
import {gitProvenance} from './observers/provenance';

const [out, seed] = process.argv.slice(2);
if (!out || !['meadow', 'river', 'forest'].includes(seed) || existsSync(out)) throw new Error('Supply new output and registered seed');
mkdirSync(out, { recursive: true });
const w = createWorld({ ...settingsForProfile('normal', seed, { dynamics: 'rich', immigration: false }), rulesVersion: 39 });
const attempts: any[] = [], requests = new Map<number, Request>();
w.hooks = { onActivityStart(p, a) {
  if (!String(a.data.optKey ?? '').includes(':request:plan:')) return;
  attempts.push({ start: w.tick, person: p.id, name: p.name, helper: a.targetId, activity: a.id,
    key: a.data.optKey, targetActivity: w.byId.get(a.targetId)?.ent === 'person' ? (w.byId.get(a.targetId) as typeof p).activity?.kind ?? null : null,
    lastResult: null, end: null, request: null, timeline: [] });
} };
const started = Date.now();
let stop = 'day 6';
while (w.tick < 6 * DAY) {
  stepWorld(w);
  for (const r of w.requests) if (r.planId) requests.set(r.id, { ...r });
  for (const a of attempts) {
    const p = w.persons.find(p => p.id === a.person);
    if (p && w.tick <= a.start + 500) {
      const c=w.conversations.find(c=>c.a===p.id||c.b===p.id);
      const state={activity:p.activity?.kind??null,conversation:c?{a:c.a,b:c.b,purpose:c.purpose,phase:c.phase}:null,result:p.lastResult&&p.lastResult.tick>=a.start?{...p.lastResult}:null,interaction:p.lastInteraction&&p.lastInteraction.tick>=a.start?{...p.lastInteraction}:null};
      const sig=JSON.stringify(state);
      if(a.lastSignature!==sig){a.timeline.push({tick:w.tick,...state});a.lastSignature=sig;}
    }
    if (a.end === null && p?.activity?.id !== a.activity) {
      a.end = w.tick; a.lastResult = p?.lastResult ? { ...p.lastResult } : null;
      a.nextActivity = p?.activity?.kind ?? null;
    }
    const r = [...requests.values()].find(r => r.from === a.person && r.to === a.helper && r.created >= a.start && r.created < a.start + 700);
    if (r) a.request = { ...r };
  }
  if (w.tick % DAY === 0 && !conservationReport(w).ok) { stop = 'conservation failure'; break; }
  if (w.tick % 240 === 0 && Date.now() - started > 180000) { stop = 'runtime budget'; break; }
}
for(const a of attempts)delete a.lastSignature;
const report = { seed, rules: 39, ticks: w.tick, stop, ...gitProvenance(),
  hash: hashWorld(w), conservation: conservationReport(w), attempts, requests: [...requests.values()], seconds: (Date.now()-started)/1000 };
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${out}/final.json`, serializeWorld(w));
console.log(JSON.stringify(report));
if (stop !== 'day 6') process.exitCode = 1;
