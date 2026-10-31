// Fixed ordinary checked-accounts screen (rules 107): how often a first-hand account of a place is checked in person and
// what came of it, relayed accounts found short, disagreements logged, and sampled asks carrying the tally as a reason.
// Optional fourth argument pins the rules version.
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
import {gitProvenance,sourceManifest} from './observers/provenance';
const [seed,out,daysArg='5',budgetArg='170',rulesArg='']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/checked_accounts_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>sourceManifest(files),source=manifest();
const settings=currentWorldSettings('normal',seed,{immigration:false});if(rulesArg)settings.rulesVersion=Number(rulesArg);
const w=createWorld(settings),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[];let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n,story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
const tally=new Map<string,{checked:number;borneOut:number}>(),logsSeen=new Set<string>();
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  for(const [id,r] of Object.entries(p.relations)){const a=r.accounts;if(!a)continue;const key=p.id+':'+id,prev=tally.get(key)??{checked:0,borneOut:0};if(a.checked!==prev.checked||a.borneOut!==prev.borneOut){const dc=a.checked-prev.checked,db=a.borneOut-prev.borneOut;if(dc>0){count('accounts checked',dc);count('accounts borne out',Math.max(0,db));count('accounts not borne out',Math.max(0,dc-Math.max(0,db)));story({event:'account-checked',tick:w.tick,person:p.id,teller:Number(id),last:a.last});}tally.set(key,{checked:a.checked,borneOut:a.borneOut});}}
  for(const l of p.log.slice(-40)){const key=p.id+':'+l.tick+':'+l.text;if(logsSeen.has(key))continue;logsSeen.add(key);if(/passed on from somebody else about the .* was not borne out/.test(l.text))count('relayed accounts found short (held against nobody)');if(/Theirs is the newer sight, so I go by it/.test(l.text))count('disagreements with own earlier sight logged');}
  let told=0;for(const b of Object.values(p.beliefs))if(b.src==='told'&&b.hops===1&&['berry_bush','fruit_tree','wild_grain','fish_spot','rock','tree'].includes(b.kind))told++;count('sampled first-hand told source beliefs held',told);
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
  const asks=ctx.options.filter(o=>o.kind==='socialize'&&/^Ask .* where to find (food|wood|stone|water)$/.test(o.label));if(asks.length)count('sampled where-to-find asks offered');if(asks.some(o=>o.parts.some(([n])=>/of their accounts of places/.test(n))))count('sampled asks weighed by checked accounts');
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={...gitProvenance(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate benefit. Repeated samples are not independent opportunities; an account not borne out may have been stripped by others meanwhile; the listener cannot know that, which is the cost of local knowledge, not a defect.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,rules:w.settings.rulesVersion,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
