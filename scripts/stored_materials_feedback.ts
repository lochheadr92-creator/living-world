// Bounded extension of the staged promise run, with no edited needs, stock, trust,
// positions or cooldowns. The acting policy reads only offered actions.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { runLive, runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { conservationReport } from '../src/sim/economy';
import { hashWorld } from '../src/sim/world';

const [input, out] = process.argv.slice(2);
if (!input || !out || existsSync(out)) throw new Error('Recorded staged final state and fresh output required');
mkdirSync(out, { recursive: true });
const start = readFileSync(input, 'utf8'), w = deserializeWorld(start);
const ada = w.persons.find(p => p.name === 'Ada')!;
const until = w.tick + 5000;
writeFileSync(`${out}/prediction.json`, JSON.stringify({ input, staged: true, until,
  prediction: 'Earned trust may change the recipient of a later offered project-material request. Opportunity is not guaranteed.',
  stop: '5000 ticks, no tuning or supplied opportunities; preserve null.' }, null, 2));
const decisions: unknown[] = [], laterOffers: unknown[] = [];
const result = await runLive(w, ada.id, stubModel('stored-materials-later-choice', req => {
  const o = observationFromPrompt(req.user)!;
  const urgent = o.options.find(a => a.need && o.self.needs[a.need as keyof typeof o.self.needs]?.state === 'critical');
  const choice = urgent ?? o.options.find(a => a.key.includes(':request:plan:')) ?? o.options[0];
  decisions.push({ tick: o.time.tick, choice, requests: o.people.requests, plans: o.plans });
  // Record the actual observation after each rewind. An outer World/Person
  // reference would become stale when runLive replaces the replayed world.
  const offered = o.options.filter(a => a.key.includes(':request:plan:'));
  if (offered.length) laterOffers.push({ tick:o.time.tick, offered, relations:o.people.relations });
  return JSON.stringify({ choose: choice.key, why: 'Meet an urgent need; otherwise ask an offered helper for my new plan, or take the first offered action.' });
}), { until });
const replay = runReplay(deserializeWorld(start), result.transcript);
const report = { staged:true, externalModel:false, until, laterOffers, finalRequests:result.world.requests.filter(r=>r.from===ada.id),
  hash:hashWorld(result.world), fullReplayEqual:serializeWorld(replay.world)===serializeWorld(result.world), conservation:conservationReport(result.world) };
for (const [name, data] of Object.entries({start, decisions, transcript:result.transcript, final:serializeWorld(result.world), report}))
  writeFileSync(`${out}/${name}.json`, typeof data==='string'?data:JSON.stringify(data,null,2));
console.log(JSON.stringify(report));
if (!report.fullReplayEqual || !report.conservation.ok) process.exitCode = 1;
