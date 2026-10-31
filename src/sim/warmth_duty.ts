// Practical fire duties use personal knowledge and uncommitted physical fuel.
import {DAY} from './constants';
import {learn} from './knowledge';
import {addLog} from './events';
import {reservedFor} from './reserved_goods';
import {freeOf} from './intent';
import {runsRulesVersion} from './rulesversion';
import type {Person,World} from './types';
let enabled=true;
export const warmthDutyOn=()=>enabled;
export const setWarmthDuty=(on:boolean):void=>{enabled=on;};
export const hasWarmthDuty=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,96);
export function fuelAvailable(w:World,p:Person,item:'wood'|'offcuts'):number{
 return hasWarmthDuty(w)?Math.max(0,(p.inv[item]??0)-reservedFor(w,p,item)):freeOf(p,item);
}
export function knownDutyFire(w:World,p:Person,id:number){
 const b=p.beliefs[id];return b?.kind==='building'&&b.btype==='fire'&&w.tick-b.seen<=DAY&&(b.cond??1)>0?b:undefined;
}
/** The accepted conversation is the contact owner. Preserve observation age and provenance. */
export function communicateFireLocation(w:World,asker:Person,helper:Person,id:number):void{
 if(!hasWarmthDuty(w))return;
 const b=knownDutyFire(w,asker,id),old=helper.beliefs[id];if(!b||old&&old.seen>=b.seen)return;
 learn(helper,{id:b.id,kind:'building',btype:'fire',x:b.x,y:b.y,amount:0,max:0,seen:b.seen,src:'told',from:asker.id,learned:w.tick,origin:b.origin??asker.id,hops:(b.hops??0)+1,hh:b.hh,cond:b.cond,fuel:b.fuel});
 addLog(w,helper,'social',`${asker.name} described the fire I agreed to keep going, last observed at tick ${b.seen}. I still have to reach it and supply real fuel.`);
}
