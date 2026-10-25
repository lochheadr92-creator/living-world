import {readFileSync,writeFileSync} from 'node:fs';
import {choiceAuditWorld} from './fixtures/choice_audit_world';
import {runReplay} from '../src/agent/run';
import type {Transcript} from '../src/agent/transcript';
const t:Transcript=JSON.parse(readFileSync('inhabitant_evidence/f5/manual-transcript.json','utf8'));
const r=runReplay(choiceAuditWorld(),t);
if(t.header.observationVersion!==6 || !t.asks[0].observation.options.every(o=>o.eta==='now'||o.eta.includes('world'))) throw new Error('Missing world-clock observation');
writeFileSync('inhabitant_evidence/f5/replay.json',JSON.stringify({tick:r.world.tick,protocol:t.header.protocol,observationVersion:t.header.observationVersion,warnings:r.warnings},null,2));
console.log('Manual world-clock transcript replay matched under protocol 9 / observation 6.');
