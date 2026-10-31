// Fixed ordinary flood occurrence and physical response screen. No forced storms or decisions.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {describeFlood,floodViewAt} from '../src/sim/inspect_flood';
import {floodAt} from '../src/sim/flood';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/flood_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>sourceManifest(files),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const onsets:unknown[]=[],stories:unknown[]=[],adverse:unknown[]=[],seen=new Set<string>(),counts:Record<string,number>={};let samples=0,pureChecks=0,lastOnset=-1,maxStorm=0;
const count=(key:string)=>counts[key]=(counts[key]??0)+1;
w.hooks={onActivityEnd:(p,a,outcome,detail)=>{if(a.data.floodObservedAt!==undefined||a.data.floodWaitSince!==undefined||a.data.floodInterruptedWorkAt!==undefined){count('affected ending:'+outcome);const entry={tick:w.tick,person:p.id,activity:a.id,kind:a.kind,target:a.targetId,started:a.start,noticed:a.data.floodObservedAt,interruptedWork:a.data.floodInterruptedWorkAt,cycles:a.cycle,outcome,detail,inventory:{...p.inv},needs:{...p.needs}};if(stories.length<60)stories.push(entry);if(outcome!=='success'&&adverse.length<40)adverse.push(entry);}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);maxStorm=Math.max(maxStorm,w.weather.storm);
 if(w.flood&&w.flood.since!==lastOnset){lastOnset=w.flood.since;const living=w.persons.filter(p=>p.alive),outside=living.filter(p=>!p.indoors);onsets.push({tick:w.tick,since:lastOnset,tiles:w.flood.tiles.length,living:living.length,outside:outside.length,onAffectedGround:outside.filter(p=>floodAt(w,p.x,p.y)==='flooded').map(p=>({id:p.id,activity:p.activity?.kind,target:p.activity?.targetId})),activeUntil:w.flood.activeUntil,recoveryUntil:w.flood.recoveryUntil});}
 if(w.flood)count(w.tick<w.flood.activeUntil?'world ticks:flooded':'world ticks:recovering');
 for(const p of w.persons)if(p.alive){const a=p.activity;if(!a)continue;if(a.phase==='travel')count('person ticks:travel');if(a.data.floodRetreat)count('person ticks:retreat');if(a.data.floodWaitSince!==undefined)count('person ticks:waiting');for(const key of ['floodObservedAt','floodInterruptedWorkAt','floodWaitSince'])if(a.data[key]!==undefined){const id=p.id+':'+a.id+':'+key+':'+a.data[key];if(!seen.has(id)){seen.add(id);count('distinct activity:'+key);if(stories.length<60)stories.push({tick:w.tick,person:p.id,activity:a.id,kind:a.kind,target:a.targetId,event:key,at:a.data[key],x:p.x,y:p.y});}}}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;for(const id of p.bykind.flood??[])count('sampled memory:'+p.beliefs[id].state);const ctx=generateOptions(w,p,true,true);observeInhabitant(w,p,ctx,rankOptions(ctx));}if(w.flood){const i=w.flood.tiles[0];describeFlood(w,floodViewAt(w,i%w.W,Math.floor(i/w.W)));}if(serializeWorld(w)!==before)throw new Error('Impure flood observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,samples,pureChecks,maxStorm,onsets,counts,stories,adverse,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence and adverse screen, not aggregate benefit, long environmental recovery or mature Large performance. Repeated person/tick and memory samples are not independent opportunities.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,maxStorm,onsets,counts,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
