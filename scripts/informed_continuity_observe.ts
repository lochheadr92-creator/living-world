// Fixed ordinary household-communication/continuity screen, without forced speech or deaths.
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
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/informed_continuity_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],seen=new Set<string>(),starts=new Set<number>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n;
const story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='socialize'&&a.data.purpose==='share_work'){starts.add(a.id);count('work conversations started');story({event:'start',tick:w.tick,person:p.id,target:a.targetId,activity:a.id,proposal:a.data.conv});}},
 onActivityEnd:(p,a,outcome,detail)=>{if(starts.has(a.id)){count('work conversation ended:'+outcome);story({event:'end',tick:w.tick,person:p.id,target:a.targetId,activity:a.id,outcome,detail});}},
 onTransfer:info=>{const p=w.byId.get(Number(info.from.split(':')[1]));if(info.from.startsWith('person:')&&p?.ent==='person'&&p.intentions.some(i=>i.succeeding&&i.status==='active')){count('units moved by active successor',info.n);story({event:'successor transfer',tick:w.tick,...info});}}
};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 for(const p of w.persons){for(const r of Object.values(p.relations)){
  for(const k of r.workHeard??[]){const key=`heard:${p.id}:${k.conversationId}`;if(!seen.has(key)){seen.add(key);count('undertakings heard');story({event:'heard',tick:w.tick,person:p.id,account:structuredClone(k)});}}
  for(const k of r.workTold??[])if(k.acknowledgedAt!==undefined){const key=`ack:${p.id}:${k.conversationId}`;if(!seen.has(key)){seen.add(key);count('undertakings acknowledged');story({event:'acknowledged',tick:w.tick,person:p.id,record:{...k}});}}
 }for(const i of p.intentions)if(i.succeeding){const key=`successor:${i.id}:${i.status}`;if(!seen.has(key)){seen.add(key);count('successor project:'+i.status);story({event:'successor project',tick:w.tick,person:p.id,plan:structuredClone(i)});}}}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);if(p.intentions.some(i=>i.status==='active'))count('sampled people with active projects');
  for(const o of ctx.options)if(o.key.includes('share_work')){count('sampled work-sharing offers');if(ranked[0]?.key===o.key)count('sampled work-sharing ranked first');}
  if(Object.values(p.relations).some(r=>r.deathKnown&&r.workHeard?.length))count('sampled informed death accounts');
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate household continuity, estate custody or mature Large performance. Repeated samples are not independent opportunities. Sharing information is not consenting to take over.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
