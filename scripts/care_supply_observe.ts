// Fixed ordinary screen; no induced incapacity, goods, care offers or selected actions.
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
import {ROOM_CONTACT_MEMORY} from '../src/sim/resident_contact';
import {TimeBudget} from './observers/time_budget';
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/care_supply_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],seen=new Set<string>(),starts=new Set<number>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n,story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
w.hooks={onActivityStart:(p,a)=>{if(a.data.careSupply){starts.add(a.id);count('care acquisition starts');story({event:'start',tick:w.tick,person:p.id,activity:a.id,goal:a.goal,purpose:a.data.careSupply});}},onActivityEnd:(p,a,outcome,detail)=>{if(starts.has(a.id)){count('care acquisition ending:'+outcome);story({event:'ending',tick:w.tick,person:p.id,activity:a.id,cycle:a.cycle,acquired:a.data.careAcquired??0,outcome,detail});}},onTransfer:t=>{const p=t.from.startsWith('person:')?w.byId.get(Number(t.from.split(':')[1])):undefined;if(p?.ent==='person'&&p.careJourney&&['acquire','return'].includes(p.careJourney.phase)&&t.to==='person:'+p.careJourney.to){count('units received during care journey',t.n);story({event:'receipt',tick:w.tick,...t});}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 for(const p of w.persons){const j=p.careJourney;if(!j)continue;const key=`${p.id}:${j.to}:${j.since}:${j.phase}`;if(!seen.has(key)){seen.add(key);count('care journey:'+j.phase);story({event:'journey',tick:w.tick,person:p.id,record:structuredClone(j)});}}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  for(const wh of Object.values(p.whereabouts))if(wh.room?.household&&wh.room.needsCare&&(wh.room.hungry||wh.room.thirsty)&&w.tick-wh.tick<=ROOM_CONTACT_MEMORY)count('sampled personally remembered resident need');
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);for(const o of ctx.options)if(o.key.startsWith('care_supply:')){count('sampled acquisition offers');if(ranked[0]?.key===o.key)count('sampled acquisition ranked first');}
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate household viability or mature Large performance. Repeated samples are not independent opportunities; a delivery/deposit does not by itself establish consumption or survival benefit.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
