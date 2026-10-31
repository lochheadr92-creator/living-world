// Ordinary estate custody screen; no forced deaths, possessions or collections.
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
import {describeEntity,describePerson} from '../src/sim/inspect';
import {TimeBudget} from './observers/time_budget';
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/estate_custody_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const counts:Record<string,number>={},stories:unknown[]=[],seen=new Set<number>(),starts=new Set<number>(),collectors=new Set<number>();let samples=0,pureChecks=0;
const count=(key:string,n=1)=>counts[key]=(counts[key]??0)+n;
const story=(event:unknown)=>{if(stories.length<160)stories.push(event);};
w.hooks={onActivityStart:(p,a)=>{const from=w.byId.get(Number(a.data.fromId??a.targetId));if(from?.ent==='pile'&&from.estate){starts.add(a.id);count('started:'+a.kind);story({event:'start',tick:w.tick,person:p.id,activity:a.id,kind:a.kind,from:from.id,owner:from.estate.hhId});}if(collectors.has(p.id)&&a.kind==='gather'){count('later gathering by collector');story({event:'collector work',tick:w.tick,person:p.id,activity:a.id,target:a.targetId});}},
 onActivityEnd:(p,a,outcome,detail)=>{if(starts.has(a.id)){count('ended:'+a.kind+':'+outcome);story({event:'end',tick:w.tick,person:p.id,activity:a.id,outcome,detail});}},
 onTransfer:info=>{const from=w.byId.get(Number(info.from.split(':')[1]));if(from?.ent!=='pile'||!from.estate)return;const to=w.byId.get(Number(info.to.split(':')[1]));const hh=to?.ent==='person'?to.hhId:to?.ent==='cart'?w.persons.find(p=>p.id===to.puller)?.hhId:undefined;
  if(from.estate.hhId!==0&&hh!==from.estate.hhId)throw new Error('Unauthorized estate transfer');count('units:'+info.item,info.n);story({event:'estate transfer',tick:w.tick,owner:from.estate.hhId,...info});if(to?.ent==='person')collectors.add(to.id);
 }
};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);for(const pile of w.piles)if(pile.estate&&!seen.has(pile.id)){seen.add(pile.id);count('estate parcels created');story({event:'estate parcel',tick:w.tick,id:pile.id,origin:{...pile.estate},items:{...pile.items}});}
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);for(const o of ctx.options){const e=w.byId.get(o.targetId);if(e?.ent==='pile'&&e.estate){count('sampled estate offers:'+o.kind);if(ranked[0]?.key===o.key)count('sampled estate ranked first:'+o.kind);}}
  for(const b of Object.values(p.beliefs)){const e=w.byId.get(b.id);if(e?.ent==='pile'&&e.estate)count('sampled remembered estate holdings');}
  observeInhabitant(w,p,ctx,ranked);describePerson(w,p.id);
 }for(const pile of w.piles)if(pile.estate)describeEntity(w,pile.id);if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,counts,stories,remaining:w.piles.filter(p=>p.estate).map(p=>({id:p.id,estate:p.estate,items:p.items})),timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence screen, not aggregate welfare, useful inheritance frequency or mature Large performance. Repeated samples are not independent opportunities. Later gathering alone does not prove recovered-tool use.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,counts,deaths:w.deceased,remaining:report.remaining,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
