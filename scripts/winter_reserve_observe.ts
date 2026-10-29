// Ordinary worlds, food reserves against winter: what households put by, where it goes, what spoils, what is eaten from
// stores, and who goes hungry in winter. Hooks and pure samples observe; nobody is controlled or repositioned.
// Usage: vite-node scripts/winter_reserve_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY,DAYS_PER_YEAR,isHomeType} from '../src/sim/constants';
import {WINTER_LENGTH} from '../src/sim/hardship';
import {generateOptions} from '../src/sim/decision';
import {conservationReport,foodUnits} from '../src/sim/economy';
import {membersOf} from '../src/sim/households';
import {parseIntervention} from './lab/lab';
import type {Intention} from '../src/sim/types';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/winter_reserve_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
writeFileSync(`${out}/provenance.json`,JSON.stringify({arm:arm||'current',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,days,budgetSeconds:240,observer:'transfer hook, ledger deltas, plan records and pure 240-tick samples'},null,2));
const winterStart=(d:number)=>d%DAYS_PER_YEAR===DAYS_PER_YEAR-WINTER_LENGTH;
const inWinter=(tick:number)=>Math.floor(tick/DAY)%DAYS_PER_YEAR>=DAYS_PER_YEAR-WINTER_LENGTH;
const flows:Record<string,number>={};const flowByDay:Record<string,number>[]=[];let dayFlow:Record<string,number>={};
const bump=(k:string,n:number)=>{flows[k]=(flows[k]??0)+n;dayFlow[k]=(dayFlow[k]??0)+n;};
const btype=(ref:string)=>{const id=Number(ref.split(':')[1]);const b=w.byId.get(id);return b&&b.ent==='building'?b.type:ref.split(':')[0];};
w.hooks={onTransfer(t){const food=['berries','fruit','fish','grain','bread','meat'].includes(t.item);if(!food)return;
 if(t.to.startsWith('building:'))bump(`deposit:${btype(t.to)}:${t.reason}`,t.n);if(t.from.startsWith('building:'))bump(`out:${btype(t.from)}:${t.reason}`,t.n);}};
let lastLedger:Record<string,number>={...w.ledger.reasons};
const plans=new Map<number,{person:number;name:string;cue?:string;reserve?:number;worked?:number;status:string;reason:string;adopted:number;ended?:number;until?:number}>();
const winters:unknown[]=[],samples:unknown[]=[],hungryWinter:unknown[]=[];const deathsByDay:Record<number,{name:string;cause:string}[]>={};let seenDeceased=0;
const totals:Record<string,number>={samples:0,winterSamples:0,winterHungry:0,winterHungryWithHomeFood:0,winterHungryNoEatStore:0,eatStoreOffers:0,eatStoreBlockedEmpty:0,depositOffers:0,depositBlockedFull:0};
const began=Date.now();let stop='horizon';
const storesNow=()=>{const home:Record<number,number>={};let granary=0,storehouse=0;for(const b of w.buildings){const f=foodUnits(b.store.items);if(isHomeType(b.type))home[b.hhId]=(home[b.hhId]??0)+f;else if(b.type==='granary')granary+=f;else if(b.type==='storehouse')storehouse+=f;}return{home,granary,storehouse};};
const householdRows=(label:string)=>w.households.map(hh=>{const ms=membersOf(w,hh).filter(m=>m.alive);const home=hh.homeId?w.buildings.find(b=>b.id===hh.homeId):undefined;return{label,tick:w.tick,hh:hh.id,name:hh.name,members:ms.length,home:home?.type??null,homeCond:home?Math.round(home.condition):null,homeFood:home?foodUnits(home.store.items):null,packFood:ms.reduce((n,m)=>n+foodUnits(m.inv),0),hungry:ms.filter(m=>m.needs.hunger<36).length};});
while(w.tick<days*DAY){stepWorld(w);
 for(const p of w.persons)for(const i of p.intentions as Intention[]){if(i.kind!=='stock')continue;const rec=plans.get(i.id);if(!rec)plans.set(i.id,{person:p.id,name:p.name,cue:(i as any).cue,reserve:(i as any).reserve,worked:(i as any).worked,status:i.status,reason:i.reason,adopted:(i as any).since??w.tick,until:(i as any).until});else{rec.status=i.status;rec.reason=i.reason;rec.worked=(i as any).worked;if(i.status!=='active'&&!rec.ended)rec.ended=w.tick;}}
 if(w.deceased.length>seenDeceased){const day=Math.floor(w.tick/DAY);(deathsByDay[day]??=[]).push(...w.deceased.slice(seenDeceased).map(d=>({name:d.name,cause:d.cause})));seenDeceased=w.deceased.length;}
 if(w.tick%DAY===0){const day=w.tick/DAY;const lr=w.ledger.reasons;for(const k of Object.keys(lr))if(/spoil|eaten/.test(k)){const d=(lr[k]??0)-(lastLedger[k]??0);if(d)bump(`ledger:${k}`,d);}lastLedger={...lr};
  flowByDay.push({day,...dayFlow,...Object.fromEntries(Object.entries(storesNow().home).map(([h,f])=>[`home:${h}`,f])),granary:storesNow().granary,storehouse:storesNow().storehouse});dayFlow={};
  if(winterStart(day))winters.push(...householdRows(`winter start day ${day}`));
  if(day%DAYS_PER_YEAR===0&&day>0)winters.push(...householdRows(`winter end day ${day}`));
  if(!conservationReport(w).ok){stop='invariant';break;}}
 if(w.tick%240===0){const before=serializeWorld(w),sample:Record<string,number>={tick:w.tick};const count=(key:string,n=1)=>{totals[key]=(totals[key]??0)+n;sample[key]=(sample[key]??0)+n;};const winter=inWinter(w.tick);
  for(const p of w.persons.filter(p=>p.alive)){count('samples');if(winter)count('winterSamples');const ctx=generateOptions(w,p,true,true);
   count('eatStoreOffers',ctx.options.filter(o=>o.kind==='eat_store').length);count('eatStoreBlockedEmpty',ctx.blocked.filter(o=>o.kind==='eat_store'&&/empty/.test(o.blocked??'')).length);
   count('depositOffers',ctx.options.filter(o=>o.kind==='deposit').length);count('depositBlockedFull',ctx.blocked.filter(o=>o.kind==='deposit'&&/full/.test(o.blocked??'')).length);
   if(winter&&p.needs.hunger<36){count('winterHungry');const hh=w.households.find(h=>h.id===p.hhId);const home=hh?.homeId?w.buildings.find(b=>b.id===hh.homeId):undefined;const homeFood=home?foodUnits(home.store.items):0;if(homeFood>=1)count('winterHungryWithHomeFood');const eat=ctx.options.find(o=>o.kind==='eat_store'||o.kind==='eat');if(!eat)count('winterHungryNoEatStore');
    hungryWinter.push({tick:w.tick,id:p.id,name:p.name,hunger:Math.round(p.needs.hunger),pack:foodUnits(p.inv),homeFood,home:home?.type??null,top:ctx.options.slice().sort((a,b)=>b.util-a.util).slice(0,2).map(o=>`${o.label}=${Math.round(o.util)}`),blocked:ctx.blocked.filter(o=>o.tag==='food').map(o=>`${o.label}:${o.blocked}`).slice(0,3),activity:p.activity?`${p.activity.kind}:${p.activity.label}`:''});}
  }samples.push(sample);if(serializeWorld(w)!==before){writeFileSync(`${out}/failure.json`,JSON.stringify({tick:w.tick,reason:'observer mutated state'}));throw new Error(`Observer mutated state at tick ${w.tick}`);}
  if(Date.now()-began>240000){stop='budget';break;}}
}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const planRows=[...plans.values()];const byCue=(cue:string)=>planRows.filter(p=>p.cue===cue);
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,deathsByDay,
 plans:{season:{adopted:byCue('season').length,done:byCue('season').filter(p=>p.status==='done').length,dropped:byCue('season').filter(p=>p.status==='dropped').length,unitsWorked:byCue('season').reduce((n,p)=>n+(p.worked??0),0),targets:byCue('season').map(p=>p.reserve)},
  hardship:{adopted:byCue('hardship').length,done:byCue('hardship').filter(p=>p.status==='done').length,dropped:byCue('hardship').filter(p=>p.status==='dropped').length,unitsWorked:byCue('hardship').reduce((n,p)=>n+(p.worked??0),0)}},
 flows,totals,buildings:w.buildings.map(b=>({type:b.type,hh:b.hhId,cond:Math.round(b.condition),food:foodUnits(b.store.items)})).filter(b=>b.food>0||b.type==='granary'||b.type==='storehouse'),hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,plans:planRows,flowByDay,winters,samples,hungryWinter}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify({...report,buildings:undefined}));if(stop!=='horizon')process.exitCode=1;
