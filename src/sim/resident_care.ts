// A resident can return to personally observed need in their own home. Remembered room
// contact is not live remote location; entrance and hand-over are checked on arrival.
import {newActivity} from './activities';
import {careFoodAvailable,careStoreOption} from './care_capacity';
import {knowsDeath} from './death_knowledge';
import {isHomeType} from './constants';
import {Scorer,addBlocked,addOption,eta,pen,traitMods} from './optutil';
import type {Ctx} from './optutil';
import {isFoodKind} from './provision';
import {reservedFor,surplusOf} from './social';
import {hasResidentCare,isResidentCare,ROOM_CONTACT_MEMORY} from './resident_contact';
import type {Activity,ItemKind,Items,Person,World} from './types';

function available(w:World,p:Person,to:number,k:ItemKind):number{
 if(p.needs.hunger<40||p.needs.thirst<30||p.needs.energy<20)return 0;
 if(isFoodKind(k))return careFoodAvailable(w,p,to,k);
 if(k==='water')return Math.max(0,Math.min(surplusOf(w,p,k),(p.inv.water??0)-reservedFor(w,p,k)));
 return 0;
}

/** Iterate personally remembered contact, not a live remote health/death-dependent member list. */
export function residentCareOptions(ctx:Ctx):Set<number>{
 const handled=new Set<number>();
 if(!hasResidentCare(ctx.world))return handled;
 for(const id of Object.keys(ctx.p.whereabouts).map(Number)){
  const room=ctx.p.whereabouts[id].room;if(!room)continue;
  if(residentCareOption(ctx,{id,name:room.name}))handled.add(id);
 }
 return handled;
}

/** Handle only remembered indoor contact. Current visible contact still uses ordinary care. */
function residentCareOption(ctx:Ctx,q:Pick<Person,'id'|'name'>):boolean{
 const {world,p}=ctx,wh=p.whereabouts[q.id];
 if(!hasResidentCare(world)||ctx.seenPersons.some(s=>s.id===q.id)||!wh?.room)return false;
 const room=wh.room,b=p.beliefs[room.homeId];
 if(!room.needsCare||!room.household||knowsDeath(p,q.id))return true;
 const blocked=world.tick-wh.tick>ROOM_CONTACT_MEMORY?'the last indoor contact is too old':
  !b||b.kind!=='building'||b.hh!==p.hhId||!isHomeType(b.btype)||(b.cond??1)<=0?'no known usable household home at that contact':'';
 if(blocked){addBlocked(ctx,'give',`Return to help ${q.name}`,q.id,blocked,'care');return true;}
 if(!room.hungry&&!room.thirsty)return true;
 const items:Items={};
 if(room.hungry){const k=(['berries','fruit','grain','fish','bread','meat'] as ItemKind[]).find(k=>available(world,p,q.id,k)>=1);if(k)items[k]=Math.min(2,available(world,p,q.id,k));}
 if(room.thirsty&&available(world,p,q.id,'water')>=1)items.water=1;
 if(!Object.keys(items).length){addBlocked(ctx,'give',`Return to help ${q.name}`,q.id,'must keep supplies for my own needs, others or promises','care');return true;}
 const kin=p.relations[q.id]?.kin,family=kin==='child'||kin==='parent'||kin==='partner',base=42*traitMods(p).give;
 // A personally failed hand-over must still reach the existing household-store fallback.
 if(careStoreOption(ctx,q,items,base+(family?8:0),wh.x,wh.y)){
  for(const k of Object.keys(items) as ItemKind[])if(isFoodKind(k))delete items[k];
  if(!Object.keys(items).length)return true;
 }
 const what=Object.keys(items).join(' and '),walk=eta(ctx,wh.x,wh.y),sc=new Scorer().add(`last saw ${q.name} needing ${what}`,base).add('walking',-pen(walk));
 if(family)sc.add('family',8);
 addOption(ctx,{kind:'give',label:`Bring ${what} to ${q.name} at home`,goal:`to help ${q.name}, last seen needing ${what} inside our home`,need:null,util:sc.total,parts:sc.parts,eta:walk+14,key:`give:${q.id}:home`,targetId:q.id,tag:'care',selectionReason:'remembered contact inside our household home',
  make:()=>newActivity(world,p,{kind:'give',label:`Bringing ${what} to ${q.name} at home`,goal:`to help ${q.name}, last seen needing ${what} inside our home`,targetId:q.id,targetType:'person',tx:wh.x,ty:wh.y,spotX:wh.x,spotY:wh.y,utility:sc.total,minCommit:40,maxTicks:600,data:{items:{...items},mode:'care',residentCare:true,careHome:room.homeId}})});
 return true;
}

const needed=(q:Person,k:ItemKind):boolean=>isFoodKind(k)?q.needs.hunger<42:k==='water'&&q.needs.thirst<40;
export const needsResidentCare=(q:Person,items:Items):boolean=>(Object.keys(items) as ItemKind[]).some(k=>(items[k]??0)>0&&needed(q,k));

/** At physical contact, check current need and the helper's supplies again. */
export function residentCareItems(w:World,p:Person,q:Person,a:Activity,items:Items):Items{
 if(!isResidentCare(w,a))return items;
 const result:Items={};
 for(const k of Object.keys(items) as ItemKind[]){if(!needed(q,k))continue;const n=Math.min(items[k]??0,available(w,p,a.targetId,k));if(n>0)result[k]=n;}
 return result;
}
