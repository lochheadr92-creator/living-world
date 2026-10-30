// Fixed ordinary occurrence/adverse screen. No forced scarcity, rain, choices or replenishment.
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
import {describeWater,waterViewId} from '../src/sim/inspect_water';
import {waterSign,setWaterBudget} from '../src/sim/hydrology';
import {isStoredDrink} from '../src/sim/stored_water_access';
import type {Activity} from '../src/sim/types';
import {TimeBudget} from './observers/time_budget';
const [seed,out,daysArg='5',budgetArg='170']=process.argv.slice(2).filter(a=>a!=='--'),days=Number(daysArg),budget=Number(budgetArg);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>365||!Number.isFinite(budget)||budget<=0)throw new Error('Seed, fresh output, integer days 1..365 and positive seconds budget required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/water_observe.ts','scripts/observers/time_budget.ts').sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false})),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const starts:Record<string,number>={},ends:Record<string,number>={},memories:Record<string,number>={},stories:unknown[]=[],adverse:unknown[]=[],changed:unknown[]=[];
const count=(o:Record<string,number>,k:string)=>o[k]=(o[k]??0)+1;
const kind=(a:Activity)=>a.kind==='fetch_water'?'fetch':a.kind!=='drink'?undefined:isStoredDrink(w,a)?'stored drink':a.data.fromInv?'carried drink':'shore drink';
let samples=0,pureChecks=0,lowOptions=0,dryBlocked=0,changedSamples=0,conditionStarts=0;
w.hooks={onActivityStart:(p,a)=>{const k=kind(a);if(!k)return;count(starts,k);if(/remembered (low|dry) water/.test(String(a.data.why??'')))conditionStarts++;},onActivityEnd:(p,a,outcome,detail)=>{const k=kind(a);if(!k)return;count(ends,k+':'+outcome);const record={tick:w.tick,person:p.id,kind:k,target:a.targetId,body:a.data.waterBody,cycles:a.cycle,outcome,detail,thirst:p.needs.thirst,carried:p.inv.water??0,belief:p.beliefs[a.targetId]?structuredClone(p.beliefs[a.targetId]):undefined};if(outcome==='failed'||outcome==='partial'){if(adverse.length<50)adverse.push(record);}else if(stories.length<40)stories.push(record);}};
const time=new TimeBudget(),detach=time.attach(w);let stop='horizon';
while(w.tick<days*2400){
 time.sampleTick(w);
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;samples++;for(const b of Object.values(p.beliefs))if(b.waterSupply)count(memories,b.waterSupply);const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);lowOptions+=ctx.options.filter(o=>o.parts.some(([s])=>/remembered (low|dry) water/.test(s))).length;dryBlocked+=ctx.blocked.filter(o=>o.blocked?.includes('dry shore')).length;observeInhabitant(w,p,ctx,ranked);let removed;setWaterBudget(false);try{removed=rankOptions(generateOptions(w,p,true,true))[0];}finally{setWaterBudget(true);}if(ranked[0]?.key!==removed?.key){changedSamples++;if(changed.length<30)changed.push({tick:w.tick,person:p.id,current:ranked[0]?.key,removed:removed?.key,reasons:ranked[0]?.parts});}}for(const b of w.waterBodies??[])describeWater(w,waterViewId(b));if(serializeWorld(w)!==before)throw new Error('Impure water observer');pureChecks++;}
 stepWorld(w);stepWorld(twin);if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');if(w.tick%120===0&&performance.now()-began>budget*1000){stop='budget';break;}
}
detach();delete w.hooks;const final=serializeWorld(w);if(final!==serializeWorld(twin))throw new Error('Unobserved twin changed');if(final!==serializeWorld(deserializeWorld(final)))throw new Error('Invalid final save');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during observation');
const bodies=(w.waterBodies??[]).map(b=>({id:b.id,tiles:b.tiles.length,capacity:b.capacity,amount:b.amount,drawn:b.drawn,replenished:b.replenished,evaporated:b.evaporated,sign:waterSign(b)}));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,days,budget,stop,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,samples,pureChecks,starts,ends,memories,lowOptions,dryBlocked,conditionStarts,changedSamples,changed,bodies,stories,adverse,timeBudget:time.report(),serializedBytes:Buffer.byteLength(final),continuationEqual:true,conservation:conservationReport(w),limits:'Short ordinary occurrence and adverse screen, not aggregate benefit, long drought recovery or mature Large performance. Repeated sampled observations are not independent opportunities.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,samples,pureChecks,starts,ends,lowOptions,dryBlocked,conditionStarts,changedSamples,bodies,conserved:report.conservation.ok}));if(stop!=='horizon')process.exitCode=1;
