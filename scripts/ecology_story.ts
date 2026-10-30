// Reproduce the first recorded ordinary ecology-reason story; fixed rules/seed, no staged choices.
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {conditionAt} from '../src/sim/ecology';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
const out=process.argv.slice(2).filter(a=>a!=='--')[0];if(!out||existsSync(out))throw new Error('Fresh output required');
const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:86}),twin=deserializeWorld(serializeWorld(w)),records:unknown[]=[];
w.hooks={onActivityStart:(p,a)=>{if(p.id===1147&&w.tick>=800)records.push({event:'start',tick:w.tick,kind:a.kind,target:a.targetId,why:a.data.why,inv:{...p.inv}});},onActivityEnd:(p,a,outcome,detail)=>{if(p.id===1147&&w.tick>=800){const s=w.byId.get(a.targetId);records.push({event:'end',tick:w.tick,kind:a.kind,target:a.targetId,cycle:a.cycle,food:a.data.food,outcome,detail,inv:{...p.inv},condition:s?.ent==='source'?conditionAt(w,s.x,s.y):undefined});}}};
while(w.tick<3000){stepWorld(w);stepWorld(twin);}delete w.hooks;if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observer changed the world');const conservation=conservationReport(w);if(!conservation.ok)throw new Error('Conservation failed');
const report={seed:'river',settings:w.settings,person:1147,name:w.persons.find(p=>p.id===1147)?.name,records,conservation,continuationEqual:true,limits:'First recorded source-condition reason in the fixed river run, followed without intervention. Necessity of the condition modifier and aggregate benefit are not established.'};mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({seed:'river',person:1147,records:records.length,continuationEqual:true,conserved:true}));
