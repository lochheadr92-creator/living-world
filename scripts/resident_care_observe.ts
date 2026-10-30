// Five predeclared days in a fresh ordinary Normal world. No forced actions or altered needs.
import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport} from '../src/sim/economy';
import {ROOM_CONTACT_MEMORY} from '../src/sim/resident_contact';
import {DAY} from '../src/sim/constants';
import type {ItemKind} from '../src/sim/types';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/resident_care_observe.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))]));
const source=manifest(),from=w.tick,until=from+5*DAY,began=performance.now();
mkdirSync(out,{recursive:true});
const provenance={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),initialHash:hash(raw),source,settings:w.settings,from,until,budgetSeconds:170};
writeFileSync(out+'/provenance.json',JSON.stringify(provenance,null,2));
const starts:any[]=[],transfers:any[]=[],uses:any[]=[],endings:Record<string,number>={},recent=new Map<string,any>();
let livingSamples=0,contactSamples=0,contactPairs=0,offered=0,eligible=0,first=0,pureChecks=0,omitted=0,allGiveStarts=0,careStarts=0,careTransfers=0,laterUses=0;
const retain=(rows:any[],row:any)=>{if(rows.length<2000)rows.push(row);else omitted++;};
w.hooks={
 onActivityStart:(p,a)=>{
  if(a.kind==='give')allGiveStarts++;
  if(!a.data.residentCare)return;careStarts++;
  retain(starts,{tick:w.tick,person:p.id,name:p.name,recipient:a.targetId,activity:a.id,home:a.data.careHome,goal:a.goal,items:{...a.data.items},contact:JSON.parse(JSON.stringify(p.whereabouts[a.targetId]??null))});
 },
 onActivityEnd:(_p,a,outcome,detail)=>{if(a.data.residentCare)endings[outcome+'|'+detail]=(endings[outcome+'|'+detail]??0)+1;},
 onTransfer:t=>{
  if(t.reason!=='given')return;const p=w.byId.get(Number(t.from.split(':')[1])),q=w.byId.get(Number(t.to.split(':')[1]));
  if(p?.ent!=='person'||!p.activity?.data.residentCare||q?.ent!=='person')return;careTransfers++;
  const row={tick:w.tick,from:p.id,fromName:p.name,to:q.id,toName:q.name,activity:p.activity.id,giverInside:p.indoors??0,receiverInside:q.indoors??0,item:t.item,n:t.n};
  retain(transfers,row);recent.set(q.id+':'+t.item,row);
 }
};
let stop='horizon';
while(w.tick<until){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){
   if(!p.alive)continue;livingSamples++;
   const contacts=Object.values(p.whereabouts).filter(wh=>wh.room&&w.tick-wh.tick<=ROOM_CONTACT_MEMORY);
   if(!contacts.length)continue;contactSamples++;contactPairs+=contacts.length;
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),isCare=(key:string)=>key.startsWith('give:')&&key.endsWith(':home');
   if(ctx.options.some(o=>isCare(o.key)))offered++;
   if(ranked.some(o=>isCare(o.key)))eligible++;
   if(ranked[0]&&isCare(ranked[0].key))first++;
  }
  if(serializeWorld(w)!==before)throw new Error('Observation changed full state/RNG');pureChecks++;
  for(const [key,row] of recent)if(w.tick-row.tick>DAY)recent.delete(key);
 }
 const consuming=w.persons.flatMap(p=>{
  const a=p.activity;if(!a||a.phase!=='work')return [];
  const item=a.kind==='eat'?a.data.food as ItemKind:a.kind==='drink'&&a.data.fromInv?'water':null;
  if(!item||!recent.has(p.id+':'+item))return [];
  return [{p,a,item,cycle:a.cycle,need:item==='water'?p.needs.thirst:p.needs.hunger}];
 });
 stepWorld(w);stepWorld(twin);
 for(const e of consuming){
  if(e.a.cycle<=e.cycle)continue;
  const key=e.p.id+':'+e.item,receipt=recent.get(key);
  if(receipt&&w.tick-receipt.tick<=DAY){laterUses++;retain(uses,{tick:w.tick,person:e.p.id,item:e.item,portions:e.a.cycle-e.cycle,needBefore:e.need,needAfter:e.item==='water'?e.p.needs.thirst:e.p.needs.hunger,receiptTick:receipt.tick,donor:receipt.from});recent.delete(key);}
 }
 if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}
}
delete w.hooks;
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observer altered continuation');
const report={...provenance,tick:w.tick,stop,seconds:(performance.now()-began)/1000,sampleMeaning:'120-tick living-person samples; recent room contacts include healthy and currently visible people. Samples are not independent opportunities.',livingSamples,contactSamples,contactPairs,offered,eligible,first,allGiveStarts,careStarts,careTransfers,laterUses,starts,endings,transfers,uses,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),limits:'Later use means the recipient consumes the same item kind from their pack within one day after a hand-over. Fungible units are not individually traced. This short occurrence check does not establish benefit, activation in mature households or population viability.'};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,livingSamples,contactSamples,contactPairs,offered,eligible,first,allGiveStarts,careStarts,careTransfers,laterUses,endings,omitted,pureChecks,continuationEqual:true,conservation:report.conservation},null,2));
if(stop!=='horizon')process.exitCode=1;
