// Unchanged-save continuation; lab hooks only. Observe same-home gifts and later meals without selecting actions.
import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport} from '../src/sim/economy';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {DAY} from '../src/sim/constants';
import type {Person,ItemKind} from '../src/sim/types';
const [input,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!input||!out||existsSync(out))throw new Error('Input save and fresh output required');
const raw=readFileSync(input,'utf8'),w=deserializeWorld(raw),twin=deserializeWorld(raw);
if(w.settings.rulesVersion!==CURRENT_RULES_VERSION)throw new Error('Do not reinterpret an older save; use a current-rules input');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/indoor_giving_observe.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))]));
const source=manifest(),from=w.tick,until=from+5*DAY,began=performance.now();
const receipts:any[]=[],meals:any[]=[],starts:any[]=[],failures:Record<string,number>={},recent=new Map<number,any>();
let samples=0,offered=0,eligible=0,pureChecks=0,omitted=0;
const person=(id:number):Person|undefined=>{const p=w.byId.get(id);return p?.ent==='person'?p:undefined;};
const sameHome=(p:Person,q:Person|undefined)=>!!q&&!!p.indoors&&p.indoors===q.indoors;
w.hooks={
 onActivityStart:(p,a)=>{if(a.kind==='give'){const q=person(a.targetId);starts.push({tick:w.tick,person:p.id,target:a.targetId,home:p.indoors??0,sameHome:sameHome(p,q),mode:a.data.mode,items:a.data.items});}},
 onActivityEnd:(p,a,outcome,detail)=>{if(a.kind==='give'&&outcome!=='success')failures[outcome+'|'+detail]=(failures[outcome+'|'+detail]??0)+1;},
 onTransfer:t=>{
  if(t.reason!=='given')return;
  const p=person(Number(t.from.split(':')[1])),q=person(Number(t.to.split(':')[1]));
  if(!p||!q||!sameHome(p,q))return;
  const row={tick:w.tick,from:p.id,fromName:p.name,to:q.id,toName:q.name,household:p.hhId,home:p.indoors,item:t.item,n:t.n,recipientHeldBefore:(q.inv[t.item]??0)-t.n,hunger:q.needs.hunger,activity:p.activity?.kind,decision:p.lastDecision};
  if(receipts.length<2000){receipts.push(row);recent.set(q.id,row);}else omitted++;
 }
};
let stop='horizon';
while(w.tick<until){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive||!p.indoors)continue;samples++;
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
   if(ctx.options.some(o=>o.kind==='give'&&sameHome(p,person(o.targetId))))offered++;
   if(ranked.some(o=>o.kind==='give'&&sameHome(p,person(o.targetId))))eligible++;
  }
  if(serializeWorld(w)!==before)throw new Error('Observation changed full state/RNG');pureChecks++;
 }
 const eating=w.persons.filter(p=>recent.has(p.id)&&p.activity?.kind==='eat').map(p=>({p,a:p.activity!,food:p.activity!.data.food as ItemKind,cycle:p.activity!.cycle,hunger:p.needs.hunger,tick:w.tick}));
 stepWorld(w);stepWorld(twin);
 for(const e of eating){if(e.a.cycle<=e.cycle)continue;const receipt=recent.get(e.p.id);
  if(receipt&&w.tick-receipt.tick<=DAY&&e.food===receipt.item){
   if(meals.length<2000)meals.push({tick:e.tick,person:e.p.id,home:e.p.indoors??0,item:e.food,portions:e.a.cycle-e.cycle,hungerBefore:e.hunger,hungerAfter:e.p.needs.hunger,receiptTick:receipt.tick,donor:receipt.from});else omitted++;
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
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),input,inputHash:hash(raw),source,settings:w.settings,from,until,tick:w.tick,stop,seconds:(performance.now()-began)/1000,sampleMeaning:'120-tick living indoor-person samples, not independent opportunities',samples,offered,eligible,starts,failures,receipts,meals,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),limits:'Later meal uses the same food kind within a day; fungible units are not individually traced. No counterfactual benefit claim.'};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed:w.settings.seed,from,tick:w.tick,stop,samples,offered,eligible,starts:starts.length,sameHomeStarts:starts.filter(s=>s.sameHome).length,receipts:receipts.length,laterMeals:meals.length,pureChecks,continuationEqual:true,conservation:report.conservation,seconds:report.seconds},null,2));
if(stop!=='horizon')process.exitCode=1;
