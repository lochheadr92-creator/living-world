import {readFileSync,writeFileSync} from 'node:fs';
import {nightAuditWorld} from './fixtures/night_audit_world';
import {choiceAuditWorld} from './fixtures/choice_audit_world';
import {craftAuditWorld} from './fixtures/craft_audit_world';
import {summaryAuditWorld} from './fixtures/summary_audit_world';
import {runReplay} from '../src/agent/run';
import type {World} from '../src/sim/types';
import type {Transcript} from '../src/agent/transcript';
const cases: [string,()=>World][] = [
 ['f1/manual-transcript.json',nightAuditWorld],
 ['f1/final-build-transcript.json',nightAuditWorld],
 ['f3/manual-transcript.json',choiceAuditWorld],
 ['f2/manual-transcript.json',craftAuditWorld],
 ['f4/manual-transcript.json',summaryAuditWorld],
 ['f5/manual-transcript.json',choiceAuditWorld],
];
const results=cases.map(([file,make])=>{
 const t:Transcript=JSON.parse(readFileSync(`inhabitant_evidence/${file}`,'utf8'));
 const r=runReplay(make(),t);
 if(file==='f1/final-build-transcript.json') {
  const p=r.world.persons.find(p=>p.name==='Ada')!;
  if(p.lastResult?.detail!=='daylight arrived'||!p.lastInteraction) throw new Error('Final night wait lacks actual interaction/daylight outcome');
 }
 return {file,protocol:t.header.protocol,observation:t.header.observationVersion,tick:r.world.tick,warnings:r.warnings};
});
writeFileSync('inhabitant_evidence/final-replays.json',JSON.stringify(results,null,2));
console.log(`${results.length} downloaded browser transcripts replay exactly.`);
