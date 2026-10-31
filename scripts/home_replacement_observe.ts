// Fixed ordinary screen. No induced losses, supplies, knowledge or decisions.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {setHomeReplacement} from '../src/sim/home_replacement';
import {ownHomeBeliefFor} from '../src/sim/shelter';
import {isHomeType} from '../src/sim/constants';
const [seed,out,daysArg='5',budgetArg='240']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, days 1..365, positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/home_replacement_observe.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[];let samples=0,pureChecks=0,stop='horizon';
const count=(key:string)=>counts[key]=(counts[key]??0)+1,story=(x:unknown)=>{if(stories.length<80)stories.push(x);};
const homeOffers=(p:typeof w.persons[number])=>generateOptions(w,p,true,true).options.filter(o=>o.key==='plan_site:lean_to'||o.key==='plan_site:hut').map(o=>o.key);
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='plan_site'&&isHomeType(a.data.type as any)){count('home layout started');story({tick:w.tick,person:p.id,kind:a.kind,goal:a.goal});}if(a.kind==='build')count('build activity started');},onActivityEnd:(p,a,result,detail)=>{if(a.kind==='plan_site'&&isHomeType(a.data.type as any)){count('home layout ending:'+result);if(result!=='success')story({tick:w.tick,person:p.id,result,detail});}}};
while(w.tick<days*2400){
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  const belief=ownHomeBeliefFor(p),physical=w.households.find(h=>h.id===p.hhId)?.homeId??0;
  if(belief){count('sampled remembered home');if(!w.byId.has(belief.id))count('sampled remembered missing home');}
  else if(physical)count('sampled allocated home not remembered');
  const offered=homeOffers(p);let removed:string[]=[];
  setHomeReplacement(false);try{removed=homeOffers(p);}finally{setHomeReplacement(true);}
  if(offered.length)count('sampled home layout offered');
  if(JSON.stringify(offered)!==JSON.stringify(removed)){count('sampled layout offer differs with knowledge boundary removed');story({tick:w.tick,person:p.id,belief:belief?{id:belief.id,type:belief.btype,x:belief.x,y:belief.y}:null,physical,offered,removed});}
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,continuationEqual:true,conservation:conservationReport(w),limits:'Ordinary occurrence screen; repeated samples are not independent opportunities. Removed-boundary offers are pure option comparisons in the same state, not a counterfactual trajectory or aggregate effect. No induced collapse.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({...report,source:undefined,stories:undefined}));if(stop!=='horizon')process.exitCode=1;
