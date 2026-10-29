// Household relocation owns agreements and their bounded history. Movement, stores,
// hauling and construction retain their existing owners. Rules 20; never a player order.
//
// RULES 54 EXTENSIONS (rich worlds, `runsRulesVersion(w, 54)`, lab switch `rich-no-relocation-extensions`; rules 20-53 keep
// the whole-household form exactly). The ordinary diagnosis (docs/DEPENDENCY_CHAIN_PROGRAMME.md, WS12) found that the
// first form never got past its first gate: a whole household in contact outdoors is rare, so no proposal was ever heard.
//   * SUBGROUP CONSENT. A proposal needs the organiser and one other member in contact (a household of one proposes alone);
//     the rest are asked one at a time, in contact. A refusal no longer ends the agreement: the refuser stays. A child whose
//     parent in the household refuses stays with them; otherwise the child travels as a dependant of the accepted adults. A
//     member not found to be asked within a day of the proposal is recorded as staying. The travellers (accepted adults and
//     their dependants, alive) are the ones who must be assembled, supplied and together at every later step. When they
//     found a home with stayers left behind, the travellers become a NEW household (ordinary household creation) owning the
//     new shelter; the old household keeps its home, store and stayers. Nothing is moved or reassigned without consent.
//   * SUCCESSION. When the organiser dies (a traveller who knows of the death by the rules-14 paths) or leaves the household,
//     an accepted adult traveller may take over the journey; the record keeps who succeeded whom and why.
//   * RETURN. An arrival that reveals no usable water or fresh food turns the agreement to 'returning' while the old home still
//     stands in the household's hands: the travellers walk back and the organiser declares it 'returned' with them assembled
//     there. The deadline and the day's retry cooldown apply as before.
//   * RESCUE. A traveller out of sight and out of contact for RESCUE_AFTER may be looked for by the organiser at the place the
//     organiser last saw them (their own `whereabouts`, within RESCUE_WINDOW); looking finds them or finds them gone (the
//     organiser's stale whereabouts is forgotten), and nobody is moved. Without a known place the organiser is blocked.
import type { Activity, Belief, Household, Items, Person, World } from './types';
import type { Ctx } from './optutil';
import { addBlocked, addOption, beliefsByKind, foodCount } from './optutil';
import { newActivity, registerHandler } from './activities';
import { BUILD_DEF, DAY } from './constants';
import { runsRulesVersion } from './rulesversion';
import { addToHousehold, createHousehold, householdById, membersOf } from './households';
import { knowsDeath } from './death_knowledge';
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
 started: number; deadline: number; phase: 'asking'|'packing'|'travelling'|'building'|'settled'|'failed'|'returning'|'returned';
 destination: { x: number; y: number; water: Belief; food: Belief };
 reason: string; outcome: string; ended?: number; townshipId?: number;
 /** 'stays' (rules 54): a refuser's child, a member not found to be asked, or one who withdrew; they keep the old home */
 members: { id: number; response: 'pending'|'accepted'|'refused'|'dependent'|'stays'; reason: string; tick: number }[];
 /** rules 54: who took over the journey from whom, and why */
 successions?: { from: number; to: number; tick: number; reason: string }[];
 /** rules 54: the organiser's searches for a traveller out of contact, at the place last seen */
 rescues?: { by: number; who: number; tick: number; x: number; y: number; found: boolean }[];
 /** rules 54: the household the travellers formed when stayers kept the old one */
 newHouseholdId?: number;
}
let enabled = true;
export const relocationsOn = (): boolean => enabled;
export function setRelocations(on: boolean): void { enabled = on; }
export const hasRelocation = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 20);
let extensions = true;
export const relocationExtensionsOn = (): boolean => extensions;
/** Lab switch `rich-no-relocation-extensions`: the rules-20 whole-household form only; no effect below rules 54. */
export function setRelocationExtensions(on: boolean): void { extensions = on; }
export const hasRelocationExtensions = (w: World): boolean => hasRelocation(w) && extensions && runsRulesVersion(w, 54);
export const RESCUE_AFTER = DAY / 2;
export const RESCUE_WINDOW = DAY * 2;
export const ASK_PATIENCE = DAY;
const active = (r: Relocation): boolean => r.phase !== 'failed' && r.phase !== 'settled' && r.phase !== 'returned';
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
/** Rules 54: the living members who are going (accepted adults and dependants). Below 54 every member is. */
export function travellers(w: World,r: Relocation): Relocation['members'] {
 if(!runsRulesVersion(w,54)||!extensions)return r.members;
 return r.members.filter(m=>(m.response==='accepted'||m.response==='dependent')&&w.byId.get(m.id)?.ent==='person');
}
const isTraveller=(w: World,r: Relocation,id: number): boolean => travellers(w,r).some(m=>m.id===id);
/** Rules 54: a child stays when a parent in the household refused or stays. */
function childStays(w: World,hh: Household,r: Relocation,child: Person): string | null {
 for(const id of child.parents){
  const m=r.members.find(m=>m.id===id);const q=w.byId.get(id);
  if(m&&(m.response==='refused'||m.response==='stays')&&q?.ent==='person'&&q.hhId===hh.id)return `stays with ${q.name}`;
 }
 return null;
}
function settleDependants(w: World,hh: Household,r: Relocation): void {
 for(const m of r.members){
  if(m.response!=='dependent')continue;const q=w.byId.get(m.id);if(q?.ent!=='person')continue;
  const why=childStays(w,hh,r,q);if(why){m.response='stays';m.reason=why;m.tick=w.tick;}
 }
}
/** An offered response is based on the respondent, not the proposer's wealth or household title. */
export function relocationResponse(w: World,p: Person,organiser: Person): string | null {
 if(p.health<40||p.needs.hunger<25||p.needs.thirst<30)return 'needs to recover before travelling';
 if(trustOf(p,organiser.id)<-10||affinityOf(p,organiser.id)<-20)return 'does not trust this organiser with the journey';
 if(p.commitments.some(c=>c.status==='active'))return 'has an unfinished promise here';
 return null;
}
function supplied(w: World,hh: Household,r?: Relocation): boolean {
 const people=r&&hasRelocationExtensions(w)?travellers(w,r).map(m=>w.byId.get(m.id) as Person):membersOf(w,hh);
 return people.reduce((n,p)=>n+foodCount(p.inv),0)>=people.length*2 && people.reduce((n,p)=>n+(p.inv.water??0),0)>=people.length*2;
}
function assembled(w: World,p: Person,r: Relocation): boolean {
 return travellers(w,r).every(m=>{const q=w.byId.get(m.id);return q?.ent==='person'&&contact(p,q)&&q.hhId===p.hhId;});
}
/** Rules 54: the proposal is heard by the organiser and at least one other member; a household of one proposes alone. */
function heard(w: World,p: Person,hh: Household): boolean {
 const members=membersOf(w,hh);
 if(!hasRelocationExtensions(w))return members.every(q=>contact(p,q));
 return members.length===1||members.filter(q=>contact(p,q)).length>=2;
}
/** Rules 54: the travellers still belong to the household (below 54: the whole household is unchanged). */
function membershipHolds(w: World,hh: Household,r: Relocation): boolean {
 if(!hasRelocationExtensions(w))return r.members.length===hh.members.length&&r.members.every(m=>hh.members.includes(m.id));
 return travellers(w,r).every(m=>hh.members.includes(m.id));
}
const oldHome=(w: World,hh: Household,r: Relocation)=>{const b=w.byId.get(r.oldHomeId);return b?.ent==='building'&&b.hhId===hh.id?b:undefined;};
function knowSuitable(w: World,p: Person,r: Relocation): boolean {
 // Only arrival may inspect the real water access. Food must be freshly seen there.
 return near(p,r.destination,8)&&isWaterAccess(w,Math.floor(r.destination.x),Math.floor(r.destination.y)) &&
  beliefsByKind(p,[...foodKinds]).some(b=>b.amount>0&&b.src==='seen'&&w.tick-b.seen<120&&near(b,r.destination,10));
}
function offer(ctx: Ctx,step: string,label: string,r?: Relocation,target?: Person,at?: {x:number;y:number}): void {
 const {w,p}= {w:ctx.world,p:ctx.p};
 const moving=step==='travel'||step==='rally'||step==='return'||step==='rescue';
 const to=at??target??(step==='travel'?r!.destination:step==='rally'?r!.meeting:p);
 addOption(ctx,{kind:'relocate',key:`relocate:${r?.id??0}:${step}:${target?.id??0}`,label,goal:r?.reason??'sustained hunger and a remembered food and water opportunity',need:null,util:48,parts:[['household relocation',48]],eta:60+hyp(p.x-to.x,p.y-to.y)/ctx.speed,targetId:target?.id??0,tag:'relocation',
 make:()=>newActivity(w,p,{kind:'relocate',label,goal:r?.reason??'seek a known opportunity together',targetId:target?.id??0,targetType:target?'person':'',tx:to.x,ty:to.y,spotX:to.x,spotY:to.y,here:!moving&&!target,duration:moving?1:60,maxTicks:DAY,utility:48,data:{relocation:r?.id??0,step,...(step==='rescue'?{x:to.x,y:to.y}:{})}})});
}
/** Rules 54: the organiser is gone, and this traveller may take the journey over. '' when not. */
function successionReason(w: World,p: Person,hh: Household,r: Relocation): string {
 if(!hasRelocationExtensions(w)||p.id===r.organiserId)return '';
 const m=r.members.find(m=>m.id===p.id);if(!m||m.response!=='accepted')return '';
 const o=w.byId.get(r.organiserId);
 if(o?.ent==='person'){return o.hhId!==hh.id?'left the household':'';}
 return knowsDeath(p,r.organiserId)?'died':'';
}
/** Rules 54: a traveller of the organiser's out of sight and contact long enough to be looked for, with where last seen. */
function missingTraveller(ctx: Ctx,r: Relocation): {q: Person; at?: {x:number;y:number}} | undefined {
 const {world:w,p}=ctx;
 for(const m of travellers(w,r)){
  if(m.id===p.id)continue;const q=w.byId.get(m.id);if(q?.ent!=='person'||contact(p,q)||ctx.seenPersons.some(s=>s.id===q.id))continue;
  const wh=p.whereabouts[q.id];const last=wh?.tick??r.started;
  if(w.tick-last<RESCUE_AFTER)continue;
  return {q,at:wh&&w.tick-wh.tick<=RESCUE_WINDOW?{x:wh.x,y:wh.y}:undefined};
 }
 return undefined;
}
export function relocationOptions(ctx: Ctx): void {
 const {world:w,p,hh}=ctx;if(!hasRelocation(w)||!hh||p.indoors)return;
 const r=currentRelocation(hh);const ext=hasRelocationExtensions(w);
 if(!r){
  if(ctx.stage!=='adult'||p.relocationHardship===undefined||w.tick-p.relocationHardship<DAY||(p.cooldowns['relocation:retry']??0)>w.tick||hh.relocations?.some(q=>q.ended!==undefined&&w.tick-q.ended<DAY))return;
  if(heard(w,p,hh)&&relocationDestination(w,p))offer(ctx,'propose',ext?'Propose moving to known food and water to those here':'Propose moving to known food and water');
  return;
 }
 const m=r.members.find(m=>m.id===p.id);if(!m)return;
 if(w.tick>r.deadline){offer(ctx,'stop','End the overdue relocation',r);return;}
 if(m.response==='pending'||m.response==='refused'||m.response==='stays')return;
 const succession=successionReason(w,p,hh,r);
 if(succession){offer(ctx,'succeed',`Take over the household journey (the organiser ${succession})`,r);return;}
 if(ext&&p.id===r.organiserId&&(r.phase==='travelling'||r.phase==='building')){
  const missing=missingTraveller(ctx,r);
  if(missing){if(missing.at)offer(ctx,'rescue',`Look for ${missing.q.name} where they were last seen`,r,missing.q,missing.at);else addBlocked(ctx,'relocate',`Look for ${missing.q.name}`,0,`does not know where ${missing.q.name} is`,'relocation');}
 }
 if(r.phase==='asking'){
  if(!near(p,r.meeting,1.5))offer(ctx,'rally','Return to the household discussion',r);
  if(p.id!==r.organiserId)return;
  const q=ext?r.members.filter(m=>m.response==='pending').map(m=>w.byId.get(m.id)).find(q=>q?.ent==='person'&&contact(p,q)):(()=>{const pending=r.members.find(m=>m.response==='pending');return pending?w.byId.get(pending.id):undefined;})();
  const pending=r.members.find(m=>m.response==='pending');
  if(ext){
   if(q?.ent==='person')offer(ctx,'ask',`Discuss relocation with ${q.name}`,r,q);
   else if(assembled(w,p,r)&&(!pending||w.tick-r.started>=ASK_PATIENCE))offer(ctx,'prepare','Prepare the journey with those who will go',r);
   else if(pending)addBlocked(ctx,'relocate','Prepare the journey',0,`${w.byId.get(pending.id)?.ent==='person'?(w.byId.get(pending.id) as Person).name:'a member'} has not yet been asked`,'relocation');
  }
  else if(assembled(w,p,r)&&q?.ent==='person' && p.seen.some(s=>s.id===q.id)&&!q.convId&&q.pose!=='sleep')offer(ctx,'ask',`Discuss relocation with ${q.name}`,r,q);
  else if(!pending&&assembled(w,p,r))offer(ctx,'prepare','Prepare the household journey',r);
  return;
 }
 if(r.phase==='returning'){
  const home=oldHome(w,hh,r);if(!home){offer(ctx,'stop','End the relocation: the old home is gone',r);return;}
  if(!near(p,home,4))offer(ctx,'return','Return to the old home',r,undefined,{x:home.x+0.5,y:home.y+BUILD_DEF[home.type as keyof typeof BUILD_DEF].h+0.5});
  else if(p.id===r.organiserId&&assembled(w,p,r))offer(ctx,'returned','Settle back in at the old home together',r);
  return;
 }
 if(r.phase==='packing'){
  if(!near(p,r.meeting,1.5))offer(ctx,'rally','Gather at the agreed departure place',r);
  if(ctx.stage==='child')return;
  const store=beliefsByKind(p,['building']).find(b=>b.hh===p.hhId&&b.id===r.oldHomeId);
  const wanted:Items={};const going=ext?travellers(w,r).length:r.members.length;
  if(store){
   for(const k of ['berries','fruit','fish','grain','water','wood'] as const){
    const target=k==='wood'?BUILD_DEF.lean_to.cost.wood??3:k==='water'?2*going:Math.max(0,2*going-foodCount(p.inv));
    const n=Math.min(store.items?.[k]??0,Math.max(0,target-(k==='water'||k==='wood'?(p.inv[k]??0):0)));
    if(n>0&&roomFor(p.inv,carryCap(w,p),k)>0)wanted[k]=n;
   }
   if(Object.keys(wanted).length)addOption(ctx,{kind:'withdraw',key:`relocate-pack:${r.id}:${store.id}`,label:'Pack household provisions for the journey',goal:r.reason,need:null,util:49,parts:[['prepare journey',49]],eta:80,targetId:store.id,tag:'relocation',make:()=>newActivity(w,p,{kind:'withdraw',label:'Packing household provisions',goal:r.reason,targetId:store.id,tx:store.x,ty:store.y,spotX:store.x+0.5,spotY:store.y+BUILD_DEF[(store.btype??'lean_to') as keyof typeof BUILD_DEF].h+0.5,utility:49,data:{items:wanted,relocation:r.id}})});
  }
  if(p.id===r.organiserId){
   if(assembled(w,p,r)&&supplied(w,hh,r))offer(ctx,'depart',ext?'Depart with those who are going':'Depart together for known food and water',r);
   else addBlocked(ctx,'relocate','Depart with the household',0,ext?'waiting for the travellers nearby and two food and water units per traveller':'waiting for everyone nearby and two food and water units per person','relocation');
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
   if(!heard(w,p,hh))return hasRelocationExtensions(w)?'fail:nobody else of the household was there to hear the proposal':'fail:the household must hear the proposal together';
   r={id:w.nextId++,organiserId:p.id,fromTownship:hh.townshipId??0,oldHomeId:hh.homeId,meeting:{x:p.x,y:p.y},started:w.tick,deadline:w.tick+DAY*4,phase:'asking',destination,reason:'a day of hunger with little carried food; remembered food beside distant water',outcome:'',members:members.map(q=>({id:q.id,response:q===p?'accepted':'pending',reason:q===p?'proposed the journey':'has not been asked',tick:w.tick}))};
   (hh.relocations??=[]).push(r);if(hh.relocations.length>8)hh.relocations.shift();
   addEvent(w,'social',`${p.name} proposed a household move to remembered food and water.`,[p.id],p.x,p.y);return 'done';
  }
  if(!r)return 'fail:no relocation agreement';
  if(step==='stop'){finish(w,p,r,r.phase==='returning'?'the journey back was not completed together in the agreed time':'the agreed time ran out; the household did not establish shelter together');return 'done';}
  if(w.tick>r.deadline)return 'fail:the agreed journey time has run out';
  const ext=hasRelocationExtensions(w);
  if(step==='succeed'){
   const why=successionReason(w,p,hh,r);if(!why)return 'fail:the journey has its organiser';
   (r.successions??=[]).push({from:r.organiserId,to:p.id,tick:w.tick,reason:why});
   const was=r.members.find(m=>m.id===r.organiserId);if(was&&why==='left the household'){was.response='stays';was.reason='left the household';was.tick=w.tick;}
   addEvent(w,'social',`${p.name} took over the household journey after ${w.deceased.find(d=>d.id===r.organiserId)?.name??(w.byId.get(r.organiserId) as Person|undefined)?.name??'the organiser'} ${why}.`,[p.id],p.x,p.y);
   r.organiserId=p.id;return 'done';
  }
  if(step==='rescue'){
   const q=w.byId.get(a.targetId);const at={x:Number(a.data.x),y:Number(a.data.y)};
   if(q?.ent!=='person'||!isTraveller(w,r,q.id))return 'fail:they are no longer on the journey';
   const found=contact(p,q)||p.seen.some(s=>s.id===q.id)||near(p,q,senseRadius(w,p));
   (r.rescues??=[]).push({by:p.id,who:q.id,tick:w.tick,x:at.x,y:at.y,found});
   if(r.rescues.length>8)r.rescues.shift();
   if(!found)delete p.whereabouts[q.id];
   addEvent(w,'social',found?`${p.name} found ${q.name} where they were last seen and the journey can go on.`:`${p.name} looked for ${q.name} where they were last seen and found nobody.`,[p.id,...(found?[q.id]:[])],p.x,p.y);
   return 'done';
  }
  if(step==='ask'){
   if(!ext&&!assembled(w,p,r))return 'fail:the household discussion became separated';
   const q=w.byId.get(a.targetId) as Person;const m=r.members.find(m=>m.id===q.id);
   if(!m||m.response!=='pending'||q.hhId!==hh.id)return 'fail:the household response has changed';
   const refusal=relocationResponse(w,q,p);const child=stageOf(w,q)==='child';const stays=ext&&child?childStays(w,hh,r,q):null;
   m.response=refusal?'refused':stays?'stays':child?'dependent':'accepted';m.reason=refusal??stays??(child?'heard the route; will travel with household adults':ext?'agrees to try the known opportunity with those who go':'agrees to try the known opportunity with the household');m.tick=w.tick;
   learn(q,{...r.destination.water,src:'told',from:p.id,learned:w.tick});learn(q,{...r.destination.food,src:'told',from:p.id,learned:w.tick});
   addEvent(w,'social',`${q.name} ${refusal?'refused':stays?'will stay behind in':'accepted'} ${p.name}'s relocation proposal: ${m.reason}.`,[p.id,q.id],p.x,p.y);
   if(refusal&&!ext)finish(w,p,r,`${q.name} refused: ${refusal}`);
   else if(refusal)settleDependants(w,hh,r);
   return 'done';
  }
  if(step==='prepare'){
   if(!assembled(w,p,r))return ext?'fail:the travellers must hear the departure agreement together':'fail:the household must hear the departure agreement together';
   if(ext){
    for(const m of r.members)if(m.response==='pending'){if(w.tick-r.started<ASK_PATIENCE)return 'fail:not everyone has been asked';m.response='stays';m.reason='was not found to be asked within a day of the proposal';m.tick=w.tick;}
    settleDependants(w,hh,r);
   }
   else if(r.members.some(m=>m.response==='pending'||m.response==='refused'))return 'fail:not everyone has agreed';
   r.phase='packing';return 'done';
  }
  if(step==='depart'){
   if(!assembled(w,p,r)||!supplied(w,hh,r))return 'fail:household or provisions are not ready';
   if(!membershipHolds(w,hh,r))return 'fail:household membership changed before departure';
   for(const q of membersOf(w,hh)){
    if(q===p||stageOf(w,q)==='child'||(ext&&!isTraveller(w,r,q.id)))continue;
    const refusal=relocationResponse(w,q,p);
    if(refusal){const m=r.members.find(m=>m.id===q.id)!;m.response=ext?'stays':'refused';m.reason=ext?`withdrew before departure: ${refusal}`:refusal;m.tick=w.tick;
     if(!ext){finish(w,p,r,`${q.name} withdrew before departure: ${refusal}`);return 'done';}
     addEvent(w,'social',`${q.name} withdrew from the journey before departure: ${refusal}.`,[p.id,q.id],p.x,p.y);settleDependants(w,hh,r);
     if(!assembled(w,p,r)||!supplied(w,hh,r))return 'fail:the departure must be agreed again with those who remain';}
   }
   r.phase='travelling';addEvent(w,'social',ext&&travellers(w,r).length<r.members.length?`${p.name} set out with ${travellers(w,r).length-1} of the household, carrying their own provisions; the rest stay.`:`${p.name}'s household set out carrying their own provisions.`,travellers(w,r).map(m=>m.id),p.x,p.y);return 'done';
  }
  if(step==='travel'||step==='rally'||step==='return')return 'done';
  if(step==='arrive'){
   if(!assembled(w,p,r))return 'fail:the household became separated';
   if(!knowSuitable(w,p,r)){
    if(ext&&oldHome(w,hh,r)){r.phase='returning';addEvent(w,'social',`${p.name}'s household found no usable water and fresh food at the destination and turned back to the old home.`,travellers(w,r).map(m=>m.id),p.x,p.y);return 'done';}
    finish(w,p,r,'arrival revealed no usable water and recently seen food together');return 'done';
   }
   r.phase='building';addEvent(w,'social',`${p.name}'s household arrived; shelter still needs materials and work.`,[p.id],p.x,p.y);return 'done';
  }
  if(step==='returned'){
   const home=oldHome(w,hh,r);
   if(!home||!near(p,home,4)||!assembled(w,p,r))return 'fail:the travellers must be back at the old home together';
   r.phase='returned';r.ended=w.tick;r.outcome='returned to the old home: the destination had no usable water and fresh food';
   p.cooldowns['relocation:retry']=w.tick+DAY;
   addEvent(w,'social',`${p.name}'s household is back at the old home after the journey came to nothing.`,travellers(w,r).map(m=>m.id),p.x,p.y);return 'done';
  }
  if(step==='found'){
   const knownHome=beliefsByKind(p,['building']).find(b=>b.hh===hh.id&&b.id!==r.oldHomeId&&b.btype==='lean_to'&&near(b,r.destination,12));
   const home=knownHome?w.byId.get(knownHome.id):undefined;
   if(!assembled(w,p,r)||home?.ent!=='building'||home.hhId!==hh.id||home.id===r.oldHomeId||!near(home,r.destination,12))return 'fail:household and completed shelter must be together';
   if(!membershipHolds(w,hh,r))return 'fail:household membership changed on the journey';
   const going=travellers(w,r).map(m=>m.id);
   const stayers=ext?membersOf(w,hh).filter(q=>!going.includes(q.id)):[];
   const towns=w.townships??=[];
   let town=towns.find(t=>near(t,home,14));
   let settled: Household=hh;
   if(stayers.length){
    settled=createHousehold(w,w.rng);
    for(const id of going){const q=w.byId.get(id);if(q?.ent==='person')addToHousehold(w,q,settled);}
    home.hhId=settled.id;r.newHouseholdId=settled.id;
   }
   if(!town){town={id:w.nextId++,name:`${settled.name} Landing`,x:home.x,y:home.y,founded:w.tick,origin:{householdId:settled.id,relocationId:r.id,fromTownship:r.fromTownship,shelterId:home.id,organiserId:r.organiserId}};towns.push(town);addSettlement(w,town.x,town.y);}
   settled.homeId=home.id;settled.townshipId=town.id;r.townshipId=town.id;r.phase='settled';r.ended=w.tick;
   r.outcome=stayers.length?`established shelter in ${town.name} as the ${settled.name} household; ${stayers.map(q=>q.name).join(', ')} stayed with the old home and the ${hh.name} name`:`established shelter in ${town.name}; former property remains household-owned`;
   addEvent(w,'social',stayers.length?`${settled.name} household, formed from the ${hh.name} household's travellers, established its home in ${town.name}.`:`${hh.name} household established its home in ${town.name}.`,going,home.x,home.y);return 'done';
  }
  return 'fail:unknown relocation step';
 },
});
/** The journey may pause, but a walking adult cannot silently outrun a dependent. */
export function relocationTravelBlocker(w: World,p: Person,a: Activity): string | undefined {
 if(!hasRelocation(w)||a.kind!=='relocate'||a.data.step!=='travel')return;
 const r=currentRelocation(householdById(w,p.hhId));if(!r)return 'the household journey has ended';
 const close=(id:number,following=false)=>{const q=w.byId.get(id);return q?.ent==='person'&&q.alive&&!q.indoors&&near(p,q,Math.min(following?6:4,senseRadius(w,p)-(following?0.1:0.6),senseRadius(w,q)-(following?0.1:0.6)));};
 const member=r.members.find(m=>m.id===p.id);const going=travellers(w,r);
 if(member?.response==='dependent'&&!going.some(m=>m.response==='accepted'&&close(m.id,true)))return 'waiting for a household adult in sight';
 if(member?.response==='accepted'&&going.some(m=>m.response==='dependent'&&!close(m.id)))return 'waiting for dependent children to catch up';
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
   const ext=runsRulesVersion(w,54);
   if((!ext&&(['returning','returned'].includes(r.phase)||r.successions||r.rescues||r.newHouseholdId!==undefined||r.members.some(m=>m.response==='stays')))||(r.successions&&!r.successions.every(s=>Number.isInteger(s.from)&&Number.isInteger(s.to)&&Number.isFinite(s.tick)))||(r.rescues&&(r.rescues.length>8||!r.rescues.every(x=>Number.isInteger(x.by)&&Number.isInteger(x.who)&&Number.isFinite(x.tick)&&Number.isFinite(x.x)&&Number.isFinite(x.y)&&typeof x.found==='boolean'))))throw new Error('Invalid relocation extension state');
   if(!['asking','packing','travelling','building','settled','failed','returning','returned'].includes(r.phase)||!Number.isInteger(r.id)||!Number.isFinite(r.started)||!Number.isFinite(r.deadline)||r.deadline<r.started||!r.meeting||!Number.isFinite(r.meeting.x)||!Number.isFinite(r.meeting.y)||!Number.isFinite(r.destination.x)||!Number.isFinite(r.destination.y)||r.destination.x<0||r.destination.y<0||r.destination.x>=w.W||r.destination.y>=w.H||r.members.some(m=>!['pending','accepted','refused','dependent','stays'].includes(m.response))||r.members.length===0||new Set(r.members.map(m=>m.id)).size!==r.members.length||!r.members.some(m=>m.id===r.organiserId))throw new Error('Invalid relocation agreement');
  }
 }
}
