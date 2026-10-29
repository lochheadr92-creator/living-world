// Ordinary worlds, food help (rules 45) and the question "who starves while food is near?". Hooks and pure samples observe;
// nobody is controlled or repositioned. Usage: vite-node scripts/food_help_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [noseek|nofetch]
// An arm installs one lab switch for a same-seed comparison; it is not a paired control/nudge measurement.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {generateOptions} from '../src/sim/decision';
import {conservationReport,foodUnits} from '../src/sim/economy';
import {membersOf,householdById} from '../src/sim/households';
import {surplusOf} from '../src/sim/social';
import {hyp} from '../src/sim/util';
import type {FoodKind,Person} from '../src/sim/types';
import {setSeekCarer} from '../src/sim/welfare';
import {setFoodFetch} from '../src/sim/food_help';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(arm&&!['noseek','nofetch'].includes(arm))throw new Error('arm must be noseek or nofetch');
if(arm==='noseek')setSeekCarer(false);if(arm==='nofetch')setFoodFetch(false);
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/food_help_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const source=manifest();
// an explicit older rules version is a comparison run of the same seed under earlier rules, not a paired control
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
writeFileSync(`${out}/provenance.json`,JSON.stringify({arm:arm||'current',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,days,budgetSeconds:240,observer:'request/transfer/activity hooks, death-moment snapshots from the previous tick, pure 240-tick samples'},null,2));
const FOODS:FoodKind[]=['berries','fruit','fish','grain','bread','meat'];
const packFood=(p:Person)=>foodUnits(p.inv)+(p.inv.meat??0);
const requests=new Map<number,unknown>(),deliveries:unknown[]=[],deaths:unknown[]=[],samples:unknown[]=[],carriedHungry:unknown[]=[],selected:unknown[]=[],seeks:{tick:number;person:number;name:string;label:string;target:number;hunger:number;outcome?:string}[]=[];
const totals:Record<string,number>={samples:0,foodAskOffers:0,foodAskBlocked:0,foodAskTrustLeaned:0,seekOffers:0,seekBlocked:0,hungryWithFood:0,hungryWithFoodNoEatOption:0,hungryWithFoodEatBlocked:0};
let snapshot=new Map<number,{name:string;hh:number;x:number;y:number;hunger:number;food:number;inv:Record<string,number>;act:string}>();
const snap=()=>{snapshot=new Map(w.persons.filter(p=>p.alive).map(p=>[p.id,{name:p.name,hh:p.hhId,x:p.x,y:p.y,hunger:p.needs.hunger,food:packFood(p),inv:{...p.inv},act:p.activity?`${p.activity.kind}:${p.activity.label}`:''}]));};
w.hooks={onActivityStart(p,a){if(a.kind==='socialize'&&(a.data.reqKind==='food'||a.data.reqKind==='care'))selected.push({tick:w.tick,person:p.id,name:p.name,label:a.label,target:a.targetId});if(a.kind==='visit'&&a.data.seek)seeks.push({tick:w.tick,person:p.id,name:p.name,label:a.label,target:a.targetId,hunger:Math.round(p.needs.hunger)});},onTransfer(t){if(t.reason==='given'||t.reason==='gift on request')deliveries.push({tick:w.tick,...t});}};
const began=Date.now();let stop='horizon';let seenDeceased=0;
snap();
while(w.tick<days*DAY){stepWorld(w);
 for(const r of w.requests)if(r.kind==='food'||r.kind==='care'||r.kind==='water')requests.set(r.id,{...r});
 if(w.deceased.length>seenDeceased){for(const d of w.deceased.slice(seenDeceased)){const was=snapshot.get(d.id);const hh=householdById(w,was?.hh??0);
   const members=hh?membersOf(w,hh).filter(m=>m.id!==d.id&&m.alive).map(m=>({id:m.id,name:m.name,food:packFood(m),surplus:FOODS.reduce((n,k)=>n+surplusOf(w,m,k),0),dist:was?Math.round(hyp(m.x-was.x,m.y-was.y)):null,hunger:Math.round(m.needs.hunger)})):[];
   const home=hh?.homeId?w.buildings.find(b=>b.id===hh.homeId):undefined;
   deaths.push({tick:w.tick,id:d.id,name:d.name,cause:d.cause,age:d.age,packFoodBefore:was?.food??null,invBefore:was?.inv??null,hungerBefore:was?.hunger??null,activityBefore:was?.act??null,homeFood:home?foodUnits(home.store.items):null,membersWithSpare:members.filter(m=>m.surplus>=1).length,members});}
  seenDeceased=w.deceased.length;}
 snap();
 if(w.tick%240===0){const before=serializeWorld(w),sample:Record<string,number>={tick:w.tick};
  const count=(key:string,n=1)=>{totals[key]=(totals[key]??0)+n;sample[key]=(sample[key]??0)+n;};
  for(const p of w.persons.filter(p=>p.alive)){count('samples');const ctx=generateOptions(w,p,true,true);
   count('foodAskOffers',ctx.options.filter(o=>o.kind==='socialize'&&o.tag==='request'&&/ for food$/.test(o.label)).length);
   count('foodAskBlocked',ctx.blocked.filter(o=>o.tag==='request'&&/ for food$/.test(o.label)).length);
   count('foodAskTrustLeaned',ctx.options.filter(o=>o.kind==='socialize'&&o.tag==='request'&&/ for food$/.test(o.label)&&o.parts.some(([n])=>n==='they came through before'||n==='they let me down before')).length);
   count('seekOffers',ctx.options.filter(o=>o.key.startsWith('seek:')).length);count('seekBlocked',ctx.blocked.filter(o=>/^Go and find /.test(o.label)).length);
   if(p.needs.hunger<30&&packFood(p)>=1){count('hungryWithFood');const eat=ctx.options.find(o=>o.kind==='eat');const blocked=ctx.blocked.find(o=>o.kind==='eat');
    if(!eat){count('hungryWithFoodNoEatOption');if(blocked)count('hungryWithFoodEatBlocked');}
    carriedHungry.push({tick:w.tick,id:p.id,name:p.name,hunger:Math.round(p.needs.hunger),inv:{...p.inv},eat:eat?Math.round(eat.util):null,blocked:blocked?.blocked??null,top:ctx.options.slice().sort((a,b)=>b.util-a.util).slice(0,2).map(o=>`${o.label}=${Math.round(o.util)}`),activity:p.activity?`${p.activity.kind}:${p.activity.label}`:''});}
  }samples.push(sample);if(serializeWorld(w)!==before){writeFileSync(`${out}/failure.json`,JSON.stringify({tick:w.tick,reason:'observer mutated state'}));throw new Error(`Observer mutated state at tick ${w.tick}`);}
  if(Date.now()-began>240000){stop='budget';break;}}
 if(w.tick%DAY===0&&!conservationReport(w).ok){stop='invariant';break;}
}
for(const k of seeks){const p=w.persons.find(q=>q.id===k.person);const t=w.persons.find(q=>q.id===k.target);const name=t?.name??'';const line=p?.log.find(l=>l.tick>=k.tick&&l.tick<=k.tick+900&&(l.text===`Found ${name}.`||l.text.includes(`${name} was not where I expected`)));k.outcome=line?(line.text.startsWith('Found')?'found':'not there'):p?'other':'died';}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const reqs=[...requests.values()] as {kind:string;status:string;note:string;delivered?:number;offered?:number;commitmentId?:number;to:number}[];
const byOutcome:Record<string,number>={};for(const r of reqs)if(r.kind!=='water'){const k=`${r.status}${r.status==='declined'?':'+r.note:''}`;byOutcome[k]=(byOutcome[k]??0)+1;}
const foodReqs=reqs.filter(r=>r.kind!=='water');
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:deaths.length,deathCauses:deaths.reduce((m:Record<string,number>,d:any)=>{m[d.cause]=(m[d.cause]??0)+1;return m;},{}),
 foodRequests:foodReqs.length,foodRequestOutcomes:byOutcome,fetchPromises:foodReqs.filter(r=>r.commitmentId).length,
 promisedDelivered:foodReqs.filter(r=>r.commitmentId&&(r.delivered??0)>0).length,promisedDeliveredUnits:foodReqs.filter(r=>r.commitmentId).reduce((n,r)=>n+(r.delivered??0),0),
 giftsOnRequest:deliveries.filter((d:any)=>d.reason==='gift on request').length,gives:deliveries.filter((d:any)=>d.reason==='given').length,seeks:seeks.length,seekOutcomes:seeks.reduce((m:Record<string,number>,k)=>{m[k.outcome??'?']=(m[k.outcome??'?']??0)+1;return m;},{}),
 doorPromises:w.persons.reduce((n,p)=>n+p.commitments.filter(c=>c.kind==='deliver'&&c.destKind==='building'&&foodReqs.some(r=>r.commitmentId===c.id)).length,0),doorDeliveries:w.persons.reduce((n,p)=>n+p.log.filter(l=>/at our door, as promised/.test(l.text)).length,0),
 totals,deathsWithFoodInPack:deaths.filter((d:any)=>(d.packFoodBefore??0)>=1).length,hungerDeathsWithSpareInHousehold:deaths.filter((d:any)=>d.cause==='hunger'&&d.membersWithSpare>0).length,
 hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,requests:foodReqs,deliveries,deaths,samples,carriedHungry,selected,seeks}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify(report));if(stop!=='horizon')process.exitCode=1;
