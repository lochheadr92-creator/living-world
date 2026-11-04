// Paid nutrition stored in the body, separate from immediate hunger and inventory.
import type {Person,World} from './types';
import {stageOfAge} from './people';
import {TICKS_PER_YEAR} from './constants';
import {runsRulesVersion} from './rulesversion';
export const NOURISHMENT_EFFICIENCY=.8;
export const hasNourishment=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,132);
export type NourishmentEvent={kind:'meal';input:number;immediate:number;stored:number;lost:number}|{kind:'shortage'|'recovery'|'capacity';spent:number};
export function nourishmentCapacity(w:World,p:Person,tick=w.tick):number{
 const stage=stageOfAge((tick-p.birthTick)/TICKS_PER_YEAR);return stage==='child'?24:stage==='elder'?30:36;
}
export function nourishmentOf(w:World,p:Person):number{return hasNourishment(w)?Math.min(nourishmentCapacity(w,p),p.nourishment??0):0;}
function settleCapacity(w:World,p:Person):number{
 const have=p.nourishment??0,usable=nourishmentOf(w,p);
 if(have>usable){p.nourishment=usable;w.hooks?.onNourishment?.(p,{kind:'capacity',spent:have-usable});}
 return usable;
}
/** Call only after the food portion has actually been consumed. */
export function takeNutrition(w:World,p:Person,input:number):void{
 if(!Number.isFinite(input)||input<0)throw Error('invalid paid nutrition');
 if(!hasNourishment(w)){p.needs.hunger=Math.max(0,Math.min(100,p.needs.hunger+input));return;}
 const have=settleCapacity(w,p),capacity=nourishmentCapacity(w,p),room=capacity-have;
 const preferred=p.needs.hunger>=40?Math.min(input*.25,room/NOURISHMENT_EFFICIENCY):0;
 const immediate=Math.min(100-p.needs.hunger,input-preferred);
 const overflow=input-preferred-immediate;
 const extra=Math.min(overflow,Math.max(0,room-preferred*NOURISHMENT_EFFICIENCY)/NOURISHMENT_EFFICIENCY);
 const stored=(preferred+extra)*NOURISHMENT_EFFICIENCY;
 p.needs.hunger=Math.min(100,p.needs.hunger+immediate);p.nourishment=Math.min(capacity,have+stored);
 w.hooks?.onNourishment?.(p,{kind:'meal',input,immediate,stored:p.nourishment-have,lost:input-immediate-(p.nourishment-have)});
}
export function spendNourishment(w:World,p:Person,amount:number,kind:'shortage'|'recovery'):number{
 if(!hasNourishment(w))return 0;
 const have=settleCapacity(w,p),spent=Math.min(have,Math.max(0,amount));
 if(spent>0){p.nourishment=have-spent;w.hooks?.onNourishment?.(p,{kind,spent});}
 return spent;
}
export function validateNourishment(w:World):void{
 for(const p of w.persons){const n=p.nourishment;if(n===undefined)continue;
  // stepWorld increments its clock after updating people. A just-crossed age
  // boundary is settled on the next update; it cannot create new nourishment.
  const limit=p.alive?Math.max(nourishmentCapacity(w,p),nourishmentCapacity(w,p,w.tick-1)):36;
  if(!hasNourishment(w)||!Number.isFinite(n)||n<0||n>limit)throw Error('invalid bodily nourishment');
 }
}
