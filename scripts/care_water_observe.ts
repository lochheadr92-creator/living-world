// Fixed fresh five-day water-care occurrence check; no staged supplies or selected actions.
import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport,weightOf} from '../src/sim/economy';
import {CARE_WATER_FAILURE,CARE_BOTH_FAILURE,CARE_PACK_MEMORY} from '../src/sim/care_capacity';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {DAY} from '../src/sim/constants';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/care_water_observe.ts').sort();
const manifest=()=>sourceManifest(files);
const source=manifest(),from=w.tick,until=from+5*DAY,began=performance.now();
const deposits:any[]=[],drinks:any[]=[],starts:any[]=[],endings:Record<string,number>={},recent=new Map<number,any>();
let livingSamples=0,samples=0,offered=0,eligible=0,first=0,pureChecks=0,omitted=0,allStoreStarts=0;
w.hooks={
 onActivityStart:(p,a)=>{
  if(a.kind==='drink'&&a.data.fromStore)allStoreStarts++;
  if(a.data.careWaterStore){if(starts.length<2000)starts.push({tick:w.tick,person:p.id,personName:p.name,recipient:a.data.careRecipient,home:a.targetId,items:{...a.data.items},decision:p.lastDecision,failure:{...p.failures[a.data.careRecipient]}});else omitted++;}
 },
 onActivityEnd:(_p,a,outcome,detail)=>{if(a.data.careWaterStore)endings[outcome+'|'+detail]=(endings[outcome+'|'+detail]??0)+1;},
 onTransfer:t=>{
  if(t.reason!=='deposit')return;const p=w.byId.get(Number(t.from.split(':')[1]));
  if(p?.ent!=='person'||!p.activity?.data.careWaterStore)return;
  const q=w.byId.get(p.activity.data.careRecipient as number);if(q?.ent!=='person')return;
  const row={tick:w.tick,from:p.id,fromName:p.name,to:q.id,toName:q.name,household:p.hhId,home:p.activity.targetId,item:t.item,n:t.n,recipientLoad:weightOf(q.inv),decision:p.lastDecision,failure:{...p.failures[q.id]}};
  if(deposits.length<2000){deposits.push(row);recent.set(q.id,row);}else omitted++;
 }
};
let stop='horizon';
while(w.tick<until){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;livingSamples++;if(!Object.values(p.failures).some(f=>(f.reason===CARE_WATER_FAILURE||f.reason===CARE_BOTH_FAILURE)&&w.tick-f.tick<CARE_PACK_MEMORY))continue;samples++;
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
   if(ctx.options.some(o=>o.key.startsWith('care_water:')))offered++;
   if(ranked.some(o=>o.key.startsWith('care_water:')))eligible++;
   if(ranked[0]?.key.startsWith('care_water:'))first++;
  }
  if(serializeWorld(w)!==before)throw new Error('Observation changed full state/RNG');pureChecks++;
 }
 const eating=w.persons.filter(p=>recent.has(p.id)&&p.activity?.kind==='drink'&&p.activity.data.fromStore).map(p=>({p,a:p.activity!,cycle:p.activity!.cycle,thirst:p.needs.thirst,tick:w.tick,load:weightOf(p.inv)}));
 stepWorld(w);stepWorld(twin);
 for(const e of eating){if(e.a.cycle<=e.cycle)continue;const deposit=recent.get(e.p.id);
  if(deposit&&w.tick-deposit.tick<=DAY&&e.a.targetId===deposit.home&&deposit.item==='water'){
   if(drinks.length<2000)drinks.push({tick:e.tick,person:e.p.id,home:e.a.targetId,item:deposit.item,portions:e.a.cycle-e.cycle,thirstBefore:e.thirst,thirstAfter:e.p.needs.thirst,loadBefore:e.load,loadAfter:weightOf(e.p.inv),depositTick:deposit.tick,donor:deposit.from});else omitted++;
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
const report={...gitProvenance(),seed,initialHash:hash(raw),source,settings:w.settings,from,until,tick:w.tick,stop,seconds:(performance.now()-began)/1000,sampleMeaning:'120-tick living-person samples with their own recent full-pack water failure; not independent opportunities',livingSamples,samples,offered,eligible,first,allStoreStarts,starts,endings,deposits,drinks,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),limits:'Later use is the intended recipient drinking stored water at that home within a day. Fungible units are not individually traced. No counterfactual benefit claim.'};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed:w.settings.seed,from,tick:w.tick,stop,livingSamples,samples,offered,eligible,first,allStoreStarts,starts:starts.length,endings,deposits:deposits.length,laterDrinks:drinks.length,pureChecks,continuationEqual:true,conservation:report.conservation,seconds:report.seconds},null,2));
if(stop!=='horizon')process.exitCode=1;
