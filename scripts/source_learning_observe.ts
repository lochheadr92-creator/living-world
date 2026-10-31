// Fixed fresh Normal five-day window; actual experience and starts are separate from sampled counterfactual rankings.
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
import {setSourceLearning} from '../src/sim/source_learning';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/source_learning_observe.ts').sort();
const manifest=()=>sourceManifest(files);
const source=manifest(),began=performance.now(),starts:any[]=[],changes:any[]=[],events=new Map<string,any>();
let samples=0,experiencedSamples=0,offered=0,changedTop=0,pureChecks=0,omitted=0,firstChangedSave:string|undefined;
const keep=(arr:any[],row:any)=>{if(arr.length<2000)arr.push(row);else omitted++;};
w.hooks={onActivityStart:(p,a)=>{const because=p.lastDecision?.because??'';if(because.includes('at this source')||because.includes('visit here found no stock'))keep(starts,{tick:w.tick,person:p.id,activity:a.id,key:a.data.optKey,target:a.targetId,because});}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){
 time.sampleTick(w);
 if(w.tick%120===0){const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;samples++;
   const entries=Object.values(p.payoff??{}).flatMap(e=>e.sources??[]);if(!entries.length)continue;experiencedSamples++;
   for(const e of entries)for(const h of e.events)events.set(p.id+'|'+h.activity,{person:p.id,target:e.target,...h});
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);observeInhabitant(w,p,ctx,ranked);
   if(!ranked.some(o=>o.selectionReason?.includes('particular source')||o.selectionReason?.includes('personally found this source empty')))continue;offered++;
   try{setSourceLearning(false);const plain=rankOptions(generateOptions(w,p,true,true));if(plain[0]?.key!==ranked[0]?.key){changedTop++;keep(changes,{tick:w.tick,person:p.id,learned:ranked[0]?.key,plain:plain[0]?.key,reason:ranked[0]?.selectionReason});firstChangedSave??=before;}}finally{setSourceLearning(true);}
  }
  if(serializeWorld(w)!==before)throw new Error('Observer changed full state/RNG');pureChecks++;
 }
 stepWorld(w);stepWorld(twin);
 if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}
 if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
}
detach();delete w.hooks;
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observer changed continuation');
const report={...gitProvenance(),seed,settings:w.settings,initialHash:hash(raw),source,tick:w.tick,stop,seconds:(performance.now()-began)/1000,samples,experiencedSamples,offered,changedTop,starts,changes,events:[...events.values()],omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Repeated 120-tick samples are not independent opportunities. Retained events can be missed between samples. Starts with a source reason establish influence, not that removing it changes that actual start. Sampled ranking changes hold learned history fixed; they are not a long-run counterfactual or benefit measurement.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));if(firstChangedSave)writeFileSync(out+'/first-changed-save.json',firstChangedSave);
console.log(JSON.stringify({seed,stop,tick:w.tick,samples,experiencedSamples,events:events.size,empty:[...events.values()].filter(e=>e.outcome==='empty').length,offered,changedTop,starts:starts.length,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
