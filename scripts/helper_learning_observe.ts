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
import {setHelperLearning} from '../src/sim/helper_learning';
import {DAY} from '../src/sim/constants';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/helper_learning_observe.ts').sort(),manifest=()=>sourceManifest(files);
const source=manifest(),began=performance.now(),receipts=new Map<string,unknown>(),starts:any[]=[],changed:any[]=[];let samples=0,experiencedSamples=0,influencedSamples=0,pureChecks=0,materialAskStarts=0,omitted=0;
const collect=()=>{for(const p of w.persons)for(const m of p.socialMemory??[])if(m.task)receipts.set(p.id+'|'+m.requestId,{person:p.id,...m});};
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='socialize'&&a.data.purpose==='request'&&['wood','stone','goods'].includes(a.data.conv?.reqKind))materialAskStarts++;if(String(a.data.why??p.lastDecision?.because??'').includes('I personally received')){if(starts.length<2000)starts.push({tick:w.tick,person:p.id,activity:a.id,key:a.data.optKey,why:a.data.why??p.lastDecision?.because});else omitted++;}},onActivityEnd:()=>collect()};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){time.sampleTick(w);if(w.tick%120===0){const before=serializeWorld(w);collect();for(const p of w.persons){if(!p.alive)continue;samples++;if(p.socialMemory?.some(m=>m.task?.receipt))experiencedSamples++;const ctx=generateOptions(w,p,true,true),on=rankOptions(ctx);observeInhabitant(w,p,ctx,on);if(on.some(o=>o.selectionReason?.includes('I personally received'))){influencedSamples++;setHelperLearning(false);let off:ReturnType<typeof rankOptions>;try{off=rankOptions(generateOptions(w,p,true,true));}finally{setHelperLearning(true);}const onAsks=on.filter(o=>o.selectionReason?.includes('I personally received'));if(on[0]?.key!==off[0]?.key&&changed.length<2000)changed.push({tick:w.tick,person:p.id,on:on[0]?.key,off:off[0]?.key,reasons:onAsks.map(o=>({key:o.key,why:o.selectionReason}))});}}
 if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}stepWorld(w);stepWorld(twin);if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}}
collect();detach();delete w.hooks;if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Continuation changed');
const all=[...receipts.values()] as any[],direct=all.filter(m=>m.role==='asker'&&m.task.receipt);
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(raw),tick:w.tick,stop,seconds:(performance.now()-began)/1000,materialAskStarts,receipts:all,directReceipts:direct.length,starts,changed,samples,experiencedSamples,influencedSamples,pureChecks,omitted,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Samples are not independent people. Direct receipts count distinct requester/request records, not all individual transfer events. Matched top choices are sampled opportunities, not evidence of benefit. No guarantee of willingness or broader competence.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));console.log(JSON.stringify({seed,tick:w.tick,stop,materialAskStarts,taskReceipts:all.length,directReceipts:direct.length,influencedStarts:starts.length,changed:changed.length,samples,experiencedSamples,influencedSamples,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
