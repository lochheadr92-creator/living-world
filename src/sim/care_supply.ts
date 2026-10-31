// Acquisition for an already personally known care need. Existing actions own all work and transfers.
import {newActivity} from './activities';
import {careFoodAvailable,careWaterAvailable} from './care_capacity';
import {fetchableFood} from './food_help';
import {invRoom,foodUnits} from './economy';
import {foragePlans} from './options_survival';
import {Scorer,addBlocked,addOption,pen,rankWaterSpots,spotNear,traitMods} from './optutil';
import type {Ctx} from './optutil';
import {isAdultWorker,isDependent} from './people';
import {laidUp} from './responsibilities';
import {runsRulesVersion} from './rulesversion';
import {WORK,isSolidHome} from './constants';
import {activeCareJourney} from './care_journey';
import type {ItemKind,Person,World} from './types';
let enabled=true;
export const careSupplyOn=()=>enabled;
export const setCareSupply=(on:boolean):void=>{enabled=on;};
export const hasCareSupply=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,95);

/** A pure inventory estimate reuses the existing reserve owner; it neither reserves nor creates goods. */
function amountNeeded(ctx:Ctx,to:number,item:ItemKind):number{
 const {world,p}=ctx,room=Math.min(12,Math.floor(invRoom(world,p,item)));
 for(let n=1;n<=room;n++){
  const estimate={...p,inv:{...p.inv,[item]:(p.inv[item]??0)+n}};
  if((item==='water'?careWaterAvailable(world,estimate,to):careFoodAvailable(world,estimate,to,item))>=1)return n;
 }
 return 0;
}

/** Caller has checked fresh household room contact and a personally known usable home. */
export function careSupplyOptions(ctx:Ctx,q:Pick<Person,'id'|'name'>,hungry:boolean,thirsty:boolean,seen:number):void{
 const {world,p}=ctx;
 if(!hasCareSupply(world)||!isAdultWorker(world,p)||isDependent(world,p)||laidUp(world,p)||ctx.criticals.length||ctx.dangers.length||ctx.drives.hunger>30||ctx.drives.thirst>30||ctx.drives.energy>45)return;
 const journey=activeCareJourney(p);
 if(journey&&(journey.to!==q.id||journey.attempts>=2))return;
 if(journey){if(journey.item==='water')hungry=false;else thirsty=false;}
 if(!journey&&p.careJourney?.to===q.id&&p.careJourney.seen>=seen)return;
 const room=p.whereabouts[q.id]?.room,home=room?p.beliefs[room.homeId]:undefined;
 // Reuse personally remembered accessible supplies before another acquisition.
 if(hungry&&home&&foodUnits(home.items??{})>0){hungry=false;addBlocked(ctx,'gather',`Obtain food for ${q.name}`,q.id,'remembers food already waiting in our home','care');}
 if(thirsty&&home&&isSolidHome(home.btype)&&(home.items?.water??0)>0){thirsty=false;addBlocked(ctx,'fetch_water',`Obtain water for ${q.name}`,q.id,'remembers water already waiting in our home','care');}
 // One recipient per decision, at most three food sources or one water source.
 if(ctx.options.some(o=>o.key.startsWith('care_supply:')))return;
 if(thirsty&&careWaterAvailable(world,p,q.id)<1){
  const n=amountNeeded(ctx,q.id,'water'),spot=rankWaterSpots(ctx,1)[0];
  if(!n||!spot){addBlocked(ctx,'fetch_water',`Obtain water for ${q.name}`,q.id,!n?'no room for a spare portion while keeping my reserves and promises':'no personally known usable water source','care');return;}
  const sc=new Scorer().add(`${q.name} was thirsty at our last room contact`,54*traitMods(p).give).add('a household member needs practical care',14*traitMods(p).give).add('walking',-pen(spot.e));
  if(spot.dng)sc.add('wolf nearby',-30*spot.dng*traitMods(p).caution);
  if(spot.trouble)sc.add('was driven off near here',-16*spot.trouble);
  if(spot.supplyCost)sc.add('remembered water shortage',-spot.supplyCost);
  const goal=`to obtain water for ${q.name}, last seen needing it at tick ${seen}`,b=spot.b;
  addOption(ctx,{kind:'fetch_water',label:`Fetch water for ${q.name}`,goal,need:null,util:sc.total,parts:sc.parts,eta:spot.e+n*WORK.water,key:`care_supply:${q.id}:water:${b.id}`,targetId:b.id,tag:'care',scopeEstimate:{walk:spot.e,work:WORK.water,amount:n,item:'water'},
   bounds:[{kind:'count',field:'amount',min:1,max:n,note:'enough for a spare portion after personal reserves and promises'}],
   make:()=>{const at=spotNear(world,p,b);if(!at)return null;return newActivity(world,p,{kind:'fetch_water',label:`Fetching water for ${q.name}`,goal,targetId:b.id,targetType:'tile',tx:at.x,ty:at.y,spotX:at.x,spotY:at.y,amount:n,utility:sc.total,minCommit:40,maxTicks:600,data:{careSupply:{to:q.id,seen}}});}});
  return;
 }
 if(!hungry)return;
 const item=fetchableFood(world,p);
 if(!item){addBlocked(ctx,'gather',`Obtain food for ${q.name}`,q.id,'no personally known food source believed to hold a spare portion','care');return;}
 if(careFoodAvailable(world,p,q.id,item)>=1)return;
 const n=amountNeeded(ctx,q.id,item);
 if(!n){addBlocked(ctx,'gather',`Obtain food for ${q.name}`,q.id,'no room for a spare portion while keeping my reserves and promises','care');return;}
 foragePlans(ctx,{urgency:72*traitMods(p).give,mode:'stock',baseLabel:`${q.name} was hungry and needed care at our last room contact`,only:item,supplyFor:{id:q.id,name:q.name,seen,amount:n}});
}

/** Retain the selected return purpose without bypassing ordinary option eligibility or urgency. */
export function prioritizeCareReturn(ctx:Ctx):void{
 const j=activeCareJourney(ctx.p);if(!hasCareSupply(ctx.world)||!j||j.phase!=='return'||ctx.world.tick>=j.until)return;
 for(const o of ctx.options){
  if(o.tag!=='care'||!(o.kind==='give'&&o.targetId===j.to||o.kind==='deposit'&&o.key.endsWith(':'+j.to)))continue;
  o.util+=32;o.parts.push([`return with the supplies I obtained for ${j.name}`,32]);
  o.selectionReason=[o.selectionReason,`my care journey began at tick ${j.since}; actual receipt remains unconfirmed`].filter(Boolean).join(' · ');
 }
}

export function validateCareSupply(w:World):void{
 for(const p of w.persons){
  const j=p.careJourney;
  if(j&&(typeof j.name!=='string'||j.name.length>120||j.received!==undefined&&(!Number.isSafeInteger(j.received)||j.received<=0||j.received>12)||['delivered','deposited'].includes(j.phase)&&(j.ended===undefined||j.received===undefined)||j.phase==='failed'&&j.ended===undefined))throw new Error('Invalid care journey outcome');
  if(j&&(w.settings.dynamics!=='rich'||!runsRulesVersion(w,95)||!Number.isSafeInteger(j.to)||j.to<=0||j.to===p.id||typeof j.name!=='string'||!Number.isSafeInteger(j.seen)||j.seen<0||j.seen>w.tick||!Number.isSafeInteger(j.since)||j.since<j.seen||j.since>w.tick||j.until!==j.seen+700||!Number.isSafeInteger(j.attempts)||j.attempts<1||j.attempts>2||!['water','berries','fruit','grain','fish'].includes(j.item)||!['acquire','return','delivered','deposited','failed'].includes(j.phase)||typeof j.reason!=='string'||j.reason.length>400||j.ended!==undefined&&(!Number.isSafeInteger(j.ended)||j.ended<j.since||j.ended>w.tick)))throw new Error('Invalid personal care journey');
 for(const a of [p.activity,p.suspended]){
  const c=a?.data?.careSupply;if(c===undefined)continue;
  const acquired=a!.data.careAcquired;
  if(acquired!==undefined&&(!Number.isSafeInteger(acquired)||acquired<0||acquired>a!.cycle))throw new Error('Invalid care acquisition receipt');
  if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,95)||!['gather','fetch_water'].includes(a!.kind)||!c||!Number.isSafeInteger(c.to)||c.to<=0||c.to===p.id||!Number.isSafeInteger(c.seen)||c.seen<0||c.seen>w.tick)throw new Error('Invalid personal care supply purpose');
 }
 }
}
