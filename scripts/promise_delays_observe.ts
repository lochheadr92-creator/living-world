// Fixed five-day ordinary window: active failed-attempt explanations and bounded deadline negotiations and saved twins.
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
import {pendingDelayProposals} from '../src/sim/promise_delays';
import {DAY} from '../src/sim/constants';
import {TimeBudget} from './observers/time_budget';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/promise_delays_observe.ts').sort(),manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))]));
const source=manifest(),began=performance.now(),own=new Map<string,unknown>(),heard=new Map<string,unknown>(),completedShares=new Map<string,unknown>();let samples=0,pendingSamples=0,eligibleSamples=0,pureChecks=0,delayStarts=0;
const collect=()=>{for(const p of w.persons){for(const c of p.commitments){if(c.delay)own.set(p.id+'|'+c.id,{person:p.id,requestId:c.requestId,status:c.status,deadline:c.deadline,...structuredClone(c.delay)});if(c.kind==='help_build'&&c.status==='done'&&(c.contrib??0)>=40&&w.tick<c.deadline&&w.byId.get(c.siteId)?.ent==='site'&&!completedShares.has(p.id+'|'+c.id)){const k=p.socialMemory?.find(m=>m.requestId===c.requestId)?.completion;if(k?.source==='own completion')completedShares.set(p.id+'|'+c.id,{person:p.id,commitment:c.id,request:c.requestId,site:c.siteId,contrib:c.contrib,deadline:c.deadline,completedAt:k.completedAt,observedAt:w.tick});}}for(const m of p.socialMemory??[])if(m.expectation?.delay)heard.set(p.id+'|'+m.requestId,{person:p.id,...structuredClone(m)});}};
w.hooks={onActivityStart:(_p,a)=>{if(a.kind==='socialize'&&a.data.purpose==='delay_request')delayStarts++;},onActivityEnd:()=>collect()};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){time.sampleTick(w);if(w.tick%120===0){const before=serializeWorld(w);collect();for(const p of w.persons){if(!p.alive)continue;samples++;pendingSamples+=pendingDelayProposals(w,p).length;const ctx=generateOptions(w,p,true,true);eligibleSamples+=ctx.options.filter(o=>o.tag==='delay').length;observeInhabitant(w,p,ctx,rankOptions(ctx));}if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}stepWorld(w);stepWorld(twin);if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}}
collect();detach();delete w.hooks;const finalRaw=serializeWorld(w);if(serializeWorld(deserializeWorld(finalRaw))!==finalRaw)throw new Error('Final save failed validation or exact round trip');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Continuation changed');
const requests=[...own.values()] as any[],messages=[...heard.values()];
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(raw),tick:w.tick,stop,seconds:(performance.now()-began)/1000,delayStarts,completedShares:[...completedShares.values()],requests,heard:messages,accepted:requests.filter(m=>m.response==='accepted').length,refused:requests.filter(m=>m.response==='refused').length,samples,pendingSamples,eligibleSamples,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Pending/eligible samples repeat people and requests; they are not independent opportunities. Proposals/heard/answered count distinct retained person/request records. No staged events, external choice control or aggregate-benefit claim.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));console.log(JSON.stringify({seed,tick:w.tick,stop,delayStarts,completedShares:completedShares.size,requests:requests.length,heard:messages.length,accepted:report.accepted,refused:report.refused,samples,pendingSamples,eligibleSamples,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
