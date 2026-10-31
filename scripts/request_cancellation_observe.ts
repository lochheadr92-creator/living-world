// Fixed five-day ordinary window: personally justified requester cancellations, speech, acknowledgement and saved twins.
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
import {pendingCancellations} from '../src/sim/request_cancellation';
import {DAY} from '../src/sim/constants';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/request_cancellation_observe.ts').sort(),manifest=()=>sourceManifest(files);
const source=manifest(),began=performance.now(),own=new Map<string,unknown>(),heard=new Map<string,unknown>();let samples=0,pendingSamples=0,eligibleSamples=0,pureChecks=0,cancellationStarts=0;
const collect=()=>{for(const p of w.persons)for(const m of p.socialMemory??[])if(m.cancellation)(m.role==='asker'?own:heard).set(p.id+'|'+m.requestId,{person:p.id,...m});};
w.hooks={onActivityStart:(_p,a)=>{if(a.kind==='socialize'&&a.data.purpose==='cancel_request')cancellationStarts++;},onActivityEnd:()=>collect()};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){time.sampleTick(w);if(w.tick%120===0){const before=serializeWorld(w);collect();for(const p of w.persons){if(!p.alive)continue;samples++;pendingSamples+=pendingCancellations(w,p).length;const ctx=generateOptions(w,p,true,true);eligibleSamples+=ctx.options.filter(o=>o.tag==='cancel').length;observeInhabitant(w,p,ctx,rankOptions(ctx));}if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}stepWorld(w);stepWorld(twin);if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}}
collect();detach();delete w.hooks;if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Continuation changed');
const requests=[...own.values()] as any[],messages=[...heard.values()];
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(raw),tick:w.tick,stop,seconds:(performance.now()-began)/1000,cancellationStarts,requests,heard:messages,acknowledged:requests.filter(m=>m.cancellation.acknowledgedAt!==undefined).length,samples,pendingSamples,eligibleSamples,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Pending/eligible samples repeat people and requests; they are not independent opportunities. Requests/heard/acknowledged count distinct retained person/request records. No staged events, external choice control or aggregate-benefit claim.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));console.log(JSON.stringify({seed,tick:w.tick,stop,cancellationStarts,requests:requests.length,heard:messages.length,acknowledged:report.acknowledged,samples,pendingSamples,eligibleSamples,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
