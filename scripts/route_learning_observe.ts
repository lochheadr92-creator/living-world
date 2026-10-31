// Fixed five-day ordinary window. Personal path experience and reconsideration are separate from source depletion.
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
import type {Person} from '../src/sim/types';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=['src','scripts/observers'].flatMap(root=>readdirSync(root,{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>root+'/'+f)).concat('scripts/route_learning_observe.ts').sort(),manifest=()=>sourceManifest(files);
const source=manifest(),began=performance.now(),events=new Map<string,any>(),blocked:any[]=[];let eligibleStarts=0,samples=0,experiencedSamples=0,blockedSamples=0,pureChecks=0,omitted=0;
const collect=(p:Person)=>{for(const [target,f] of Object.entries(p.failures))if(f.route)for(const e of f.route.events)events.set(p.id+'|'+e.activity,{person:p.id,target:Number(target),...e});};
w.hooks={onActivityStart:(_,a)=>{if(a.data.routeAttempt)eligibleStarts++;},onActivityEnd:p=>collect(p)};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<5*DAY){time.sampleTick(w);if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;collect(p);if(Object.values(p.failures).some(f=>f.route))experiencedSamples++;const ctx=generateOptions(w,p,true,true);observeInhabitant(w,p,ctx,rankOptions(ctx));const held=ctx.blocked.filter(o=>o.blocked?.includes('last actual attempt #'));if(held.length){blockedSamples++;if(blocked.length<2000)blocked.push({tick:w.tick,person:p.id,offers:held.map(o=>({key:o.key,reason:o.blocked}))});else omitted++;}}if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}stepWorld(w);stepWorld(twin);if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}}
for(const p of w.persons)collect(p);detach();delete w.hooks;if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Continuation changed');const all=[...events.values()],failed=all.filter(e=>e.outcome==='failed').length,corrected=all.filter(e=>e.outcome==='arrived').length;
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(raw),tick:w.tick,stop,seconds:(performance.now()-began)/1000,eligibleStarts,failed,corrected,events:all,blocked,samples,experiencedSamples,blockedSamples,pureChecks,omitted,continuationEqual:true,conservation:conservationReport(w),timeBudget:time.report(),limits:'Eligible starts have a remembered stationary target and travel phase; they are not failure opportunities. Samples are not independent people. Events collected at endings/samples/final state can omit compacted evidence. No aggregate benefit claim.'};mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));console.log(JSON.stringify({seed,tick:w.tick,stop,eligibleStarts,failed,corrected,samples,experiencedSamples,blockedSamples,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));if(stop!=='horizon')process.exitCode=1;
