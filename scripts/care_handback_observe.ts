// Fixed ordinary childcare screen: no induced injury, recovery, requests or choices.
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
import {laidUp} from '../src/sim/responsibilities';
import {careReturns} from '../src/sim/care_handback';
import {TimeBudget} from './observers/time_budget';
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/care_handback_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],seen=new Set<string>(),starts=new Set<number>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n,story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
w.hooks={onActivityStart:(p,a)=>{if(a.data.watch||a.data.purpose==='return_care'){starts.add(a.id);count('start:'+(a.data.watch?'watch':'return'));story({event:'start',tick:w.tick,person:p.id,activity:a.id,kind:a.kind,goal:a.goal});}},onActivityEnd:(p,a,outcome,detail)=>{if(starts.has(a.id)){count('ending:'+a.kind+':'+outcome);story({event:'ending',tick:w.tick,person:p.id,activity:a.id,kind:a.kind,watched:a.data.watchedTicks,outcome,detail});}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 for(const r of w.requests){if(r.kind!=='watch')continue;const key=r.id+':'+r.status;if(!seen.has(key)){seen.add(key);count('request:'+r.status);story({event:'request',tick:w.tick,request:structuredClone(r)});}}
 for(const p of w.persons)for(const m of p.socialMemory??[]){const h=m.careHandback;if(m.role!=='asker'||!h)continue;const key=m.requestId+':'+h.conversationId+':'+h.state;if(!seen.has(key)){seen.add(key);count('return:'+h.state);story({event:'return',tick:w.tick,person:p.id,receipt:structuredClone(h)});}}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  if(laidUp(w,p))count('sampled incapacity');for(const c of p.commitments)if(c.milestone==='watched'&&c.status==='active')count('sampled active watch');
  count('sampled own recovery agreements',careReturns(w,p).length);
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);for(const o of ctx.options)if(o.tag==='care-return'){count('sampled return offers');if(ranked[0]?.key===o.key)count('sampled return ranked first');}
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate household viability or mature Large performance. Repeated samples are not independent opportunities; actual handback is not sustained child welfare evidence.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
