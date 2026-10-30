// Fixed ordinary five-day window: receipts, eligible learned offers, actual starts and matched current choices are separate.
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
import {setPromiseExpectations} from '../src/sim/promise_expectations';
import {DAY} from '../src/sim/constants';
import {TimeBudget} from './observers/time_budget';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/promise_expectations_observe.ts').sort(),manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))]));
const source=manifest(),began=performance.now(),receipts=new Map<string,unknown>(),changed:any[]=[];let samples=0,experiencedSamples=0,comparisonSamples=0,pureChecks=0,reportStarts=0,agreementReportStarts=0;
const collect=()=>{for(const p of w.persons)for(const m of p.socialMemory??[])if(m.expectation)receipts.set(p.id+'|'+m.requestId,{person:p.id,...m});};
w.hooks={onActivityStart:(_p,a)=>{if(a.kind!=='socialize'||a.data.purpose!=='report')return;reportStarts++;const listener=w.byId.get(a.targetId);if(listener?.ent==='person'&&listener.socialMemory?.some(m=>m.requestId===a.data.conv?.requestId&&m.expectation))agreementReportStarts++;},onActivityEnd:()=>collect()};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){time.sampleTick(w);if(w.tick%120===0){const before=serializeWorld(w);collect();for(const p of w.persons){if(!p.alive)continue;samples++;if(p.socialMemory?.some(m=>m.expectation))experiencedSamples++;const ctx=generateOptions(w,p,true,true),on=rankOptions(ctx);observeInhabitant(w,p,ctx,on);if(p.socialMemory?.some(m=>m.expectation)){comparisonSamples++;setPromiseExpectations(false);let off:ReturnType<typeof rankOptions>;try{off=rankOptions(generateOptions(w,p,true,true));}finally{setPromiseExpectations(true);}const onAsks=on.slice(0,3);if(on[0]?.key!==off[0]?.key&&changed.length<2000)changed.push({tick:w.tick,person:p.id,on:on[0]?.key,off:off[0]?.key,reasons:onAsks.map(o=>({key:o.key,why:o.selectionReason??o.parts.map(([label])=>label).join('; ')}))});}}
 if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}stepWorld(w);stepWorld(twin);if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}}
collect();detach();delete w.hooks;if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Continuation changed');
const all=[...receipts.values()] as any[],direct=all.filter(m=>m.role==='asker'&&m.expectation.source==='helper report');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(raw),tick:w.tick,stop,seconds:(performance.now()-began)/1000,reportStarts,agreementReportStarts,receipts:all,heardReports:direct.length,waiting:all.filter(m=>m.expectation.endedAt===undefined).length,ownTimeouts:all.filter(m=>m.expectation.source==='own timeout').length,knownDeaths:all.filter(m=>m.expectation.source==='known death').length,observedCompletions:all.filter(m=>m.expectation.source==='observed completion').length,changed,samples,experiencedSamples,comparisonSamples,pureChecks,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Report starts count all actual report journeys; agreementReportStarts restricts these to a listener retaining the referenced agreement at start. Neither guarantees contact or hearing. Samples are not independent people. Expectation memories count distinct latest person/request records, not every transition; reports remain distinct from observation. Matched removals are sampled for people with a retained agreement, not counted as attributable option offers. Matched top choices are sampled opportunities, not evidence of benefit. No guarantee of willingness or broader competence.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));console.log(JSON.stringify({seed,tick:w.tick,stop,reportStarts,agreementReportStarts,expectationMemories:all.length,ownTimeouts:report.ownTimeouts,knownDeaths:report.knownDeaths,observedCompletions:report.observedCompletions,heardReports:direct.length,changed:changed.length,samples,experiencedSamples,comparisonSamples,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
