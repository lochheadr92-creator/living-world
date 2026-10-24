// Household relocation owns agreements and their bounded history. Movement, stores,
// hauling and construction retain their existing owners. Rules 20; never a player order.
import type { Activity, Belief, Household, Items, Person, World } from './types';
import type { Ctx } from './optutil';
import { addBlocked, addOption, beliefsByKind, foodCount } from './optutil';
import { newActivity, registerHandler } from './activities';
import { BUILD_DEF, DAY } from './constants';
import { runsRulesVersion } from './rulesversion';
import { householdById, membersOf } from './households';
import { findBuildSpot } from './buildings';
import { isWaterAccess } from './registry';
import { roomFor } from './economy';
import { carryCap } from './people';
import { stageOf } from './people';
import { affinityOf, trustOf } from './relations';
import { senseRadius } from './perception';
import { learn } from './knowledge';
import { addEvent } from './events';
import { addSettlement } from './settlements';
import { hyp } from './util';

export interface Relocation {
 id: number; organiserId: number; fromTownship: number; oldHomeId: number;
 meeting: {x:number;y:number};
 started: number; deadline: number; phase: 'asking'|'packing'|'travelling'|'building'|'settled'|'failed';
 destination: { x: number; y: number; water: Belief; food: Belief };
 reason: string; outcome: string; ended?: number; townshipId?: number;
 members: { id: number; response: 'pending'|'accepted'|'refused'|'dependent'; reason: string; tick: number }[];
}
let enabled = true;
export const relocationsOn = (): boolean => enabled;
export function setRelocations(on: boolean): void { enabled = on; }
export const hasRelocation = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 20);
const active = (r: Relocation): boolean => r.phase !== 'failed' && r.phase !== 'settled';
export const currentRelocation = (hh: Household | undefined): Relocation | undefined => hh?.relocations?.find(active);
const near = (a: {x:number;y:number}, b: {x:number;y:number}, radius=3): boolean => hyp(a.x-b.x,a.y-b.y)<=radius;
const contact = (a: Person,b: Person): boolean => a.alive && b.alive && !a.indoors && !b.indoors && near(a,b) && !b.convId && b.pose!=='sleep';
const fresh = (w: World,b: Belief): boolean => (b.kind==='water'||b.amount>0) && w.tick-b.seen<=DAY*2;
const foodKinds = ['berry_bush','fruit_tree','fish_spot'] as const;

/** Personal sustained hardship, sampled in the simulation, never in an observer read. */
export function updateRelocationPressure(w: World,p: Person): void {
 if(!hasRelocation(w))return;
 if(p.needs.hunger<45 && foodCount(p.inv)<2) p.relocationHardship ??= w.tick;
 else delete p.relocationHardship;
}
/** Only remembered water and food, not a map-wide resource search. */
export function relocationDestination(w: World,p: Person): Relocation['destination'] | undefined {
 const hh=householdById(w,p.hhId);const town=w.townships?.find(t=>t.id===hh?.townshipId);
 const anchor=town??p;
 for(const water of beliefsByKind(p,['water']).filter(b=>fresh(w,b)).sort((a,b)=>hyp(a.x-p.x,a.y-p.y)-hyp(b.x-p.x,b.y-p.y)||a.id-b.id)){
  if(near(water,anchor,22)||!near(water,p,50))continue;
  const food=beliefsByKind(p,[...foodKinds]).find(b=>fresh(w,b)&&near(water,b,8));
  if(food)return {x:water.x,y:water.y,water:{...water},food:{...food}};
 }
 return undefined;
}
function finish(w: World,p: Person,r: Relocation,reason: string): void {
 r.phase='failed';r.outcome=reason;r.ended=w.tick;
 p.cooldowns['relocation:retry']=w.tick+DAY;
 addEvent(w,'social',`${p.name}'s household relocation stopped: ${reason}.`,[p.id],p.x,p.y);
}
/** An offered response is based on the respondent, not the proposer's wealth or household title. */
export function relocationResponse(w: World,p: Person,organiser: Person): string | null {
 if(p.health<40||p.needs.hunger<25||p.needs.thirst<30)return 'needs to recover before travelling';
 if(trustOf(p,organiser.id)<-10||affinityOf(p,organiser.id)<-20)return 'does not trust this organiser with the journey';
 if(p.commitments.some(c=>c.status==='active'))return 'has an unfinished promise here';
 return null;
}
function supplied(w: World,hh: Household): boolean {
 const people=membersOf(w,hh);
 return people.reduce((n,p)=>n+foodCount(p.inv),0)>=people.length*2 && people.reduce((n,p)=>n+(p.inv.water??0),0)>=people.length*2;
}
function assembled(w: World,p: Person,r: Relocation): boolean {
 return r.members.every(m=>{const q=w.byId.get(m.id);return q?.ent==='person'&&contact(p,q)&&q.hhId===p.hhId;});
}
function knowSuitable(w: World,p: Person,r: Relocation): boolean {
 // Only arrival may inspect the real water access. Food must be freshly seen there.
 return near(p,r.destination,8)&&isWaterAccess(w,Math.floor(r.destination.x),Math.floor(r.destination.y)) &&
  beliefsByKind(p,[...foodKinds]).some(b=>b.amount>0&&b.src==='seen'&&w.tick-b.seen<120&&near(b,r.destination,10));
}
function offer(ctx: Ctx,step: string,label: string,r?: Relocation,target?: Person): void {
 const {w,p}= {w:ctx.world,p:ctx.p};
 const moving=step==='travel'||step==='rally';
 const to=target??(step==='travel'?r!.destination:step==='rally'?r!.meeting:p);
 addOption(ctx,{kind:'relocate',key:`relocate:${r?.id??0}:${step}:${target?.id??0}`,label,goal:r?.reason??'sustained hunger and a remembered food and water opportunity',need:null,util:48,parts:[['household relocation',48]],eta:60+hyp(p.x-to.x,p.y-to.y)/ctx.speed,targetId:target?.id??0,tag:'relocation',
 make:()=>newActivity(w,p,{kind:'relocate',label,goal:r?.reason??'seek a known opportunity together',targetId:target?.id??0,targetType:target?'person':'',tx:to.x,ty:to.y,spotX:to.x,spotY:to.y,here:!moving&&!target,duration:moving?1:60,maxTicks:DAY,utility:48,data:{relocation:r?.id??0,step}})});
}
export function relocationOptions(ctx: Ctx): void {
 const {world:w,p,hh}=ctx;if(!hasRelocation(w)||!hh||p.indoors)return;
 const r=currentRelocation(hh);
 if(!r){
  if(ctx.stage!=='adult'||p.relocationHardship===undefined||w.tick-p.relocationHardship<DAY||(p.cooldowns['relocation:retry']??0)>w.tick||hh.relocations?.some(q=>q.ended!==undefined&&w.tick-q.ended<DAY))return;
  if(membersOf(w,hh).every(q=>contact(p,q))&&relocationDestination(w,p))offer(ctx,'propose','Propose moving to known food and water');
  return;
 }
 const m=r.members.find(m=>m.id===p.id);if(!m)return;
 if(w.tick>r.deadline){offer(ctx,'stop','End the overdue relocation',r);return;}
 if(m.response==='pending'||m.response==='refused')return;
 if(r.phase==='asking'){
  if(!near(p,r.meeting,1.5))offer(ctx,'rally','Return to the household discussion',r);
  if(p.id!==r.organiserId)return;
  const pending=r.members.find(m=>m.response==='pending');
  const q=pending?w.byId.get(pending.id):undefined;
  if(assembled(w,p,r)&&q?.ent==='person' && p.seen.some(s=>s.id===q.id)&&!q.convId&&q.pose!=='sleep')offer(ctx,'ask',`Discuss relocation with ${q.name}`,r,q);
  else if(!pending&&assembled(w,p,r))offer(ctx,'prepare','Prepare the household journey',r);
  return;
 }
 if(r.phase==='packing'){
  if(!near(p,r.meeting,1.5))offer(ctx,'rally','Gather at the agreed departure place',r);
  if(ctx.stage==='child')return;
  const store=beliefsByKind(p,['building']).find(b=>b.hh===p.hhId&&b.id===r.oldHomeId);
  const wanted:Items={};
  if(store){
   for(const k of ['berries','fruit','fish','grain','water','wood'] as const){
    const target=k==='wood'?BUILD_DEF.lean_to.cost.wood??3:k==='water'?2*r.members.length:Math.max(0,2*r.members.length-foodCount(p.inv));
    const n=Math.min(store.items?.[k]??0,Math.max(0,target-(k==='water'||k==='wood'?(p.inv[k]??0):0)));
    if(n>0&&roomFor(p.inv,carryCap(w,p),k)>0)wanted[k]=n;
   }
   if(Object.keys(wanted).length)addOption(ctx,{kind:'withdraw',key:`relocate-pack:${r.id}:${store.id}`,label:'Pack household provisions for the journey',goal:r.reason,need:null,util:49,parts:[['prepare journey',49]],eta:80,targetId:store.id,tag:'relocation',make:()=>newActivity(w,p,{kind:'withdraw',label:'Packing household provisions',goal:r.reason,targetId:store.id,tx:store.x,ty:store.y,spotX:store.x+0.5,spotY:store.y+BUILD_DEF[(store.btype??'lean_to') as keyof typeof BUILD_DEF].h+0.5,utility:49,data:{items:wanted,relocation:r.id}})});
  }
  if(p.id===r.organiserId){
   if(assembled(w,p,r)&&supplied(w,hh))offer(ctx,'depart','Depart together for known food and water',r);
   else addBlocked(ctx,'relocate','Depart with the household',0,'waiting for everyone nearby and two food and water units per person','relocation');
  }
  return;
 }
 if(r.phase==='travelling'){
  if(!near(p,r.destination,3)){
   // A dependent only takes the agreed route with an adult currently in sight.
   if(ctx.stage!=='child'||ctx.seenPersons.some(s=>r.members.some(m=>m.id===s.id&&m.response==='accepted')))offer(ctx,'travel','Travel to the agreed household destination',r);
  }else if(p.id===r.organiserId&&assembled(w,p,r))offer(ctx,'arrive','Check the destination together',r);
  return;
 }
 if(r.phase==='building'&&p.id===r.organiserId){
  if(!near(p,r.destination,8)){offer(ctx,'travel','Return to the agreed destination',r);return;}
  const knownHome=beliefsByKind(p,['building']).find(b=>b.hh===hh.id&&b.id!==r.oldHomeId&&b.btype==='lean_to'&&near(b,r.destination,12));
  const home=knownHome;
  if(home&&home.id!==r.oldHomeId&&near(home,r.destination,12)&&assembled(w,p,r))offer(ctx,'found','Establish our household at the completed shelter',r);
  else if(!beliefsByKind(p,['site']).some(b=>b.hh===p.hhId))addOption(ctx,{kind:'plan_site',key:`relocate-shelter:${r.id}`,label:'Lay out shelter at the destination',goal:r.reason,need:null,util:48,parts:[['shelter after arrival',48]],eta:80,targetId:0,tag:'build',make:()=>{
   const spot=findBuildSpot(w,p,'lean_to',p.x,p.y,2,7,6);if(!spot)return null;
   return newActivity(w,p,{kind:'plan_site',label:'Marking out relocation shelter',goal:r.reason,tx:spot.x,ty:spot.y,spotX:spot.x+0.5,spotY:spot.y+BUILD_DEF.lean_to.h+0.5,maxTicks:700,utility:48,data:{type:'lean_to',sx:spot.x,sy:spot.y,hh:hh.id,relocation:r.id}});
  }});
 }
}
registerHandler('relocate',{
 travelBlocker:relocationTravelBlocker,
 availability:0.5,pose:a=>a.data.step==='ask'?'talk':'stand',
 begin(w,p,a){
  if(!hasRelocation(w))return 'relocation is unavailable';
  const hh=householdById(w,p.hhId),r=currentRelocation(hh);
  if(a.data.step==='propose'){if(r)return 'the household already has a proposal';}
  else if(!r||r.id!==a.data.relocation)return 'the household journey has ended';
  if(a.data.step==='ask'){const q=w.byId.get(a.targetId);if(q?.ent!=='person'||!contact(p,q))return 'cannot discuss the journey without contact';}
 },
 work(w,p,a){
  const hh=householdById(w,p.hhId);if(!hh)return 'fail:household no longer exists';
  let r=currentRelocation(hh);const step=a.data.step;
  if(step!=='propose'&&(!r||r.id!==a.data.relocation))return 'fail:the household journey has ended';
  if(step==='ask'){const q=w.byId.get(a.targetId);if(q?.ent!=='person'||!contact(p,q))return 'fail:the discussion was interrupted';}
  if(++a.progress<a.duration)return 'continue';
  if(step==='propose'){
   if(r)return 'fail:another household proposal was agreed first';
   const destination=relocationDestination(w,p);if(!destination||p.relocationHardship===undefined||w.tick-p.relocationHardship<DAY)return 'fail:the reason or known opportunity has changed';
   const members=membersOf(w,hh);
   if(!members.every(q=>contact(p,q)))return 'fail:the household must hear the proposal together';
   r={id:w.nextId++,organiserId:p.id,fromTownship:hh.townshipId??0,oldHomeId:hh.homeId,meeting:{x:p.x,y:p.y},started:w.tick,deadline:w.tick+DAY*4,phase:'asking',destination,reason:'a day of hunger with little carried food; remembered food beside distant water',outcome:'',members:members.map(q=>({id:q.id,response:q===p?'accepted':'pending',reason:q===p?'proposed the journey':'has not been asked',tick:w.tick}))};
   (hh.relocations??=[]).push(r);if(hh.relocations.length>8)hh.relocations.shift();
   addEvent(w,'social',`${p.name} proposed a household move to remembered food and water.`,[p.id],p.x,p.y);return 'done';
  }
  if(!r)return 'fail:no relocation agreement';
  if(step==='stop'){finish(w,p,r,'the agreed time ran out; the household did not establish shelter together');return 'done';}
  if(w.tick>r.deadline)return 'fail:the agreed journey time has run out';
  if(step==='ask'){
   if(!assembled(w,p,r))return 'fail:the household discussion became separated';
   const q=w.byId.get(a.targetId) as Person;const m=r.members.find(m=>m.id===q.id);
   if(!m||m.response!=='pending'||q.hhId!==hh.id)return 'fail:the household response has changed';
   const refusal=relocationResponse(w,q,p);m.response=refusal?'refused':stageOf(w,q)==='child'?'dependent':'accepted';m.reason=refusal??(stageOf(w,q)==='child'?'heard the route; will travel with household adults':'agrees to try the known opportunity with the household');m.tick=w.tick;
   learn(q,{...r.destination.water,src:'told',from:p.id,learned:w.tick});learn(q,{...r.destination.food,src:'told',from:p.id,learned:w.tick});
   addEvent(w,'social',`${q.name} ${refusal?'refused':'accepted'} ${p.name}'s relocation proposal: ${m.reason}.`,[p.id,q.id],p.x,p.y);
   if(refusal)finish(w,p,r,`${q.name} refused: ${refusal}`);return 'done';
  }
  if(step==='prepare'){
   if(!assembled(w,p,r))return 'fail:the household must hear the departure agreement together';
   if(r.members.some(m=>m.response==='pending'||m.response==='refused'))return 'fail:not everyone has agreed';
   r.phase='packing';return 'done';
  }
  if(step==='depart'){
   if(!assembled(w,p,r)||!supplied(w,hh))return 'fail:household or provisions are not ready';
   if(r.members.length!==hh.members.length||r.members.some(m=>!hh.members.includes(m.id)))return 'fail:household membership changed before departure';
   for(const q of membersOf(w,hh)){
    if(q===p||stageOf(w,q)==='child')continue;
    const refusal=relocationResponse(w,q,p);
    if(refusal){const m=r.members.find(m=>m.id===q.id)!;m.response='refused';m.reason=refusal;m.tick=w.tick;finish(w,p,r,`${q.name} withdrew before departure: ${refusal}`);return 'done';}
   }
   r.phase='travelling';addEvent(w,'social',`${p.name}'s household set out carrying their own provisions.`,r.members.map(m=>m.id),p.x,p.y);return 'done';
  }
  if(step==='travel'||step==='rally')return 'done';
  if(step==='arrive'){
   if(!assembled(w,p,r))return 'fail:the household became separated';
   if(!knowSuitable(w,p,r)){finish(w,p,r,'arrival revealed no usable water and recently seen food together');return 'done';}
   r.phase='building';addEvent(w,'social',`${p.name}'s household arrived; shelter still needs materials and work.`,[p.id],p.x,p.y);return 'done';
  }
  if(step==='found'){
   const knownHome=beliefsByKind(p,['building']).find(b=>b.hh===hh.id&&b.id!==r.oldHomeId&&b.btype==='lean_to'&&near(b,r.destination,12));
   const home=knownHome?w.byId.get(knownHome.id):undefined;
   if(!assembled(w,p,r)||home?.ent!=='building'||home.hhId!==hh.id||home.id===r.oldHomeId||!near(home,r.destination,12))return 'fail:household and completed shelter must be together';
   if(r.members.length!==hh.members.length||r.members.some(m=>!hh.members.includes(m.id)))return 'fail:household membership changed on the journey';
   const towns=w.townships??=[];
   let town=towns.find(t=>near(t,home,14));
   if(!town){town={id:w.nextId++,name:`${hh.name} Landing`,x:home.x,y:home.y,founded:w.tick,origin:{householdId:hh.id,relocationId:r.id,fromTownship:r.fromTownship,shelterId:home.id,organiserId:r.organiserId}};towns.push(town);addSettlement(w,town.x,town.y);}
   hh.homeId=home.id;hh.townshipId=town.id;r.townshipId=town.id;r.phase='settled';r.ended=w.tick;r.outcome=`established shelter in ${town.name}; former property remains household-owned`;
   addEvent(w,'social',`${hh.name} household established its home in ${town.name}.`,r.members.map(m=>m.id),home.x,home.y);return 'done';
  }
  return 'fail:unknown relocation step';
 },
});
/** The journey may pause, but a walking adult cannot silently outrun a dependent. */
export function relocationTravelBlocker(w: World,p: Person,a: Activity): string | undefined {
 if(!hasRelocation(w)||a.kind!=='relocate'||a.data.step!=='travel')return;
 const r=currentRelocation(householdById(w,p.hhId));if(!r)return 'the household journey has ended';
 const close=(id:number,following=false)=>{const q=w.byId.get(id);return q?.ent==='person'&&q.alive&&!q.indoors&&near(p,q,Math.min(following?6:4,senseRadius(w,p)-(following?0.1:0.6),senseRadius(w,q)-(following?0.1:0.6)));};
 const member=r.members.find(m=>m.id===p.id);
 if(member?.response==='dependent'&&!r.members.some(m=>m.response==='accepted'&&close(m.id,true)))return 'waiting for a household adult in sight';
 if(member?.response==='accepted'&&r.members.some(m=>m.response==='dependent'&&!close(m.id)))return 'waiting for dependent children to catch up';
}
/** Revalidate private ownership and the agreement at the actual transfer boundary. */
export function relocationPackingBlocker(w: World,p: Person,a: Activity): string | undefined {
 if(!a.data.relocation||!runsRulesVersion(w,20))return;
 if(!hasRelocation(w))return 'relocation is disabled';
 const r=currentRelocation(householdById(w,p.hhId)),store=w.byId.get(a.targetId);
 if(!r||r.id!==a.data.relocation||r.phase!=='packing')return 'the relocation packing agreement has ended';
 if(store?.ent!=='building'||store.id!==r.oldHomeId||store.hhId!==p.hhId)return 'the provisions are no longer in our household store';
}
export function validateRelocations(w: World): void {
 for(const hh of w.households){
  if(!hh.relocations)continue;
  if(!runsRulesVersion(w,20)||hh.relocations.length>8||hh.relocations.filter(active).length>1)throw new Error('Invalid household relocation history');
  for(const r of hh.relocations){
   if(!['asking','packing','travelling','building','settled','failed'].includes(r.phase)||!Number.isInteger(r.id)||!Number.isFinite(r.started)||!Number.isFinite(r.deadline)||r.deadline<r.started||!r.meeting||!Number.isFinite(r.meeting.x)||!Number.isFinite(r.meeting.y)||!Number.isFinite(r.destination.x)||!Number.isFinite(r.destination.y)||r.destination.x<0||r.destination.y<0||r.destination.x>=w.W||r.destination.y>=w.H||r.members.some(m=>!['pending','accepted','refused','dependent'].includes(m.response))||r.members.length===0||new Set(r.members.map(m=>m.id)).size!==r.members.length||!r.members.some(m=>m.id===r.organiserId))throw new Error('Invalid relocation agreement');
  }
 }
}
