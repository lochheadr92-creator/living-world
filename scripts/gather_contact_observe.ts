// Fixed fresh Normal five-day window: actual gathering travel failures, separate from stock found on arrival.
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
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/gather_contact_observe.ts').sort(),manifest=()=>sourceManifest(files);
const source=manifest(),began=performance.now(),failures:any[]=[];let starts=0,ended=0,failedTravel=0,failedWork=0,samples=0,pureChecks=0,omitted=0;
w.hooks={onActivityStart:(_,a)=>{if(a.kind==='gather')starts++;},onActivityEnd:(p,a,outcome,detail)=>{if(a.kind!=='gather')return;ended++;if(outcome!=='failed')return;if(a.phase==='travel')failedTravel++;else failedWork++;if(failures.length<2000)failures.push({tick:w.tick,person:p.id,activity:a.id,phase:a.phase,target:a.targetId,detail,position:{x:p.x,y:p.y},belief:p.beliefs[a.targetId]?structuredClone(p.beliefs[a.targetId]):null,seen:p.seen.some(s=>s.id===a.targetId),sourceExperience:p.payoff.wood?.sources?.find(s=>s.target===a.targetId),log:p.log.slice(-2)});else omitted++;}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){time.sampleTick(w);if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;const ctx=generateOptions(w,p,true,true);observeInhabitant(w,p,ctx,rankOptions(ctx));}if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}stepWorld(w);stepWorld(twin);if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}}
detach();delete w.hooks;if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Continuation changed');
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(raw),tick:w.tick,stop,seconds:(performance.now()-began)/1000,starts,ended,failedTravel,failedWork,failures,samples,pureChecks,omitted,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Actual activity counts, not independent people or opportunities. No modified terrain or selected actions. No aggregate benefit claim. Failed work can have causes other than empty stock; absence of failed travel is a null occurrence result.'};mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));console.log(JSON.stringify({seed,tick:w.tick,stop,starts,ended,failedTravel,failedWork,samples,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
