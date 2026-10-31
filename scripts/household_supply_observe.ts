// Fixed ordinary household-supply screen: no induced plans, tellings or choices. Optional fourth argument pins the rules version.
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
import {describePerson} from '../src/sim/inspect';
import {TimeBudget} from './observers/time_budget';
const [seed,out,daysArg='5',budgetArg='170',rulesArg='']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/household_supply_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const settings=currentWorldSettings('normal',seed,{immigration:false});if(rulesArg)settings.rulesVersion=Number(rulesArg);
const w=createWorld(settings),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],plansSeen=new Set<number>(),heardSeen=new Set<string>(),deferSeen=new Set<string>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n,story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='socialize'&&a.data.purpose==='share_work'){count('start:share_work');story({event:'tell',tick:w.tick,person:p.id,target:a.targetId});}},onActivityEnd:(p,a,outcome)=>{if(a.kind==='socialize'&&a.data.purpose==='share_work')count('ending:share_work:'+outcome);}};
const mealsSeen=new Set<string>();
const sampleMeals=()=>{for(const m of w.meals){const key=m.id+':'+m.status;if(mealsSeen.has(key))continue;mealsSeen.add(key);if(m.status!=='done')continue;count('meals done');const host=w.byId.get(m.host);if(host?.ent!=='person')continue;
 const seated=Object.entries(m.supperContact?.guests??{}).filter(([id,c])=>c.ticks>=20&&w.byId.get(Number(id))?.ent==='person').map(([id])=>w.byId.get(Number(id)) as typeof host).filter(g=>g.hhId===host.hhId);
 if(seated.length){count('meals done with a household guest seated 20+ ticks');if([host,...seated].some(q=>q.intentions.some(i=>i.status==='active'&&['tool','stock','shelter','batch'].includes(i.kind))))count('such meals where a diner carried a shareable undertaking');}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 if(w.tick%120===0){sampleMeals();const before=serializeWorld(w);const byHousehold=new Map<number,Map<number,number[]>>();for(const p of w.persons){if(!p.alive)continue;samples++;
  for(const i of p.intentions){if(i.kind!=='stock')continue;if(!plansSeen.has(i.id)){plansSeen.add(i.id);count('stock plans adopted:'+(i.cue??'unknown'));}
   if(i.status==='active'){const hh=byHousehold.get(p.hhId)??new Map<number,number[]>();byHousehold.set(p.hhId,hh);hh.set(i.aboutId,[...(hh.get(i.aboutId)??[]),p.id]);}}
  for(const [other,r] of Object.entries(p.relations))for(const k of r.workHeard??[]){const key=p.id+':'+k.planId;if(!heardSeen.has(key)){heardSeen.add(key);count('heard undertakings:'+k.kind);if(k.via==='meal')count('heard at supper');story({event:'heard',tick:w.tick,listener:p.id,from:Number(other),kind:k.kind,heardAt:k.heardAt});}
   if(k.deferredAt!==undefined&&!deferSeen.has(key)){deferSeen.add(key);count('reserve left to teller');story({event:'deferred',tick:w.tick,listener:p.id,from:Number(other),planId:k.planId,deferredAt:k.deferredAt});}}
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);if(ctx.options.some(o=>o.key.includes('share_work')))count('sampled share_work offers');observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }
 for(const hh of byHousehold.values())for(const members of hh.values())if(members.length>1)count('sampled households with two or more active plans for one store');
 if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate household viability. Repeated samples are not independent opportunities; a deferral is not a saved trip or a fuller store.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,rules:w.settings.rulesVersion,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
