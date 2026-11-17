import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { conservationReport } from '../../src/sim/economy';
import { ageYears } from '../../src/sim/people';
import { DAY } from '../../src/sim/constants';
import { hashWorld, stepWorld } from '../../src/sim/world';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { statusLine, intentView, provenanceCue, knowledgeItems } from '../../src/sim/inspect_observer';

const out = new URL('./', import.meta.url);
const w = createWorld(currentWorldSettings('normal','meadow',{immigration:true}));
if(w.settings.rulesVersion !== 207) throw Error('Expected rules 207');
const child = w.persons.find(p=>ageYears(w,p)>=7 && ageYears(w,p)<11)!;
if(!child) throw Error('No suitable child');
const adult = w.persons.find(p=>p.hhId===child.hhId && ageYears(w,p)>=16 && ageYears(w,p)<55)!;
if(!adult) throw Error('No adult in child household');
const people=[child,adult];
const rows:any[]=[];
const stats:any=Object.fromEntries(people.map(p=>[p.id,{name:p.name,startAge:ageYears(w,p),ticks:0,awake:0,hungryAwake:0,criticalAwake:0,minHunger:100,activities:{},results:{},labels:{},daily:[]}]));
const snap=(p:any)=>({id:p.id,name:p.name,age:ageYears(w,p),alive:p.alive,health:p.health,needs:{...p.needs},inv:{...p.inv},skills:{...p.skills},hhId:p.hhId,parents:p.parents,children:p.children,partnerId:p.partnerId,position:[p.x,p.y],indoors:p.indoors,activity:p.activity,plans:p.intentions,goal:p.goal,trade:p.trade,stats:p.stats,relations:p.relations,home:w.households.find(h=>h.id===p.hhId),status:statusLine(w,p),intent:intentView(w,p),provenance:provenanceCue(w,p),knowledge:knowledgeItems(w,p,12)});
const initial=structuredClone(people.map(snap));
const signatures=new Map<string,string>();
for(const p of people)for(const k of ['lastDecision','lastResult','log'])signatures.set(p.id+':'+k,JSON.stringify((p as any)[k]));
const logs=new Set<string>();
let pure=true;
const startTick=w.tick;
let lastSaid=Date.now();
while(w.tick<startTick+15*DAY){
  stepWorld(w);
  for(const p of people){
    if(!p.alive)continue;
    const s=stats[p.id];s.ticks++;
    const k=p.convId ? 'conversation' : p.activity?.kind??'none';
    s.activities[k]=(s.activities[k]??0)+1; const label=p.activity?.label??k; s.labels[label]=(s.labels[label]??0)+1;
    s.minHunger=Math.min(s.minHunger,p.needs.hunger);
    if(k!=='sleep'){s.awake++; if(p.needs.hunger<30)s.hungryAwake++;if(p.needs.hunger<10)s.criticalAwake++;}
    for(const key of ['lastDecision','lastResult']){
      const value=(p as any)[key],sig=JSON.stringify(value);
      if(signatures.get(p.id+':'+key)!==sig){
        rows.push({tick:w.tick,id:p.id,kind:key,value});signatures.set(p.id+':'+key,sig);
        if(key==='lastResult'&&value)s.results[value.outcome]=(s.results[value.outcome]??0)+1;
      }
    }
    for(const value of p.log){const key=p.id+JSON.stringify(value);if(!logs.has(key)){logs.add(key);rows.push({tick:w.tick,id:p.id,kind:'log',value});}}
  }
  if((w.tick-startTick)%DAY===0){
    const before=hashWorld(w); const daily=structuredClone(people.map(snap));pure=pure&&before===hashWorld(w);
    daily.forEach(p=>stats[p.id].daily.push({tick:w.tick,age:p.age,health:p.health,needs:p.needs,inv:p.inv,home:p.home,stats:p.stats}));
    rows.push({tick:w.tick,kind:'snapshot',value:daily});
    console.log('day', (w.tick-startTick)/DAY,people.map(p=>`${p.name}: hunger ${p.needs.hunger.toFixed(1)}, health ${p.health.toFixed(1)}, ${p.activity?.label}`).join('; '));
  }
  if(Date.now()-lastSaid>15000){console.log('progress tick',w.tick);lastSaid=Date.now();}
}
const before=hashWorld(w);const final=structuredClone(people.map(snap));pure=pure&&before===hashWorld(w);
const saved=serializeWorld(w);writeFileSync(new URL('world.json',out),saved);
const loaded=deserializeWorld(saved);
let exactContinuation=hashWorld(w)===hashWorld(loaded);
for(let i=0;i<120;i++){stepWorld(w);stepWorld(loaded);exactContinuation=exactContinuation&&hashWorld(w)===hashWorld(loaded);}
writeFileSync(new URL('trace.jsonl',out),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
writeFileSync(new URL('summary.json',out),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),settings:w.settings,startTick,endTick:startTick+15*DAY,selection:'first founder aged 7–10, then first adult aged 16–54 in same household; chosen before stepping',initial,final,stats,conservation:conservationReport(w),observerReadHashUnchanged:pure,exact120TickSaveContinuation:exactContinuation,deaths:w.deceased},null,2));
console.log(JSON.stringify({people:people.map(p=>[p.id,p.name]),observerPure:pure,exactContinuation}));


