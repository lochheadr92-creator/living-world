// Fixed ordinary remembered-need screen (rules 106): how often care for a household dependant is decided from how they looked
// when last seen, how often a carer does not know how a dependant is, and how often the remembered signs differ from the
// dependant's true state (read by the observer only, never by anybody in the world). Optional fourth argument pins the rules version.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {rememberedSigns} from '../src/sim/remembered_need';
import {isDependent} from '../src/sim/people';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out,daysArg='5',budgetArg='170',rulesArg='']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/remembered_need_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>sourceManifest(files),source=manifest();
const settings=currentWorldSettings('normal',seed,{immigration:false});if(rulesArg)settings.rulesVersion=Number(rulesArg);
const w=createWorld(settings),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[];let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n,story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='give'&&a.targetId){const d=w.byId.get(a.targetId);if(d?.ent==='person'&&d.hhId===p.hhId&&isDependent(w,d)){const inSight=p.seen.some(s=>s.ent==='person'&&s.id===d.id);count(inSight?'care set out for a dependant in sight':'care set out for a dependant out of sight');if(!inSight){const r=rememberedSigns(p,d.id);const trueHungry=d.needs.hunger<42,trueThirsty=d.needs.thirst<40;count(r?(r.hungry===trueHungry&&r.thirsty===trueThirsty?'out-of-sight care on signs still true':'out-of-sight care on signs no longer true'):'out-of-sight care without remembered signs');story({event:'care-out-of-sight',tick:w.tick,carer:p.id,dependant:d.id,label:a.label,remembered:r,live:{hunger:Math.round(d.needs.hunger),thirst:Math.round(d.needs.thirst)}});}}}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
  for(const d of ctx.dependents){const inSight=ctx.seenPersons.some(s=>s.id===d.id);count(inSight?'sampled dependants in sight':'sampled dependants out of sight');if(!inSight){const r=rememberedSigns(p,d.id);if(!r)count('sampled out-of-sight dependants without remembered signs');else{const trueHungry=d.needs.hunger<42,trueThirsty=d.needs.thirst<40;if(r.hungry!==trueHungry||r.thirsty!==trueThirsty)count('sampled remembered signs differing from the true state');if(trueHungry&&!r.hungry)count('sampled dependants hungry out of sight and not known to be');}}}
  if(ctx.options.some(o=>o.kind==='give'&&o.parts.some(([n])=>/looked so when I last saw them/.test(n))))count('sampled care offered on remembered signs');
  if(ctx.options.some(o=>o.kind==='give'&&o.tag==='care'&&!o.parts.some(([n])=>/looked so when I last saw them/.test(n))))count('sampled care offered on sight');
  if(ctx.blocked.some(b=>b.blocked==='has not seen how they are'))count('sampled care set aside: has not seen how they are');if(ctx.blocked.some(b=>b.blocked==='does not know where they are'))count('sampled care set aside: does not know where they are');
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate benefit. Repeated samples are not independent opportunities; care offered is not care given, and signs differing from the true state are the honest cost of local knowledge, not a defect.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,rules:w.settings.rulesVersion,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
