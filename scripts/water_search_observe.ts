// Ordinary fixed-window search opportunities and actual water use; no induced thirst or locations.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {setWaterSearch} from '../src/sim/water_search';
const [seed,out,daysArg='5',budgetArg='240']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, days 1..365, positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/water_search_observe.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],searches=new Map<number,number>();let samples=0,pureChecks=0,stop='horizon';
const count=(key:string)=>counts[key]=(counts[key]??0)+1,story=(x:unknown)=>{if(stories.length<80)stories.push(x);};
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='explore'&&a.need==='thirst'){count('water search started');searches.set(p.id,w.tick);story({tick:w.tick,person:p.id,goal:a.goal});}if(a.kind==='drink'&&w.tick-(searches.get(p.id)??-10000)<=2400)count('drink started within a day of water search');},onActivityEnd:(p,a,result)=>{if(a.kind==='explore'&&a.need==='thirst'){count('water search ending:'+result);if(Object.values(p.beliefs).some(b=>b.kind==='water'&&b.seen>=a.start))count('water search ending with new personally seen shore');}if(a.kind==='drink'&&result==='success'&&w.tick-(searches.get(p.id)??-10000)<=2400){count('real drink completed within a day of water search');searches.delete(p.id);}}};
while(w.tick<days*2400){
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  const ctx=generateOptions(w,p,true,true),offered=ctx.options.find(o=>o.kind==='explore'&&o.need==='thirst');
  if(ctx.drives.thirst>18&&!ctx.options.some(o=>o.tag==='water'))count('sampled thirsty without a drinking offer');
  if(ctx.night&&ctx.criticals.includes('thirst')&&!ctx.options.some(o=>o.tag==='water'))count('sampled critical night thirst without a drinking offer');
  if(offered){count('sampled water search offered');if(ctx.night)count('sampled night water search offered');}
  setWaterSearch(false);try{const old=generateOptions(w,p,true,true).options.find(o=>o.kind==='explore'&&o.need==='thirst');if(!!offered!==!!old)count('sampled water search eligibility differs with correction removed');}finally{setWaterSearch(true);}
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,continuationEqual:true,conservation:conservationReport(w),limits:'Ordinary occurrence screen. Repeated samples are not independent opportunities. A drink within a day of a search is a temporal sequence, not causal or survival benefit. Removed-correction offers compare one state only.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({...report,source:undefined,stories:undefined}));if(stop!=='horizon')process.exitCode=1;
