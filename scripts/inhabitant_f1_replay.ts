import { readFileSync, writeFileSync } from 'node:fs';
import { nightAuditWorld } from './fixtures/night_audit_world';
import { runReplay } from '../src/agent/run';
const transcript=JSON.parse(readFileSync('inhabitant_evidence/f1/manual-transcript.json','utf8'));
const result=runReplay(nightAuditWorld(),transcript);
const p=result.world.persons.find(p=>p.name==='Ada')!;
if(p.lastResult?.detail!=='daylight arrived'||p.lastResult.outcome!=='success'||!p.lastInteraction) throw new Error('Missing real conversation or daylight result');
writeFileSync('inhabitant_evidence/f1/replay.json',JSON.stringify({tick:result.world.tick,result:p.lastResult,interaction:p.lastInteraction,warnings:result.warnings},null,2));
console.log('Manual transcript replay matched; actual conversation and daylight completion retained.');
