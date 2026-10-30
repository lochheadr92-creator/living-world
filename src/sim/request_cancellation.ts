// A requester may withdraw personally obsolete work; the helper learns only through the actual speech act.
import {DAY} from './constants';
import {runsRulesVersion} from './rulesversion';
import {completionContact} from './promise_knowledge';
import {addLog} from './events';
import {knowsDeath} from './death_knowledge';
import {validateTargetEvidence,type PromiseTargetEvidence} from './promise_targets';
import type {Person,World} from './types';
type Memory=NonNullable<Person['socialMemory']>[number];
export interface CancellationKnowledge {source:'own target observation'|'requester statement';tick:number;from:number;commitmentId:number;target:PromiseTargetEvidence;conversationId?:number;acknowledgedAt?:number;reportAfter?:number;response?:'stopped'|'already ended'}
let enabled=true;
export const requestCancellationOn=()=>enabled;
export function setRequestCancellation(on:boolean):void{enabled=on;}
export const hasRequestCancellation=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,84);
/** Caller has physically observed the missing/completed target; never derive absence from a forgotten belief. */
export function recordRequesterTarget(w:World,p:Person,target:PromiseTargetEvidence):void{
 if(!hasRequestCancellation(w))return;
 for(const m of p.socialMemory??[]){const e=m.expectation;if(!e||m.role!=='asker'||m.cancellation||e.destId!==target.targetId&&m.siteId!==target.targetId||e.endedAt!==undefined&&e.source!=='own timeout')continue;
  m.cancellation={source:'own target observation',tick:w.tick,from:p.id,commitmentId:e.commitmentId,target:{...target}};
  m.outcome='cancelled';m.tick=w.tick;m.reason=target.source==='completed here'?'I finished the site; I no longer need the remaining help. I still need to tell the helper.':'I saw that the requested target is no longer there; I no longer need work on it. I still need to tell the helper.';
  e.endedAt=w.tick;e.source='own cancellation';addLog(w,p,'social',m.reason);
 }
}
export function pendingCancellations(w:World,p:Person):Memory[]{
 if(!hasRequestCancellation(w))return [];
 return (p.socialMemory??[]).filter(m=>m.role==='asker'&&m.cancellation?.source==='own target observation'&&m.cancellation.acknowledgedAt===undefined&&w.tick-m.cancellation.tick<=12*DAY&&(m.cancellation.reportAfter??0)<=w.tick&&!knowsDeath(p,m.otherId)).slice().reverse();
}
export interface HeardCancellation {text:string;commitmentId:number;targetId:number;stopped:boolean}
/** Personal state only. The conversation owner releases suspended work and settles shared execution separately. */
export function receiveCancellation(w:World,speaker:Person,listener:Person,requestId:number,conversationId:number):HeardCancellation|null{
 if(!hasRequestCancellation(w)||!completionContact(w,speaker,listener))return null;
 const m=pendingCancellations(w,speaker).find(m=>m.requestId===requestId&&m.otherId===listener.id),k=m?.cancellation;if(!m||!k)return null;
 const c=listener.commitments.find(c=>c.id===k.commitmentId&&c.requestId===requestId&&c.to===speaker.id),memories=listener.socialMemory??=[],old=memories.find(x=>x.requestId===requestId&&x.role==='helper'&&x.otherId===speaker.id);
 const retainedId=old?.completion?.commitmentId??old?.resolution?.commitmentId??old?.cancellation?.commitmentId;
 if(!c&&retainedId!==k.commitmentId)return null;
 k.reportAfter=w.tick+400;
 const stopped=c?.status==='active';if(stopped){c.status='cancelled';c.reason=`${speaker.name} asked me to stop this request; their target is no longer needed.`;}
 const known:CancellationKnowledge={source:'requester statement',tick:w.tick,from:speaker.id,commitmentId:k.commitmentId,target:{...k.target},conversationId,response:stopped?'stopped':'already ended'};
 if(old){if(!old.cancellation)old.cancellation=known;if(stopped){old.outcome='cancelled';old.reason=c!.reason!;old.tick=w.tick;}}
 else {const t=m.task;memories.push({requestId,otherId:speaker.id,siteId:m.siteId,tick:w.tick,outcome:stopped?'cancelled':c?.status==='done'?'fulfilled':c?.status==='moot'?'cancelled':c?.status??'cancelled',reason:c?.reason??'My obligation had already ended.',role:'helper',...(t?{task:{kind:t.kind,item:t.item,asked:t.asked,...(t.offered!==undefined?{offered:t.offered}:{})}}:{}),cancellation:known});if(memories.length>32)memories.shift();}
 addLog(w,listener,'social',`${speaker.name} asked me to stop request #${requestId}; ${stopped?'I accepted the cancellation':'my obligation had already ended'}. Their account does not establish my own observation of the target.`);
 return {text:k.target.source==='completed here'?'I finished the site. Please stop the remaining work I asked you to do.':'The place I asked you to help with is no longer there. Please stop that request.',commitmentId:k.commitmentId,targetId:k.target.targetId,stopped};
}
export function acknowledgeCancellation(w:World,speaker:Person,listener:Person,requestId:number):CancellationKnowledge['response']|null{
 if(!hasRequestCancellation(w)||!completionContact(w,speaker,listener))return null;
 const own=speaker.socialMemory?.find(m=>m.requestId===requestId&&m.role==='asker')?.cancellation,heard=listener.socialMemory?.find(m=>m.requestId===requestId&&m.role==='helper'&&m.otherId===speaker.id)?.cancellation;
 if(!own||own.source!=='own target observation'||!heard||heard.source!=='requester statement'||heard.commitmentId!==own.commitmentId)return null;
 if(own.acknowledgedAt===undefined){own.acknowledgedAt=w.tick;own.response=heard.response;delete own.reportAfter;addLog(w,speaker,'social',`${listener.name} acknowledged my cancellation of request #${requestId}${heard.response==='already ended'?'; their obligation had already ended':''}.`);}
 return heard.response??null;
}
export function describeCancellation(k:CancellationKnowledge|undefined):string{
 return k?` Cancellation: ${k.source}, tick ${k.tick}, from person #${k.from}; target #${k.target.targetId}, ${k.target.source} at tick ${k.target.tick}.${k.source==='requester statement'?` Heard in conversation #${k.conversationId}; target change is reported, not independently witnessed.`:k.acknowledgedAt===undefined?' Helper acknowledgement not received.':` Acknowledged at tick ${k.acknowledgedAt} (${k.response}).`}`:'';
}
export function validateRequestCancellation(w:World):void{
 const int=(n:unknown,min=0,max=w.tick)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max,allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,84);
 for(const p of w.persons){const ms=p.socialMemory??[];if(ms.some(m=>m.cancellation!==undefined)&&(ms.length>32||new Set(ms.map(m=>m.requestId)).size!==ms.length))throw new Error('Invalid cancellation memory count');
 for(const m of ms)if(m.cancellation!==undefined){const k=m.cancellation;
  if(!allowed||!k||!['own target observation','requester statement'].includes(k.source)||!int(k.tick)||!int(k.commitmentId,1,Number.MAX_SAFE_INTEGER)||k.from!==(k.source==='own target observation'?p.id:m.otherId)||k.source==='own target observation'&&(m.role!=='asker'||m.expectation?.commitmentId!==k.commitmentId)||k.source==='requester statement'&&(m.role!=='helper'||!int(k.conversationId,1,Number.MAX_SAFE_INTEGER)||!['stopped','already ended'].includes(k.response??''))||k.acknowledgedAt!==undefined&&(k.source!=='own target observation'||!int(k.acknowledgedAt,k.tick))||k.reportAfter!==undefined&&(k.source!=='own target observation'||!int(k.reportAfter,k.tick,w.tick+400))||k.response!==undefined&&!['stopped','already ended'].includes(k.response))throw new Error('Invalid personal cancellation knowledge');
  validateTargetEvidence(w,k.target,k.tick);
  if(k.source==='own target observation'&&(k.target.targetId!==m.expectation!.destId&&k.target.targetId!==m.siteId||k.target.tick<m.expectation!.made||k.target.tick!==k.tick||k.conversationId!==undefined||k.response!==undefined&&k.acknowledgedAt===undefined))throw new Error('Cancellation does not match the heard agreement');
  const c=p.commitments.find(c=>c.id===k.commitmentId&&c.requestId===m.requestId);if(k.source==='requester statement'&&c&&(c.to!==k.from||k.target.targetId!==(c.destId??c.siteId)&&k.target.targetId!==c.siteId))throw new Error('Cancellation does not match the accepted obligation');
 }
 for(const a of [p.activity,p.suspended])if(a?.data.purpose==='cancel_request'&&!allowed)throw new Error('Unsupported cancellation activity');
 }
 if(!allowed&&w.conversations.some(c=>c.purpose==='cancel_request'))throw new Error('Unsupported cancellation conversation');
}
