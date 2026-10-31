// Fixed five-day ordinary window: active target promises, actual local evidence, reports, purity and saved twins.
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
import {promiseTarget} from '../src/sim/promise_targets';
import {DAY} from '../src/sim/constants';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/promise_targets_observe.ts').sort(),manifest=()=>sourceManifest(files);
const source=manifest(),began=performance.now(),evidence=new Map<string,unknown>(),heard=new Map<string,unknown>();let samples=0,targetPromiseSamples=0,pureChecks=0,reportStarts=0,targetReportStarts=0;
const collect=()=>{for(const p of w.persons){for(const c of p.commitments)if(c.targetEvidence)evidence.set(p.id+'|'+c.id,{person:p.id,commitment:c.id,status:c.status,contrib:c.contrib,delivered:c.delivered,...c.targetEvidence});for(const m of p.socialMemory??[])if(m.resolution?.targetEvidence){if(m.role==='asker')heard.set(p.id+'|'+m.requestId,{person:p.id,...m});}}};
w.hooks={onActivityStart:(p,a)=>{if(a.kind!=='socialize'||a.data.purpose!=='report')return;reportStarts++;if(p.socialMemory?.some(m=>m.requestId===a.data.conv?.requestId&&m.resolution?.targetEvidence))targetReportStarts++;},onActivityEnd:()=>collect()};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){time.sampleTick(w);if(w.tick%120===0){const before=serializeWorld(w);collect();for(const p of w.persons){if(!p.alive)continue;samples++;targetPromiseSamples+=p.commitments.filter(c=>c.status==='active'&&promiseTarget(c)).length;const ctx=generateOptions(w,p,true,true);observeInhabitant(w,p,ctx,rankOptions(ctx));}if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}stepWorld(w);stepWorld(twin);if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}}
collect();detach();delete w.hooks;if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Continuation changed');
const records=[...evidence.values()] as any[],reports=[...heard.values()];
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(raw),tick:w.tick,stop,seconds:(performance.now()-began)/1000,reportStarts,targetReportStarts,evidence:records,observedAbsences:records.filter(k=>k.source==='observed absence').length,completedHere:records.filter(k=>k.source==='completed here').length,heardReports:reports,samples,targetPromiseSamples,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Target-promise samples are repeated active commitments, not independent people or failures. Evidence counts distinct person/commitment records; report journeys do not establish hearing. Actual heard reports retain their source. No staged event injected into these ordinary worlds. No aggregate-benefit claim.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));console.log(JSON.stringify({seed,tick:w.tick,stop,reportStarts,targetReportStarts,observedAbsences:report.observedAbsences,completedHere:report.completedHere,heardReports:reports.length,samples,targetPromiseSamples,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
