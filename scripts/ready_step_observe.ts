// Fixed ordinary project-step screen: no induced demand, supplies, plans or choices.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {nextProjectStep} from '../src/sim/project_step';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {TimeBudget} from './observers/time_budget';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out,daysArg='5',budgetArg='170',input]=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/ready_step_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>sourceManifest(files),source=manifest();
const inputRaw=input?readFileSync(input,'utf8'):undefined;
const w=inputRaw?deserializeWorld(inputRaw):createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
if(w.settings.seed!==seed||w.tick>=days*2400)throw new Error('Input seed must match and precede the target day');
const from=w.tick;
const counts:Record<string,number>={},stories:unknown[]=[],plansSeen=new Set<number>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n,story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
// Already-active plans at a continuation boundary are not new adoptions.
if(input)for(const p of w.persons)for(const i of p.intentions)if(i.status==='active'&&i.project){plansSeen.add(i.id);count('project plans already active at input:'+i.makes);}
const READY=/already at the/;
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='operate'&&a.data.forPlan){count('start:project operate:'+String(a.data.recipe));story({event:'start',tick:w.tick,person:p.id,recipe:a.data.recipe,ready:READY.test(String(a.data.why??'')),goal:a.goal});}if(a.kind==='cart_haul')count('start:cart_haul');},onActivityEnd:(p,a,outcome,detail)=>{if(a.kind==='operate'&&a.data.forPlan){count('ending:project operate:'+outcome);story({event:'ending',tick:w.tick,person:p.id,recipe:a.data.recipe,outcome,detail});}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
  for(const i of p.intentions){if(i.status!=='active'||!i.project)continue;if(!plansSeen.has(i.id)){plansSeen.add(i.id);count('project plans adopted:'+i.makes);story({event:'plan',tick:w.tick,person:p.id,makes:i.makes,goal:i.goal});}
   const step=nextProjectStep(ctx,i.project,i);count('sampled project step:'+step.phase);
   if(step.phase==='operate'){const o=ctx.options.find(o=>o.key===`operate:${step.target}:${step.node.recipe}`);const ready=!!o&&o.parts.some(p=>READY.test(String(p[0])));count(o?ready?'sampled operate step offered prepared':'sampled operate step offered unprepared':'sampled operate step not offered');if(o&&ranked[0]?.key===o.key)count(ready?'sampled prepared step ranked first':'sampled unprepared step ranked first');}}
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
count('carts at end',w.carts.length);
const report={...gitProvenance(),seed,input:input??null,inputHash:inputRaw?hash(inputRaw):null,from,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate benefit or mature Large performance. Repeated samples are not independent opportunities; a prepared step offered is not a cart or a useful trip.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
