// Task-specific experience belongs to the existing bounded request receipts, not a second memory store.
import {ALL_ITEMS,DAY} from './constants';
import {runsRulesVersion} from './rulesversion';
import type {ItemKind,Person,Request,RequestKind,World} from './types';
export interface HelperReceipt {item:ItemKind;amount:number;tick:number;eventKind:'conversation'|'activity';eventId:number}
export interface HelperTask {kind:RequestKind;item:ItemKind|null;asked:number;offered?:number;receipt?:HelperReceipt}
let enabled=true;
export const helperLearningOn=()=>enabled;
export function setHelperLearning(on:boolean):void{enabled=on;}
export const hasHelperLearning=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,78);
/** Called only after a positive physical hand-over to the requester. Arrival elsewhere is not personal receipt. */
export function noteHelperReceipt(w:World,r:Request,giver:Person,receiver:Person,item:ItemKind,amount:number,eventKind:HelperReceipt['eventKind'],eventId:number):void{
 if(!hasHelperLearning(w)||r.to!==giver.id||r.from!==receiver.id||amount<=0)return;
 r.helperReceipt={item,amount,tick:w.tick,eventKind,eventId};
}
export function taskReceipt(w:World,r:Request):HelperTask|undefined{
 if(!hasHelperLearning(w))return;
 return {kind:r.kind,item:r.item,asked:r.amount,...(r.offered!==undefined?{offered:r.offered}:{}),...(r.helperReceipt?{receipt:{...r.helperReceipt}}:{})};
}
export const materialRequestKind=(item:ItemKind):RequestKind=>item==='wood'||item==='stone'?item:'goods';
/** Small preference among presently eligible helpers. Refusal, interruption and missing evidence carry no ability penalty. */
export function helperExperience(w:World,p:Person,otherId:number,kind:RequestKind,item:ItemKind):{bonus:number;reason:string}{
 if(!hasHelperLearning(w))return {bonus:0,reason:''};
 const seen=new Set<number>(),events=new Set<string>(),matches=(p.socialMemory??[]).filter(m=>{
  if(seen.has(m.requestId))return false;seen.add(m.requestId);
  const t=m.task,r=t?.receipt;
  if(m.role!=='asker'||m.otherId!==otherId||t?.kind!==kind||t.item!==item||r?.item!==item||r.amount<=0||w.tick-r.tick<0||w.tick-r.tick>12*DAY)return false;
  const event=r.eventKind+':'+r.eventId;if(events.has(event))return false;events.add(event);return true;
 }).sort((a,b)=>b.task!.receipt!.tick-a.task!.receipt!.tick||b.requestId-a.requestId).slice(0,2);
 if(!matches.length)return {bonus:0,reason:''};
 const latest=matches[0],r=latest.task!.receipt!;
 const bonus=matches.reduce((sum,m)=>sum+(w.tick-m.task!.receipt!.tick<=4*DAY?3:1.5),0);
 return {bonus,reason:`I personally received ${r.amount} ${item} on request #${latest.requestId} at tick ${r.tick} (${r.eventKind} #${r.eventId}); ${matches.length} recent recorded ${matches.length===1?'delivery':'deliveries'} of this task, not a guarantee they will agree now`};
}
export function describeHelperTask(task:HelperTask|undefined):string{
 if(!task)return 'Task and direct receipt not recorded.';
 const r=task.receipt;
 return `Task: ${task.kind}${task.item?` (${task.item})`:''}; asked ${task.asked}; agreed ${task.offered??'not recorded'}. ${r?`Last direct receipt: ${r.amount} ${r.item}, tick ${r.tick}, ${r.eventKind} #${r.eventId}.`:'No direct material receipt recorded; ability is not established by this outcome.'}`;
}
const KINDS:RequestKind[]=['food','water','wood','stone','seeds','tool','help_build','info','trade','care','goods','repair','haul','work','watch','fire'];
export function validateHelperLearning(w:World):void{
 const integer=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 const amount=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 const allowed=()=>w.settings.dynamics==='rich'&&runsRulesVersion(w,78);
 const receipt=(r:HelperReceipt)=>{if(!allowed()||!r||!ALL_ITEMS.includes(r.item)||!amount(r.amount)||r.amount<=0||!integer(r.tick,0,w.tick)||!['conversation','activity'].includes(r.eventKind)||!integer(r.eventId,1))throw new Error('Invalid helper direct receipt');};
 for(const r of w.requests)if(r.helperReceipt!==undefined){receipt(r.helperReceipt);if(r.helperReceipt.amount>(r.delivered??0))throw new Error('Helper receipt exceeds actual delivery');}
 for(const p of w.persons){const memories=p.socialMemory??[];if(memories.some(m=>m.task!==undefined)&&(memories.length>32||new Set(memories.map(m=>m.requestId)).size!==memories.length))throw new Error('Invalid helper task memory count');
  for(const m of memories)if(m.task!==undefined){const t=m.task;if(!allowed()||!t||!KINDS.includes(t.kind)||(t.item!==null&&!ALL_ITEMS.includes(t.item))||!amount(t.asked)||(t.offered!==undefined&&!amount(t.offered))||!integer(m.tick,0,w.tick))throw new Error('Invalid helper task memory');if(t.receipt){receipt(t.receipt);if(t.receipt.tick>m.tick)throw new Error('Future helper task receipt');}}
 }
}
