// Rules 63: a personally failed food hand-over can lead to the known household store.
// Existing failure memory, ordinary deposit and table eating retain their ownership.
import {newActivity} from './activities';
import {BUILD_DEF,isHomeType} from './constants';
import {foodUnits,invRoom,roomFor} from './economy';
import {noteFailure,recentFailure} from './knowledge';
import {householdById,membersOf} from './households';
import {mealReserved} from './meals';
import {Scorer,addBlocked,addOption,beliefsByKind,eta,pen,spotNear} from './optutil';
import type {Ctx} from './optutil';
import {isDependent} from './people';
import {isFoodKind} from './provision';
import {reservedFor} from './social';
import {runsRulesVersion} from './rulesversion';
import type {Activity,BuildingType,ItemKind,Items,Person,World} from './types';

export const CARE_PACK_FAILURE='recipient could not carry the food';
export const CARE_PACK_MEMORY=600;
const MAX_CARE_FAILURES=6;
let enabled=true;
export const careCapacityOn=():boolean=>enabled;
export function setCareCapacity(on:boolean):void{enabled=on;}
export const hasCareCapacity=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,63);

/** Called only at the actual zero-receipt boundary, not from an inventory peek while planning. */
export function noteCarePackFailure(w:World,p:Person,q:Person,want:Items):void{
 if(!hasCareCapacity(w)||q.hhId!==p.hhId)return;
 const food=(Object.keys(want) as ItemKind[]).filter(k=>isFoodKind(k)&&(want[k]??0)>0&&(p.inv[k]??0)>0);
 if(!food.length||food.some(k=>invRoom(w,q,k)>0))return;
 noteFailure(w,p,q.id,CARE_PACK_FAILURE);
 // Bound only this new use of the existing operational store; do not remove unrelated memories.
 const entries=Object.entries(p.failures).filter(([,f])=>f.reason===CARE_PACK_FAILURE).sort((a,b)=>b[1].tick-a[1].tick||Number(a[0])-Number(b[0]));
 for(let n=0;n<entries.length;n++)if(n>=MAX_CARE_FAILURES||w.tick-entries[n][1].tick>=CARE_PACK_MEMORY)delete p.failures[Number(entries[n][0])];
}

/** Same household aid keeps personal food, other dependants' portions, promises and meal commitments. */
export function careFoodAvailable(w:World,p:Person,to:number,item:ItemKind):number{
 if(!isFoodKind(item)||p.needs.hunger<40||p.needs.thirst<30||p.needs.energy<20)return 0;
 const others=membersOf(w,householdById(w,p.hhId)).filter(q=>q.id!==p.id&&q.id!==to&&isDependent(w,q)).length;
 const keep=(p.needs.hunger<55?2:1)+2*others+mealReserved(w,p);
 const promised=reservedFor(w,p,item);
 const promisedFood=(Object.keys(p.inv) as ItemKind[]).reduce((n,k)=>n+(isFoodKind(k)?reservedFor(w,p,k):0),0);
 return Math.max(0,Math.min((p.inv[item]??0)-promised,foodUnits(p.inv)-keep-promisedFood));
}

/** Pure option derivation. Return true when the remembered capacity problem replaces the food hand-over. */
export function careStoreOption(ctx:Ctx,q:Pick<Person,'id'|'name'>,items:Items,base:number,px:number,py:number):boolean{
 const {world,p}=ctx;
 if(!hasCareCapacity(world)||recentFailure(world,p,q.id,CARE_PACK_MEMORY)?.reason!==CARE_PACK_FAILURE)return false;
 const item=(Object.keys(items) as ItemKind[]).find(k=>isFoodKind(k)&&(items[k]??0)>0);
 if(!item)return false;
 const label=`Leave ${item} at home for ${q.name}`;
 const homes=beliefsByKind(p,['building']).filter(b=>b.hh===p.hhId&&isHomeType(b.btype)&&(b.cond??1)>0&&Math.hypot(b.x-px,b.y-py)<=8)
  .sort((a,b)=>eta(ctx,a.x,a.y)-eta(ctx,b.x,b.y)||a.id-b.id);
 const b=homes.find(b=>roomFor(b.items??{},BUILD_DEF[b.btype as BuildingType].cap,item)>0);
 const blocked=!b?'no known household store with room near them':foodUnits(b.items??{})>0?'remembers food already waiting at home':careFoodAvailable(world,p,q.id,item)<1?'must keep food for my own needs, others or promises':'';
 addBlocked(ctx,'give',`Bring ${item} to ${q.name}`,q.id,'their pack recently had no room for food','care');
 if(blocked){addBlocked(ctx,'deposit',label,b?.id??0,blocked,'care');return true;}
 const n=Math.min(items[item]??0,careFoodAvailable(world,p,q.id,item),roomFor(b!.items??{},BUILD_DEF[b!.btype as BuildingType].cap,item));
 const walk=eta(ctx,b!.x,b!.y),sc=new Scorer().add(`${q.name} needs food`,base).add('walking',-pen(walk));
 addOption(ctx,{kind:'deposit',label,goal:`to make food accessible to ${q.name} without filling their pack`,need:null,util:sc.total,parts:sc.parts,eta:walk+20,key:`care_store:${b!.id}:${q.id}`,targetId:b!.id,tag:'care',selectionReason:'the last hand-over failed because their pack was full',
  make:()=>{const spot=spotNear(world,p,b!);if(!spot)return null;
   return newActivity(world,p,{kind:'deposit',label:`Leaving ${n} ${item} at home for ${q.name}`,goal:`to make food accessible to ${q.name}`,targetId:b!.id,targetType:'building',tx:b!.x,ty:b!.y,spotX:spot.x,spotY:spot.y,utility:sc.total,minCommit:40,maxTicks:600,
    data:{items:{[item]:n},careStore:true,careRecipient:q.id,careOwner:p.hhId}});
  }});
 return true;
}

/** Physical validation also applies to an already-started action when the lab disables new offers. */
export function careStoreBlocker(w:World,p:Person,a:Activity):string|null{
 if(!a.data.careStore||!runsRulesVersion(w,63))return null;
 const b=w.byId.get(a.targetId),q=w.byId.get(a.data.careRecipient as number);
 if(!b||b.ent!=='building'||!isHomeType(b.type)||b.condition<=0||b.hhId!==a.data.careOwner||p.hhId!==a.data.careOwner)return 'the care store is no longer our usable home';
 if(!q||q.ent!=='person'||!q.alive||q.hhId!==p.hhId)return 'the person I was supplying is no longer in this household';
 const items=a.data.items as Items;
 if(!items||Object.keys(items).some(k=>!isFoodKind(k as ItemKind)))return 'this care trip is only for food';
 return null;
}
