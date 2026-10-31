// Fixed fresh Normal five-day sample: ordinary preparation, actual endings, bounded plans and exact unobserved twin.
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
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld({...currentWorldSettings('normal',seed),immigration:false}),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/journey_observe.ts').sort();
const manifest=()=>sourceManifest(files);
const source=manifest(),began=performance.now(),starts:any[]=[],endings:any[]=[],plans=new Map<number,any>();
let samples=0,offeredSamples=0,pureChecks=0,omitted=0,startCount=0,endCount=0;
const keep=(arr:any[],row:any)=>{if(arr.length<2000)arr.push(row);else omitted++;};
w.hooks={onActivityStart:(p,a)=>{const i=p.intentions.find(i=>i.status==='active'&&i.journey);if(i){startCount++;keep(starts,{tick:w.tick,person:p.id,activity:a.id,key:a.data.optKey,kind:a.kind,target:a.targetId,plan:i.id,preparation:a.data.journeyId===i.id,work:a.data.optKey===i.journey!.key});}},onActivityEnd:(p,a,outcome,detail)=>{if(a.data.journeyRecorded){endCount++;keep(endings,{tick:w.tick,person:p.id,activity:a.id,kind:a.kind,target:a.targetId,cycle:a.cycle,outcome,detail});}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){
 time.sampleTick(w);
 if(w.tick%120===0){const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;samples++;const ctx=generateOptions(w,p,true,true);observeInhabitant(w,p,ctx,rankOptions(ctx));
   if(ctx.options.some(o=>o.journeyFor))offeredSamples++;
   for(const i of p.intentions)if(i.journey)plans.set(i.id,{person:p.id,name:p.name,...structuredClone(i)});
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
const outcomes:Record<string,number>={};for(const p of plans.values())outcomes[p.status]=(outcomes[p.status]??0)+1;
const report={...gitProvenance(),seed,settings:w.settings,initialHash:hash(raw),source,tick:w.tick,stop,seconds:(performance.now()-began)/1000,samples,offeredSamples,startCount,endCount,starts,endings,plans:[...plans.values()],outcomes,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Repeated 120-tick person samples are not independent opportunities. Starts include unrelated actions taken while a trip intention remains active. Preparation/work flags and actual recorded endings are separate. Completed work trips do not establish downstream use, aggregate welfare, productivity or survival benefit.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed,stop,tick:w.tick,samples,offeredSamples,plans:plans.size,startCount,endCount,outcomes,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
