// Replay a verification bundle exported AFTER choices through the actual manual panel.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { runReplay } from '../src/agent/run';
import { hashWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import type { Transcript } from '../src/agent/transcript';

const [file, out] = process.argv.slice(2);
if (!file || !out || existsSync(out)) throw new Error('Supply the downloaded bundle and a fresh output directory');
const raw = readFileSync(file, 'utf8');
const bundle = JSON.parse(raw) as { staged: boolean; start: string; final: string; transcript: Transcript };
if (!bundle.staged || !bundle.transcript?.end) throw new Error('Expected a staged manual evidence bundle with an end record');
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/bundle.json`, raw);
writeFileSync(`${out}/start.json`, bundle.start);
writeFileSync(`${out}/browser-final.json`, bundle.final);
writeFileSync(`${out}/transcript.json`, JSON.stringify(bundle.transcript, null, 2));
const result = runReplay(deserializeWorld(bundle.start), bundle.transcript);
const final = serializeWorld(result.world);
writeFileSync(`${out}/replay-final.json`, final);
const person = result.world.persons.find(p => p.id === bundle.transcript.header.personId)!;
const requests = result.world.requests.filter(r => r.from === person.id && r.item === 'stone');
const report = {
  staged: true, choices: 'actual rendered manual panel; offered buttons only; no external model',
  protocol: bundle.transcript.header.protocol, observationVersion: bundle.transcript.header.observationVersion,
  tick: result.world.tick, browserHash: bundle.transcript.end.hash, replayHash: hashWorld(result.world),
  fullSerializedEqual: final === bundle.final, outcomes: bundle.transcript.outcomes,
  applied: bundle.transcript.end.applied, rejected: bundle.transcript.end.rejected,
  requests, axe: person.inv.axe ?? 0, plan: person.intentions.find(i => i.makes === 'axe'),
  conservation: conservationReport(result.world),
};
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!report.fullSerializedEqual || report.browserHash !== report.replayHash || !report.conservation.ok || report.axe !== 1
  || !requests.some(r => r.status === 'fulfilled' && r.delivered === 1)
  || !report.outcomes.some(o => /axe/i.test(o.label) && o.outcome === 'success')) process.exitCode = 1;
