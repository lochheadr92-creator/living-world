// Fixed ordinary occurrence screen: no forced workshops, batches, items, weather or decisions.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,totalItems} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/offcuts_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>sourceManifest(files),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],adverse:unknown[]=[],outputPlaces=new Set<number>(),seenStarts=new Set<number>(),fuelledBy=new Map<number,number>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n;
const story=(event:unknown)=>{if(stories.length<120)stories.push(event);};
w.hooks={
 onActivityStart:(p,a)=>{const related=a.kind==='operate'&&['hew_planks','saw_planks'].includes(a.data.recipe)||a.kind==='withdraw'&&a.data.items?.offcuts>0||a.kind==='fuel_fire'&&a.data.fuelItem==='offcuts';
  if(related){count('started:'+a.kind);seenStarts.add(a.id);story({event:'start',tick:w.tick,person:p.id,activity:a.id,kind:a.kind,target:a.targetId,inventory:{...p.inv}});}
  if(a.kind==='warm'&&fuelledBy.has(p.id)){count('later warm starts by fuel supplier');story({event:'later warmth choice',tick:w.tick,person:p.id,target:a.targetId,previousFuelAt:fuelledBy.get(p.id),warmth:p.needs.warmth});}
 },
 onActivityEnd:(p,a,outcome,detail)=>{if(seenStarts.has(a.id)){count('ended:'+a.kind+':'+outcome);const entry={event:'end',tick:w.tick,person:p.id,activity:a.id,kind:a.kind,target:a.targetId,cycles:a.cycle,outcome,detail,inventory:{...p.inv},needs:{...p.needs}};story(entry);if(outcome!=='success'&&adverse.length<40)adverse.push(entry);
   if(a.kind==='fuel_fire'&&a.data.fuelItem==='offcuts'&&a.cycle>0){count('fuel bundles burned',a.cycle);fuelledBy.set(p.id,w.tick);}}
 },
 onTransfer:info=>{if(info.item==='offcuts'){count('transferred bundles',info.n);story({event:'transfer',tick:w.tick,...info});}}
};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 for(const b of w.buildings)if((b.ops?.produced.offcuts??0)>0)outputPlaces.add(b.id);
 for(const p of w.persons)if(p.alive&&(p.inv.offcuts??0)>0)count('carrying person ticks');
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;const known=Object.values(p.beliefs).some(b=>(b.items?.offcuts??0)>0),lowFire=Object.values(p.beliefs).some(b=>b.btype==='fire'&&(b.fuel??0)-(w.tick-b.seen)*0.85<500);if(known)count('sampled known offcuts');if(known&&lowFire)count('sampled known offcuts and low fire');const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);for(const o of ctx.options){if(o.key.endsWith(':offcuts')){count('sampled collect offers');if(ranked[0]?.key===o.key)count('sampled collect ranked first');}if(o.kind==='fuel_fire'&&(p.inv.offcuts??0)>0)count('sampled carried fuel offers');}observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);}
  for(const b of w.buildings)if(b.type==='timber_yard')describeEntity(w,b.id);if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,samples,pureChecks,counts,outputPlaces:[...outputPlaces],created:w.ledger.created.offcuts??0,consumed:w.ledger.consumed.offcuts??0,remaining:totalItems(w).offcuts??0,stories,adverse,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence and adverse screen, not aggregate benefit or mature Large performance. Repeated person/tick samples are not independent opportunities; later warmth choice alone does not establish a measured warmth gain.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,created:report.created,consumed:report.consumed,remaining:report.remaining,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
