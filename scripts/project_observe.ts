// Fixed fresh five-day occurrence check. No staged equipment, procedures, stock or selected actions.
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
const [seed,out]=process.argv.slice(2).filter(a=>a!=='--');
if(!seed||!out||existsSync(out))throw new Error('Seed and fresh output required');
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),raw=serializeWorld(w),twin=deserializeWorld(raw);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/project_observe.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))]));
const source=manifest(),from=w.tick,until=from+5*DAY,began=performance.now(),plans=new Map<number,any>(),starts:any[]=[],endings:Record<string,number>={};
let samples=0,activeSamples=0,pureChecks=0,omitted=0;
w.hooks={onActivityStart:(p,a)=>{const i=p.intentions.find(i=>i.id===a.data.forPlan&&i.project);if(i){if(starts.length<2000)starts.push({tick:w.tick,person:p.id,plan:i.id,kind:a.kind,recipe:a.data.recipe,target:a.targetId});else omitted++;}},onActivityEnd:(_p,a,outcome,detail)=>{if(a.data.forPlan)endings[outcome+'|'+detail]=(endings[outcome+'|'+detail]??0)+1;}};
let stop='horizon';
while(w.tick<until){
 if(w.tick%120===0){
  const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;samples++;
   const projects=p.intentions.filter(i=>i.project);if(!projects.length)continue;
   for(const i of projects){plans.set(i.id,{person:p.id,name:p.name,id:i.id,goal:i.goal,status:i.status,since:i.since,ended:i.ended,reason:i.reason,graph:structuredClone(i.project)});if(i.status==='active')activeSamples++;}
   const ctx=generateOptions(w,p,true,true);observeInhabitant(w,p,ctx,rankOptions(ctx));
  }
  if(serializeWorld(w)!==before)throw new Error('Observation changed full state/RNG');pureChecks++;
 }
 stepWorld(w);stepWorld(twin);
 if(w.tick%120===0&&performance.now()-began>170000){stop='budget';break;}
 if(w.tick%DAY===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
}
delete w.hooks;
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
if(serializeWorld(w)!==serializeWorld(twin))throw new Error('Observer altered continuation');
mkdirSync(out,{recursive:true});
const list=[...plans.values()],report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,initialHash:hash(raw),source,settings:w.settings,from,until,tick:w.tick,stop,seconds:(performance.now()-began)/1000,samples,activeSamples,plans:list,starts,endings,omitted,pureChecks,continuationEqual:true,conservation:conservationReport(w),limits:'Plans sampled every 120 ticks; brief plans may be missed. Last sampled status is not necessarily final. Activity starts recorded separately. Staged feasibility is not ordinary frequency, and this short fresh run establishes no welfare, productivity or mature-world benefit.'};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final-save.json',serializeWorld(w));
console.log(JSON.stringify({seed,stop,tick:w.tick,samples,activeSamples,projects:list.length,observedDone:list.filter(i=>i.status==='done').length,starts:starts.length,pureChecks,continuationEqual:true,conserved:report.conservation.ok,seconds:report.seconds}));
if(stop!=='horizon')process.exitCode=1;
