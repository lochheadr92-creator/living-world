import { readFileSync, writeFileSync } from 'node:fs';
import { choiceAuditWorld } from './fixtures/choice_audit_world';
import { runReplay } from '../src/agent/run';
const transcript = JSON.parse(readFileSync('inhabitant_evidence/f3/manual-transcript.json', 'utf8'));
const result = runReplay(choiceAuditWorld(), transcript);
const p = result.world.persons.find(p => p.name === 'Odette')!;
if (p.inv.fruit !== 2 || p.lastResult?.outcome !== 'success') throw new Error('Selected hunger gathering did not deliver two fruit');
writeFileSync('inhabitant_evidence/f3/replay.json', JSON.stringify({tick:result.world.tick, inventory:p.inv, result:p.lastResult, warnings:result.warnings}, null, 2));
console.log('Manual duplicate-choice transcript replay matched; hunger option delivered two fruit.');
