import {hasPromiseExpectations,storeKnownReport} from './promise_expectations';
// Failed execution and knowledge of its outcome belong to the person who attempted the promise.
import {DAY} from './constants';
import {runsRulesVersion} from './rulesversion';
import {completionContact,pendingCompletionReports} from './promise_knowledge';
import {addLog} from './events';
import type {Activity,Commitment,Person,Request,World} from './types';
export interface PromiseAttempt {activityId:number;kind:Activity['kind'];targetId:number;phase:Activity['phase'];tick:number;reason:string;delivered:number;contrib:number;resolvedAt?:number}
export interface PromiseResolution {source:'own outcome'|'helper report';tick:number;from:number;resolvedAt:number;commitmentId:number;attempt?:PromiseAttempt;conversationId?:number;acknowledgedAt?:number;reportAfter?:number}
type Memory=NonNullable<Person['socialMemory']>[number];
let enabled=true;
export const promiseOutcomesOn=()=>enabled;
export function setPromiseOutcomes(on:boolean):void{enabled=on;}
export const hasPromiseOutcomes=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,81);
export const unresolvedOutcome=(status:string)=>['expired','interrupted','failed'].includes(status);
function matches(c:Commitment,a:Activity):boolean{
 if(a.data.commitmentId!==undefined)return a.data.commitmentId===c.id;
 return a.kind==='repair'&&c.kind==='work'&&c.milestone!=='fire kept'&&c.destKind==='building'&&c.destId===a.targetId||a.kind==='build'&&c.kind==='help_build'&&c.siteId===a.targetId;
}
/** Only a registered attempt at this obligation is evidence; unrelated gathering is not attributed. */
export function recordPromiseAttempt(w:World,p:Person,a:Activity,outcome:string,detail:string):void{
 if(!hasPromiseOutcomes(w))return;
 for(const c of p.commitments)if(c.status==='active'&&matches(c,a)){
  if(outcome==='failed'||outcome==='partial')c.attempt={activityId:a.id,kind:a.kind,targetId:a.targetId,phase:a.phase,tick:w.tick,reason:detail.slice(0,240),delivered:c.delivered??0,contrib:c.contrib??0};
  else if(outcome==='success'&&c.attempt&&c.attempt.kind===a.kind&&c.attempt.targetId===a.targetId)c.attempt.resolvedAt=w.tick;
 }
}
/** Validated arrival corrects an earlier failed approach, never a failure during work. */
export function correctPromiseApproach(w:World,p:Person,a:Activity):void{
 if(!hasPromiseOutcomes(w))return;
 for(const c of p.commitments)if(c.status==='active'&&matches(c,a)&&c.attempt?.phase==='travel'&&c.attempt.kind===a.kind&&c.attempt.targetId===a.targetId)c.attempt.resolvedAt=w.tick;
}
export function outstandingAttempt(c:Commitment):PromiseAttempt|undefined{
 const a=c.attempt;return a&&a.resolvedAt===undefined&&(c.delivered??0)<=a.delivered&&(c.contrib??0)<=a.contrib?a:undefined;
}
/** Classify the helper's outcome. Missing intent evidence does not establish deliberate breach. */
export function deadlineOutcome(w:World,c:Commitment,frac:number):void{
 const attempt=outstandingAttempt(c);
 if(frac>0){c.status='expired';c.reason=`only ${Math.round(frac*100)}% was done in time`;}
 else if(c.setAside!==undefined&&w.tick-c.setAside<900){c.status='interrupted';c.reason='put aside while seeing to their own needs';}
 else if(attempt){c.status='failed';c.reason=`attempt at tick ${attempt.tick}: ${attempt.reason}`;}
 else if(c.blockedAt!==undefined&&w.tick-c.blockedAt<600){c.status='failed';c.reason=c.blocked??'could not be done';}
 else {c.status='expired';c.reason='not completed in time; cause not established';}
}
export function recordPromiseResolution(w:World,p:Person,r:Request,c:Commitment):void{
 const own=p.socialMemory?.find(m=>m.requestId===r.id&&m.role==='helper');if(!own||own.resolution)return;
 own.resolution={source:'own outcome',tick:w.tick,from:p.id,resolvedAt:w.tick,commitmentId:c.id,...(outstandingAttempt(c)?{attempt:{...outstandingAttempt(c)!}}:{})};
 addLog(w,p,'social',`My promise ended: ${c.reason}. I have not yet explained the outcome to the requester.`);
}
export function pendingOutcomeReports(w:World,p:Person):Memory[]{
 if(!hasPromiseOutcomes(w))return [];
 return (p.socialMemory??[]).filter(m=>m.role==='helper'&&m.resolution?.source==='own outcome'&&m.resolution.acknowledgedAt===undefined&&w.tick-m.resolution.resolvedAt<=12*DAY&&(m.resolution.reportAfter??0)<=w.tick).slice().reverse();
}
export function pendingPromiseReports(w:World,p:Person):Memory[]{
 const completed=pendingCompletionReports(w,p);if(!hasPromiseOutcomes(w))return completed;
 return [...completed,...pendingOutcomeReports(w,p)].sort((a,b)=>b.tick-a.tick||b.requestId-a.requestId);
}
export function receiveOutcomeReport(w:World,speaker:Person,listener:Person,requestId:number,conversationId:number):string|null{
 if(!hasPromiseOutcomes(w)||!completionContact(w,speaker,listener))return null;
 const m=pendingOutcomeReports(w,speaker).find(m=>m.requestId===requestId&&m.otherId===listener.id);if(!m?.resolution)return null;
 m.resolution.reportAfter=w.tick+400;
 const memories=listener.socialMemory??=[];
 const known=memories.find(x=>x.requestId===requestId);
 if(!known||hasPromiseExpectations(w)&&known.expectation&&!known.resolution){
  const t=m.task,k=m.resolution;
  storeKnownReport(w,listener,{requestId,otherId:speaker.id,siteId:m.siteId,tick:w.tick,outcome:m.outcome,reason:`${speaker.name} reported: ${m.reason}`,role:'asker',...(t?{task:{kind:t.kind,item:t.item,asked:t.asked,...(t.offered!==undefined?{offered:t.offered}:{})}}:{}),resolution:{source:'helper report',tick:w.tick,from:speaker.id,resolvedAt:k.resolvedAt,commitmentId:k.commitmentId,...(k.attempt?{attempt:{...k.attempt}}:{}),conversationId}});
  if(memories.length>32)memories.shift();
 }
 addLog(w,listener,'social',`Heard ${speaker.name}'s explanation for request #${requestId}; this is their account, not an independently witnessed cause.`);
 return m.resolution.attempt?`I tried to do what I promised, but ${m.resolution.attempt.reason}.`:m.outcome==='interrupted'?'I could not finish what I promised; I had to see to my own needs.':m.reason.includes('cause not established')?'I did not finish what I promised. I cannot give you a clear explanation.':`I could not finish what I promised: ${m.reason}.`;
}
export function acknowledgeOutcomeReport(w:World,speaker:Person,listener:Person,requestId:number):boolean{
 if(!hasPromiseOutcomes(w)||!completionContact(w,speaker,listener))return false;
 const own=speaker.socialMemory?.find(m=>m.requestId===requestId&&m.role==='helper'),known=listener.socialMemory?.find(m=>m.requestId===requestId&&m.role==='asker');
 if(!own?.resolution||own.resolution.source!=='own outcome'||known?.resolution?.source!=='helper report'||known.resolution.commitmentId!==own.resolution.commitmentId)return false;
 if(own.resolution.acknowledgedAt===undefined){own.resolution.acknowledgedAt=w.tick;delete own.resolution.reportAfter;addLog(w,speaker,'social',`${listener.name} acknowledged hearing my explanation for request #${requestId}.`);}return true;
}
export function describeResolution(k:PromiseResolution|undefined):string{
 if(!k)return '';
 return ` Outcome knowledge: ${k.source}, learned tick ${k.tick}; obligation ended tick ${k.resolvedAt}, commitment #${k.commitmentId}.${k.attempt?` Attempt: activity #${k.attempt.activityId}, ${k.attempt.kind}, tick ${k.attempt.tick}: ${k.attempt.reason}.`:''}${k.source==='helper report'?` From person #${k.from}, conversation #${k.conversationId}; reported, not independently witnessed. Intent is not established.`:k.acknowledgedAt===undefined?' No acknowledgement received.':` Acknowledged at tick ${k.acknowledgedAt}.`}`;
}
export function validatePromiseOutcomes(w:World):void{
 const integer=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 const allowed=()=>w.settings.dynamics==='rich'&&runsRulesVersion(w,81);
 const amount=(n:number)=>Number.isFinite(n)&&n>=0;
 const attempt=(a:PromiseAttempt,max=w.tick)=>{if(!allowed()||!a||!integer(a.activityId,1)||!['visit','give','repair','build','deposit','return_tool','haul'].includes(a.kind)||!integer(a.targetId)||!['travel','work'].includes(a.phase)||!integer(a.tick,0,max)||typeof a.reason!=='string'||a.reason.length>240||!amount(a.delivered)||!amount(a.contrib)||a.resolvedAt!==undefined&&!integer(a.resolvedAt,a.tick,w.tick))throw new Error('Invalid personal promise attempt');};
 for(const p of w.persons){for(const c of p.commitments)if(c.attempt!==undefined)attempt(c.attempt);
 const memories=p.socialMemory??[];if(memories.some(m=>m.resolution!==undefined)&&(memories.length>32||new Set(memories.map(m=>m.requestId)).size!==memories.length))throw new Error('Invalid outcome memory count');
 for(const m of memories)if(m.resolution!==undefined){const k=m.resolution;
  if(!allowed()||!k||!['own outcome','helper report'].includes(k.source)||!integer(k.tick,0,w.tick)||!integer(k.resolvedAt,0,k.tick)||!integer(k.commitmentId,1)||!unresolvedOutcome(m.outcome)||m.completion!==undefined||k.source==='own outcome'&&m.role!=='helper'||k.source==='helper report'&&m.role!=='asker'||k.from!==(k.source==='helper report'?m.otherId:p.id)||k.source==='helper report'&&!integer(k.conversationId,1)||k.acknowledgedAt!==undefined&&(k.source!=='own outcome'||!integer(k.acknowledgedAt,k.tick,w.tick))||!integer(m.tick,0,w.tick))throw new Error('Invalid personal promise outcome knowledge');
  if(k.source==='helper report'&&(m.task?.receipt||m.task?.workReceipt))throw new Error('Reported outcome is not firsthand task evidence');
  if(k.reportAfter!==undefined&&(k.source!=='own outcome'||!integer(k.reportAfter,k.tick,w.tick+400)))throw new Error('Invalid bounded outcome report retry');
  if(k.attempt!==undefined){attempt(k.attempt,k.resolvedAt);if(k.attempt.resolvedAt!==undefined)throw new Error('Resolved attempt cannot explain an unresolved outcome');}
 }
 }
}
