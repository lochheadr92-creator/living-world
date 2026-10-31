// Fixed ordinary promised-supply screen: no induced asks, promises or choices. Optional fourth argument pins the rules version.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {expectedStatus} from '../src/sim/promise_expectations';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {TimeBudget} from './observers/time_budget';
const [seed,out,daysArg='5',budgetArg='170',rulesArg='']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/promised_supply_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const settings=currentWorldSettings('normal',seed,{immigration:false});if(rulesArg)settings.rulesVersion=Number(rulesArg);
const w=createWorld(settings),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],requestsSeen=new Set<string>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n,story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
const live=new Map<number,{from:number;item:string;dest:number}>();
w.hooks={onActivityStart:(p,a)=>{if(a.kind==='gather'||a.kind==='withdraw'){for(const m of p.socialMemory??[]){const e=m.expectation;if(e&&e.item&&e.item===a.item&&e.destId&&expectedStatus(w,p,m).status==='promised'&&e.amount>e.received){count('fetch started for an item still promised to the same person');story({event:'fetch-while-promised',tick:w.tick,person:p.id,item:a.item,activity:a.kind,goal:a.goal,by:e.otherName});break;}}}}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 for(const r of w.requests){const key=r.id+':'+r.status;if(requestsSeen.has(key))continue;requestsSeen.add(key);if(r.siteId&&(r.kind==='wood'||r.kind==='stone'||r.kind==='goods'||r.kind==='haul'))count('site material request:'+r.status);}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  for(const m of p.socialMemory??[]){const e=m.expectation;if(!e||!e.item||!e.destId)continue;const st=expectedStatus(w,p,m).status;if(st==='promised'&&e.amount>e.received)count('sampled live site promises');}
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);const waiting=ctx.blocked.filter(b=>/promised \d+ \w+, expected by tick/.test(b.blocked??''));if(waiting.length)count('sampled fetches set aside for a promise');
  if(ctx.options.some(o=>o.kind==='socialize'&&/^Ask .* for (wood|stone|planks|bricks)$/.test(o.label)))count('sampled site asks offered');
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
void live;detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate benefit. Repeated samples are not independent opportunities; a fetch set aside is not a delivered promise.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,rules:w.settings.rulesVersion,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
