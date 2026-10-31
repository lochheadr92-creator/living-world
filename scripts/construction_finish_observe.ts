// Fixed ordinary screen; no supplied sites, progress, material or decisions.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {setConstructionFinish} from '../src/sim/construction_finish';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out,daysArg='5',budgetArg='240']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, days 1..365, positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/construction_finish_observe.ts').sort();
const manifest=()=>sourceManifest(files),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],finishing=new Set<number>();let samples=0,pureChecks=0,stop='horizon';
const count=(key:string)=>counts[key]=(counts[key]??0)+1,story=(x:unknown)=>{if(stories.length<80)stories.push(x);};
const offers=(p:typeof w.persons[number])=>generateOptions(w,p,true,true).options.filter(o=>o.kind==='build').map(o=>o.key);
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='build'){count('build activity started');const s=w.byId.get(a.targetId);if(s?.ent==='site'&&s.work/s.workTotal>=0.98){count('last-two-percent build started');finishing.add(a.id);story({tick:w.tick,person:p.id,site:s.id,work:s.work,total:s.workTotal});}}},onActivityEnd:(p,a,result,detail)=>{if(finishing.delete(a.id)){count('last-two-percent ending:'+result);story({tick:w.tick,person:p.id,result,detail});}}};
while(w.tick<days*2400){
 for(const p of w.persons){const a=p.activity;if(!p.alive||a?.kind!=='build'||a.phase!=='work'||finishing.has(a.id))continue;const s=w.byId.get(a.targetId);if(s?.ent==='site'&&s.work/s.workTotal>=0.98){finishing.add(a.id);count('running build reached final two percent');}}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  for(const b of Object.values(p.beliefs))if(b.kind==='site'&&(b.progress??0)>=0.98&&(b.progress??0)<1)count('sampled near-complete remembered site');
  const offered=offers(p);let removed:string[]=[];setConstructionFinish(false);try{removed=offers(p);}finally{setConstructionFinish(true);}
  if(JSON.stringify(offered)!==JSON.stringify(removed)){count('sampled build offer differs with finish correction removed');story({tick:w.tick,person:p.id,offered,removed});}
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,continuationEqual:true,conservation:conservationReport(w),limits:'Ordinary occurrence screen. Repeated samples are not independent opportunities. Removed-correction offers compare one state, not counterfactual trajectories or aggregate benefit.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({...report,source:undefined,stories:undefined}));if(stop!=='horizon')process.exitCode=1;
