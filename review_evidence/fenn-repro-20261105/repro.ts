// REPRODUCTION of the 30-day investigation's Fenn window (Large life-stages-6, rules 153 pinned, arrivals on, harsh off).
// Read-only hooks. Records, for Fenn (id 4044) and his mother Ines, every activity start/end from tick 52000 with packs and
// needs, Ines's recorded set-aside options at each of her decisions, and pack snapshots at the failed hand-over.
// Usage: vite-node <this> <rules> <endTick> <out.json>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport,weightOf} from '../../src/sim/economy';
import {ageYears,carryCap,stageOf} from '../../src/sim/people';
import type {Person} from '../../src/sim/types';
const [rulesArg='153',endArg='57000',out='fenn-repro.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('large','life-stages-6'),rulesVersion:Number(rulesArg)});
const twin=deserializeWorld(serializeWorld(w));
const FENN=4044;const fenn=()=>w.persons.find(p=>p.id===FENN);
const weights=Object.fromEntries(['berries','fruit','fish','grain','bread','wood','stone','seeds','water'].map(k=>[k,weightOf({[k]:1} as never)]));
const snap=(p:Person)=>({id:p.id,name:p.name,stage:stageOf(w,p),age:+ageYears(w,p).toFixed(2),inv:{...p.inv},weight:weightOf(p.inv),cap:carryCap(w,p),hunger:Math.round(p.needs.hunger),thirst:Math.round(p.needs.thirst),x:+p.x.toFixed(1),y:+p.y.toFixed(1)});
const ev:unknown[]=[];let inesId=0;
const isFam=(p:Person)=>p.id===FENN||p.id===inesId;
w.hooks={
 onActivityStart(p,a){if(w.tick<52000||!isFam(p))return;
  ev.push({tick:w.tick,who:p.name,kind:'start',activity:a.kind,label:a.label,why:String(a.data.why??'').slice(0,160),me:snap(p),setAside:(p.lastDecision?.blocked??[]).slice(0,6).map(b=>`${b.label}: ${b.blocked}`)});},
 onActivityEnd(p,a,outcome,detail){if(w.tick<52000||!isFam(p))return;
  ev.push({tick:w.tick,who:p.name,kind:'end',activity:a.kind,label:a.label,outcome,detail,inv:{...p.inv}});},
};
const f0=fenn();if(!f0)throw Error('Fenn absent from this world');
inesId=(w.persons.find(p=>p.name==='Ines'&&p.relations[FENN]?.kin==='child')??w.persons.find(p=>p.name==='Ines'))!.id;
let died:number|null=null,homeFood:unknown[]=[];
while(w.tick<Number(endArg)){stepWorld(w);stepWorld(twin);
 if(w.tick>=52000&&w.tick%300===0){const f=fenn(),i=w.persons.find(p=>p.id===inesId);const hh=f?w.households.find(h=>h.id===f.hhId):undefined;
  const home=hh?w.buildings.find(b=>b.hhId===hh.id&&b.condition>0):undefined;
  homeFood.push({tick:w.tick,fenn:f?snap(f):null,ines:i?snap(i):null,homeItems:home?{...(((home as any).store?.items)??((home as any).items)??{})}:null,homeId:home?.id??null,homeDist:home&&f?+Math.hypot(home.x-f.x,home.y-f.y).toFixed(1):null});}
 if(died===null&&!fenn()){died=w.tick;break;}}
const d=w.deceased.find(x=>x.id===FENN);
writeFileSync(out,JSON.stringify({rules:Number(rulesArg),weights,inesId,died,cause:d?.cause??null,exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,tick:w.tick,events:ev,samples:homeFood},null,1));
console.log(JSON.stringify({rules:rulesArg,inesId,died,cause:d?.cause,tick:w.tick,events:ev.length}));
