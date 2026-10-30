import {completionContact} from './promise_knowledge';
import {noteExpectedReceipt} from './promise_expectations';
// Task-specific experience belongs to the existing bounded request receipts, not a second memory store.
import {ALL_ITEMS,DAY} from './constants';
import {runsRulesVersion} from './rulesversion';
import type {ItemKind,Person,Request,RequestKind,World} from './types';
export interface HelperReceipt {item:ItemKind;amount:number;tick:number;eventKind:'conversation'|'activity';eventId:number}
export interface HelperWork {kind:'watch';target:number;eventId:number;tick:number;witnessId:number}
export interface WatchReceipt {kind:'watch';target:number;eventId:number;tick:number;source:'own work'|'completion in sight'}
export interface HelperTask {kind:RequestKind;item:ItemKind|null;asked:number;offered?:number;receipt?:HelperReceipt;workReceipt?:WatchReceipt}
let watchEnabled=true;
export const watchLearningOn=()=>watchEnabled;
export function setWatchLearning(on:boolean):void{watchEnabled=on;}
export const hasWatchLearning=(w:World)=>watchEnabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,79);
let enabled=true;
export const helperLearningOn=()=>enabled;
export function setHelperLearning(on:boolean):void{enabled=on;}
export const hasHelperLearning=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,78);
/** Called only after a positive physical hand-over to the requester. Arrival elsewhere is not personal receipt. */
export function noteHelperReceipt(w:World,r:Request,giver:Person,receiver:Person,item:ItemKind,amount:number,eventKind:HelperReceipt['eventKind'],eventId:number):void{
 if(!hasHelperLearning(w)||r.to!==giver.id||r.from!==receiver.id||amount<=0)return;
 r.helperReceipt={item,amount,tick:w.tick,eventKind,eventId};
 if(completionContact(w,giver,receiver))noteExpectedReceipt(w,receiver,r.id,item,amount);
}
export function taskReceipt(w:World,r:Request,role:'asker'|'helper'='asker'):HelperTask|undefined{
 if(!hasHelperLearning(w)&&!hasWatchLearning(w))return;
 const work=r.helperWork,known=hasWatchLearning(w)&&work&&(role==='helper'||work.witnessId===r.from);
 return {kind:r.kind,item:r.item,asked:r.amount,...(r.offered!==undefined?{offered:r.offered}:{}),...(hasHelperLearning(w)&&r.helperReceipt?{receipt:{...r.helperReceipt}}:{}),...(known?{workReceipt:{kind:work.kind,target:work.target,eventId:work.eventId,tick:work.tick,source:role==='helper'?'own work' as const:'completion in sight' as const}}:{})};
}
/** Seeing completion is limited evidence about this task, not proof of uninterrupted supervision or willingness. */
export function watchExperience(w:World,p:Person,otherId:number):{bonus:number;reason:string}{
 if(!hasWatchLearning(w))return {bonus:0,reason:''};
 const requests=new Set<number>(),events=new Set<number>();
 const matches=(p.socialMemory??[]).filter(m=>{
  const r=m.task?.workReceipt;
  if(m.role!=='asker'||m.otherId!==otherId||m.task?.kind!=='watch'||r?.source!=='completion in sight'||r.kind!=='watch'||w.tick-r.tick<0||w.tick-r.tick>12*DAY||requests.has(m.requestId)||events.has(r.eventId))return false;
  requests.add(m.requestId);events.add(r.eventId);return true;
 }).sort((a,b)=>b.task!.workReceipt!.tick-a.task!.workReceipt!.tick||b.requestId-a.requestId).slice(0,2);
 if(!matches.length)return {bonus:0,reason:''};
 const latest=matches[0],r=latest.task!.workReceipt!;
 return {bonus:matches.reduce((sum,m)=>sum+(w.tick-m.task!.workReceipt!.tick<=4*DAY?3:1.5),0),reason:`I saw completion of the agreed watch for person #${r.target} on request #${latest.requestId} at tick ${r.tick} (activity #${r.eventId}); limited evidence about watching, not a guarantee they will agree now`};
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
 const r=task.receipt,work=task.workReceipt;
 if(work)return `Task: watch; asked ${task.asked}; agreed ${task.offered??'not recorded'}. ${work.source==='own work'?'Completed my agreed watch':'Saw completion of the agreed watch'} for person #${work.target}, tick ${work.tick}, activity #${work.eventId}. This does not establish other skills or present willingness.`;
 return `Task: ${task.kind}${task.item?` (${task.item})`:''}; asked ${task.asked}; agreed ${task.offered??'not recorded'}. ${r?`Last direct receipt: ${r.amount} ${r.item}, tick ${r.tick}, ${r.eventKind} #${r.eventId}.`:'No direct material receipt recorded; ability is not established by this outcome.'}`;
}
const KINDS:RequestKind[]=['food','water','wood','stone','seeds','tool','help_build','info','trade','care','goods','repair','haul','work','watch','fire'];
export function validateHelperLearning(w:World):void{
 const integer=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 const amount=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 const allowed=()=>w.settings.dynamics==='rich'&&runsRulesVersion(w,78);
 const work=(r:HelperWork|WatchReceipt)=>{if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,79)||!r||r.kind!=='watch'||!integer(r.target,1)||!integer(r.eventId,1)||!integer(r.tick,0,w.tick))throw new Error('Invalid watch completion receipt');};
 const receipt=(r:HelperReceipt)=>{if(!allowed()||!r||!ALL_ITEMS.includes(r.item)||!amount(r.amount)||r.amount<=0||!integer(r.tick,0,w.tick)||!['conversation','activity'].includes(r.eventKind)||!integer(r.eventId,1))throw new Error('Invalid helper direct receipt');};
 for(const r of w.requests)if(r.helperReceipt!==undefined){receipt(r.helperReceipt);if(r.helperReceipt.amount>(r.delivered??0))throw new Error('Helper receipt exceeds actual delivery');}
 for(const r of w.requests)if(r.helperWork!==undefined){work(r.helperWork);if(r.kind!=='watch'||r.destKind!=='person'||r.destId!==r.helperWork.target||!integer(r.helperWork.witnessId)||![0,r.from].includes(r.helperWork.witnessId)||r.status!=='fulfilled')throw new Error('Invalid request watch completion');}
 for(const p of w.persons){const memories=p.socialMemory??[];if(memories.some(m=>m.task!==undefined)&&(memories.length>32||new Set(memories.map(m=>m.requestId)).size!==memories.length))throw new Error('Invalid helper task memory count');
  for(const m of memories)if(m.task!==undefined){const t=m.task;if(!allowed()||!t||!KINDS.includes(t.kind)||(t.item!==null&&!ALL_ITEMS.includes(t.item))||!amount(t.asked)||(t.offered!==undefined&&!amount(t.offered))||!integer(m.tick,0,w.tick))throw new Error('Invalid helper task memory');if(t.receipt){receipt(t.receipt);if(t.receipt.tick>m.tick)throw new Error('Future helper task receipt');}if(t.workReceipt){work(t.workReceipt);if(t.kind!=='watch'||t.workReceipt.tick>m.tick||t.workReceipt.source!==(m.role==='helper'?'own work':'completion in sight')||m.outcome!=='fulfilled')throw new Error('Invalid personal watch completion');}}
 }
}
