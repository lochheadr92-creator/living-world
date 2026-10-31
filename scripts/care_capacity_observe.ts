// Observe existing personally learned capacity failures -> legal deposit -> later meal, without selecting actions.
import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport,weightOf} from '../src/sim/economy';
import {CARE_PACK_FAILURE,CARE_PACK_MEMORY} from '../src/sim/care_capacity';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {DAY} from '../src/sim/constants';
import type {ItemKind} from '../src/sim/types';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [input,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!input||!out||existsSync(out))throw new Error('Input save and fresh output required');
const raw=readFileSync(input,'utf8'),w=deserializeWorld(raw),twin=deserializeWorld(raw);
if(w.settings.rulesVersion!==CURRENT_RULES_VERSION)throw new Error('Do not reinterpret an older save');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/care_capacity_observe.ts').sort();
const manifest=()=>sourceManifest(files);
const source=manifest(),from=w.tick,until=from+5*DAY,began=performance.now();
const deposits:any[]=[],meals:any[]=[],starts:any[]=[],endings:Record<string,number>={},recent=new Map<number,any>();
let samples=0,offered=0,eligible=0,first=0,pureChecks=0,omitted=0,allStoreStarts=0;
w.hooks={
 onActivityStart:(p,a)=>{
  if(a.kind==='eat_store')allStoreStarts++;
  if(a.data.careStore){if(starts.length<2000)starts.push({tick:w.tick,person:p.id,personName:p.name,recipient:a.data.careRecipient,home:a.targetId,items:{...a.data.items},decision:p.lastDecision,failure:{...p.failures[a.data.careRecipient]}});else omitted++;}
 },
 onActivityEnd:(_p,a,outcome,detail)=>{if(a.data.careStore)endings[outcome+'|'+detail]=(endings[outcome+'|'+detail]??0)+1;},
 onTransfer:t=>{
  if(t.reason!=='deposit')return;const p=w.byId.get(Number(t.from.split(':')[1]));
  if(p?.ent!=='person'||!p.activity?.data.careStore)return;
  const q=w.byId.get(p.activity.data.careRecipient as number);if(q?.ent!=='person')return;
  const row={tick:w.tick,from:p.id,fromName:p.name,to:q.id,toName:q.name,household:p.hhId,home:p.activity.targetId,item:t.item,n:t.n,recipientLoad:weightOf(q.inv),decision:p.lastDecision,failure:{...p.failures[q.id]}};
  if(deposits.length<2000){deposits.push(row);recent.set(q.id,row);}else omitted++;
 }
};
let stop='horizon';
while(w.tick<until){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive||!Object.values(p.failures).some(f=>f.reason===CARE_PACK_FAILURE&&w.tick-f.tick<CARE_PACK_MEMORY))continue;samples++;
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
   if(ctx.options.some(o=>o.key.startsWith('care_store:')))offered++;
   if(ranked.some(o=>o.key.startsWith('care_store:')))eligible++;
   if(ranked[0]?.key.startsWith('care_store:'))first++;
  }
  if(serializeWorld(w)!==before)throw new Error('Observation changed full state/RNG');pureChecks++;
 }
 const eating=w.persons.filter(p=>recent.has(p.id)&&p.activity?.kind==='eat_store'&&p.activity.data.table).map(p=>({p,a:p.activity!,food:p.activity!.data.food as ItemKind,cycle:p.activity!.cycle,hunger:p.needs.hunger,tick:w.tick,load:weightOf(p.inv)}));
 stepWorld(w);stepWorld(twin);
 for(const e of eating){if(e.a.cycle<=e.cycle)continue;const deposit=recent.get(e.p.id);
  if(deposit&&w.tick-deposit.tick<=DAY&&e.a.targetId===deposit.home&&e.food===deposit.item){
   if(meals.length<2000)meals.push({tick:e.tick,person:e.p.id,home:e.a.targetId,item:e.food,portions:e.a.cycle-e.cycle,hungerBefore:e.hunger,hungerAfter:e.p.needs.hunger,loadBefore:e.load,loadAfter:weightOf(e.p.inv),depositTick:deposit.tick,donor:deposit.from});else omitted++;
   recent.delete(e.p.id);
  }
 }
 if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}
 if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
}
delete w.hooks;
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observer altered continuation');
mkdirSync(out,{recursive:true});
const report={...gitProvenance(),input,inputHash:hash(raw),source,settings:w.settings,from,until,tick:w.tick,stop,seconds:(performance.now()-began)/1000,sampleMeaning:'120-tick living-person samples with their own recent full-pack food failure; not independent opportunities',samples,offered,eligible,first,allStoreStarts,starts,endings,deposits,meals,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),limits:'Later meal is the intended recipient eating the same food kind at that home within a day. Fungible units are not individually traced. No counterfactual benefit claim.'};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed:w.settings.seed,from,tick:w.tick,stop,samples,offered,eligible,first,allStoreStarts,starts:starts.length,endings,deposits:deposits.length,laterMeals:meals.length,pureChecks,continuationEqual:true,conservation:report.conservation,seconds:report.seconds},null,2));
if(stop!=='horizon')process.exitCode=1;
