// Fixed fresh five-day ordinary occurrence and time budget. No staged practice, clock changes or selected actions.
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
import {setRoutines} from '../src/sim/daily_routines';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/routine_observe.ts').sort();
const manifest=()=>sourceManifest(files);
const source=manifest(),from=w.tick,until=from+5*DAY,began=performance.now(),starts:any[]=[],changes:any[]=[],learned=new Set<string>();
let samples=0,experiencedSamples=0,offered=0,changedTop=0,pureChecks=0,omitted=0;
w.hooks={onActivityStart:(p,a)=>{if(p.lastDecision?.because.includes('learned ')&&p.lastDecision.because.includes('preference:')){if(starts.length<2000)starts.push({tick:w.tick,person:p.id,key:a.data.optKey,target:a.targetId,because:p.lastDecision.because});else omitted++;}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<until){
 time.sampleTick(w);
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;samples++;if(!p.dailyRoutines?.entries.length)continue;experiencedSamples++;
   for(const e of p.dailyRoutines.entries)if(e.episodes.length>=3)learned.add(p.id+'|'+e.key+'|'+e.target+'|'+e.phase+'|'+JSON.stringify(e.context));
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);observeInhabitant(w,p,ctx,ranked);
   if(!ranked.some(o=>o.routineReason))continue;offered++;
   try{setRoutines(false);const plain=rankOptions(generateOptions(w,p,true,true));if(plain[0]?.key!==ranked[0]?.key){changedTop++;if(changes.length<2000)changes.push({tick:w.tick,person:p.id,learned:ranked[0]?.key,plain:plain[0]?.key,reason:ranked[0]?.routineReason});else omitted++;}}finally{setRoutines(true);}
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
const timeBudget=time.report();if(Object.values(timeBudget.totals).reduce((a,b)=>a+b,0)!==timeBudget.livingTicks)throw new Error('Time partition failed');
mkdirSync(out,{recursive:true});
const report={...gitProvenance(),seed,initialHash:hash(raw),source,settings:w.settings,from,until,tick:w.tick,stop,seconds:(performance.now()-began)/1000,samples,experiencedSamples,learned:learned.size,offered,changedTop,starts,changes,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget,limits:'Preferences and options sampled every 120 ticks; samples are not independent opportunities. Actual starts with a preference reason are separate. Removing a nudge in one observed ranking is not a long-run welfare or time-budget counterfactual. No benefit claim.'};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed,stop,tick:w.tick,samples,experiencedSamples,learned:learned.size,offered,changedTop,starts:starts.length,pureChecks,continuationEqual:true,conserved:report.conservation.ok,livingTicks:timeBudget.livingTicks,totals:timeBudget.totals,seconds:report.seconds}));
if(stop!=='horizon')process.exitCode=1;
