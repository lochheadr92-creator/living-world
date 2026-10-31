// A roof duty names a personally heard place and spends only lawful repair supplies.
import {DAY,isHomeType} from './constants';
import {learn} from './knowledge';
import {addLog} from './events';
import {reservedFor} from './reserved_goods';
import {runsRulesVersion} from './rulesversion';
import type {Items,Person,World} from './types';
let enabled=true;
export const repairDutyOn=()=>enabled;
export const setRepairDuty=(on:boolean):void=>{enabled=on;};
export const hasRepairDuty=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,98);
export function roofDuty(p:Person,id:number){return p.commitments.find(c=>c.status==='active'&&c.kind==='work'&&c.destKind==='building'&&c.destId===id&&c.milestone==='sound again');}
export function knownDutyHome(w:World,p:Person,id:number){const b=p.beliefs[id];return b?.kind==='building'&&isHomeType(b.btype)&&w.tick-b.seen<=DAY&&(b.cond??0)>0?b:undefined;}
export function communicateRoofLocation(w:World,asker:Person,helper:Person,id:number):void{
 if(!hasRepairDuty(w))return;const b=knownDutyHome(w,asker,id),old=helper.beliefs[id];if(!b||old&&old.seen>=b.seen)return;
 learn(helper,{id:b.id,kind:'building',btype:b.btype,x:b.x,y:b.y,amount:0,max:0,seen:b.seen,src:'told',from:asker.id,learned:w.tick,origin:b.origin??asker.id,hops:(b.hops??0)+1,hh:b.hh,cond:b.cond});
 addLog(w,helper,'social',`${asker.name} described the home I agreed to patch, last observed at tick ${b.seen}. I must reach it and use real materials.`);
}
/** A private roof plan may use its own material, never another plan's or delivery's. */
export function repairSupplies(w:World,p:Person,targetId:number):Items{
 const out:Items={};for(const k of ['wood','planks','bricks'] as const){const own=p.intentions.filter(i=>i.status==='active'&&i.kind==='repair'&&i.aboutId===targetId).reduce((n,i)=>n+(i.wants[k]??0),0);out[k]=Math.max(0,(p.inv[k]??0)-Math.max(0,reservedFor(w,p,k)-own));}return out;
}
