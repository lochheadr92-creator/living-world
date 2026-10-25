import { readFileSync, writeFileSync } from 'node:fs';
import { craftAuditWorld } from './fixtures/craft_audit_world';
import { runReplay } from '../src/agent/run';
const transcript=JSON.parse(readFileSync('inhabitant_evidence/f2/manual-transcript.json','utf8'));
const result=runReplay(craftAuditWorld(),transcript), p=result.world.persons[0];
if(p.inv.pick!==1 || (p.inv.wood??0)!==0 || (p.inv.stone??0)!==0) throw new Error('Craft material accounting failed');
writeFileSync('inhabitant_evidence/f2/replay.json',JSON.stringify({tick:result.world.tick,inventory:p.inv,result:p.lastResult,warnings:result.warnings},null,2));
console.log('Manual eating/crafting replay matched with a pick and consumed wood/stone.');
