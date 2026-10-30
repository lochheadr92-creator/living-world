// Fixed five-day ordinary scope decisions, physical endings and exclusive occupancy, with an unobserved twin.
import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {conservationReport} from '../src/sim/economy';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {DAY} from '../src/sim/constants';
import {TimeBudget} from './observers/time_budget';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/scope_observe.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))]));
const source=manifest(),began=performance.now(),starts:any[]=[],endings:any[]=[],narrowed:any[]=[];
let samples=0,offeredSamples=0,narrowedSamples=0,blockedSamples=0,pureChecks=0,omitted=0,startCount=0,endCount=0;
const keep=(arr:any[],row:any)=>{if(arr.length<2000)arr.push(row);else omitted++;};
w.hooks={onActivityStart:(p,a)=>{if(a.data.workScope){startCount++;keep(starts,{tick:w.tick,person:p.id,activity:a.id,key:a.data.optKey,kind:a.kind,target:a.targetId,scope:a.data.workScope,limit:a.data.limit});}},onActivityEnd:(p,a,outcome,detail)=>{if(a.data.workScope){endCount++;keep(endings,{tick:w.tick,person:p.id,activity:a.id,kind:a.kind,target:a.targetId,cycle:a.cycle,progress:a.progress,outcome,detail,scope:a.data.workScope});}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){
 time.sampleTick(w);
 if(w.tick%120===0){const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;samples++;const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);observeInhabitant(w,p,ctx,ranked);
   const offers=ranked.filter(o=>o.scopeEstimate&&o.bounds?.length);if(offers.length)offeredSamples++;
   const changed=offers.filter(o=>o.bounds!.some(b=>b.max<(o.scopeEstimate!.amount??o.scopeEstimate!.work)));if(changed.length){narrowedSamples++;keep(narrowed,{tick:w.tick,person:p.id,options:changed.map(o=>({key:o.key,bounds:o.bounds,reason:o.selectionReason}))});}
   if(ctx.blocked.some(o=>o.blocked?.startsWith('not enough estimated time')))blockedSamples++;
  }
  if(serializeWorld(w)!==before)throw new Error('Observer changed state/RNG');pureChecks++;
 }
 stepWorld(w);stepWorld(twin);
 if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}
}
detach();delete w.hooks;
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observer changed continuation');
const timeBudget=time.report();if(Object.values(timeBudget.totals).reduce((a,b)=>a+b,0)!==timeBudget.livingTicks)throw new Error('Invalid occupancy partition');
const outcomes:Record<string,number>={};for(const e of endings)outcomes[e.outcome]=(outcomes[e.outcome]??0)+1;
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,initialHash:hash(raw),source,tick:w.tick,stop,seconds:(performance.now()-began)/1000,samples,offeredSamples,narrowedSamples,blockedSamples,startCount,endCount,starts,endings,narrowed,outcomes,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget,limits:'Samples are repeated 120-tick living-person observations, not independent opportunities. Actual starts/endings are separate. Successful quantity collection is not subsequent use or duty completion. Partial work spells preserve progress. No aggregate benefit claim.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed,stop,tick:w.tick,samples,offeredSamples,narrowedSamples,blockedSamples,startCount,endCount,outcomes,omitted,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));
if(stop!=='horizon')process.exitCode=1;
