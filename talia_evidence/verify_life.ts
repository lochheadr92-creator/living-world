import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {stepWorld,hashWorld} from '../src/sim/world';
import {runReplay} from '../src/agent/run';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const path=process.argv[2]??'talia_evidence/final-transcript.json';
const t=JSON.parse(readFileSync(path,'utf8'));
function replay(){const w=createWorld(t.header.settings);while(w.tick<t.header.startTick)stepWorld(w);return runReplay(w,t);}
const a=replay(),b=replay();const save=serializeWorld(a.world),copy=deserializeWorld(save);
if(save!==serializeWorld(b.world)||save!==serializeWorld(copy))throw new Error('Save/replay equality failed');
const p=a.world.persons.find(p=>p.id===t.header.personId)!;
const summary={source:t.header.sim,settings:t.header.settings,start:t.header.startTick,end:t.end,calls:t.calls.length,applied:t.calls.filter((c:any)=>c.result?.status==='applied').length,outcomes:t.outcomes,hash:hashWorld(a.world),warnings:a.warnings,saveSHA256:createHash('sha256').update(save).digest('hex'),exactIndependentReplays:true,exactSaveRoundtrip:true,conservation:conservationReport(a.world),person:structuredClone({name:p.name,health:p.health,needs:p.needs,skills:p.skills,inventory:p.inv,relations:p.relations,mood:p.mood}),continued:false};
for(let i=0;i<120;i++){stepWorld(a.world);stepWorld(copy);}summary.continued=serializeWorld(a.world)===serializeWorld(copy);
if(!summary.continued)throw new Error('Saved continuation differed');
writeFileSync(path.replace('.json','-verified.json'),JSON.stringify(summary,null,2));
writeFileSync(path.replace('.json','-world.json'),save);
console.log(JSON.stringify({calls:summary.calls,hash:summary.hash,conservation:summary.conservation.ok,continued:summary.continued}));
