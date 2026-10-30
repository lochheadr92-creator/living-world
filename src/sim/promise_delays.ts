import {DAY} from './constants';
// Bounded renegotiation of an active promise, based on the helper's actual failed attempt.
import {runsRulesVersion} from './rulesversion';
import {outstandingAttempt,type PromiseAttempt} from './promise_outcomes';
import {completionContact} from './promise_knowledge';
import {knowsDeath} from './death_knowledge';
import {addLog} from './events';
import type {Commitment,Person,World} from './types';
export interface PromiseDelay {
 source:'own attempt'|'helper statement';tick:number;from:number;commitmentId:number;conversationId:number;
 attempt:PromiseAttempt;priorDeadline:number;proposedDeadline:number;delivered:number;contrib:number;
 originalExpectedDeadline?:number;retryAfter?:number;response?:'accepted'|'refused';responseAt?:number;responseReason?:string;
}
let enabled=true;
export const promiseDelaysOn=()=>enabled;
export function setPromiseDelays(on:boolean):void{enabled=on;}
export const hasPromiseDelays=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,85);
export const DELAY_EXTENSION=DAY/4;
/** One proposal per obligation. Retrying interrupted speech repeats the same proposal, never adds more time. */
export function pendingDelayProposals(w:World,p:Person):Commitment[]{
 if(!hasPromiseDelays(w))return [];
 return p.commitments.filter(c=>{const a=outstandingAttempt(c),d=c.delay;
  const work=c.kind==='work'||c.kind==='help_build',remaining=work?40-(c.contrib??0):Math.max(1,c.amount)-(c.delivered??0);
  return c.status==='active'&&remaining>0&&!!a&&!knowsDeath(p,c.to)&&c.deadline+DELAY_EXTENSION>w.tick+120&&
   (!d||d.response===undefined&&d.attempt.activityId===a.activityId&&d.attempt.tick===a.tick&&(d.retryAfter??0)<=w.tick);
 }).slice().sort((a,b)=>a.deadline-b.deadline||a.id-b.id);
}
export function receiveDelayProposal(w:World,helper:Person,asker:Person,requestId:number,conversationId:number):string|null{
 if(!hasPromiseDelays(w)||!completionContact(w,helper,asker))return null;
 const c=pendingDelayProposals(w,helper).find(c=>c.requestId===requestId&&c.to===asker.id),m=asker.socialMemory?.find(m=>m.requestId===requestId&&m.role==='asker'&&m.otherId===helper.id),e=m?.expectation;
 if(!c||!m||!e||e.commitmentId!==c.id||e.endedAt!==undefined&&e.source!=='own timeout')return null;
 const a=outstandingAttempt(c)!;
 const d:PromiseDelay=c.delay??{source:'own attempt',tick:w.tick,from:helper.id,commitmentId:c.id,conversationId,attempt:{...a},priorDeadline:c.deadline,proposedDeadline:c.deadline+DELAY_EXTENSION,delivered:c.delivered??0,contrib:c.contrib??0};
 d.tick=w.tick;d.conversationId=conversationId;d.retryAfter=w.tick+400;c.delay=d;
 e.delay={...d,source:'helper statement',originalExpectedDeadline:e.deadline,attempt:{...d.attempt}};delete e.delay.retryAfter;
 if(e.endedAt===undefined){m.tick=w.tick;m.reason=`${helper.name} reported a failed attempt: ${a.reason}. They asked for time until tick ${d.proposedDeadline}; I have not answered. The work is still owed.`;}
 addLog(w,asker,'social',`${helper.name} explained the delay to request #${requestId}: ${a.reason}. This is their account, not firsthand evidence of the cause.`);
 const progress=c.item?` I have delivered ${d.delivered} of ${c.amount} ${c.item}.`:d.contrib>0?' I have done some of the work, but have not finished.':'';
 return `I tried, but ${a.reason}.${progress} Could you allow another six hours beyond our agreed time to try again? More time may not solve the problem.`;
}
/** The requester's own urgency and relationship govern assent; no hidden helper inventory or remote need is inspected. */
export function answerDelayProposal(w:World,helper:Person,asker:Person,requestId:number):string|null{
 if(!hasPromiseDelays(w)||!completionContact(w,helper,asker))return null;
 const c=helper.commitments.find(c=>c.requestId===requestId&&c.to===asker.id),d=c?.delay,m=asker.socialMemory?.find(m=>m.requestId===requestId&&m.role==='asker'&&m.otherId===helper.id),e=m?.expectation,k=e?.delay;
 if(!c||c.status!=='active'||!d||d.response!==undefined||!m||!e||!k||k.commitmentId!==c.id||k.attempt.activityId!==d.attempt.activityId||k.attempt.tick!==d.attempt.tick||k.proposedDeadline!==d.proposedDeadline)return null;
 const lowNeed=Math.min(asker.needs.hunger,asker.needs.thirst,asker.needs.warmth)<35;
 const urgentCare=m.task?.kind==='watch'||m.task?.kind==='fire';
 const urgentRoof=m.task?.kind==='repair'&&(asker.beliefs[e.destId]?.cond??100)<25;
 const ended=e.endedAt!==undefined&&e.source!=='own timeout';
 const distrust=(asker.relations[helper.id]?.trust??10)<10;
 const tooLate=d.proposedDeadline<=w.tick;
 const reason=ended?'I no longer need this agreement':lowNeed?'my own supplies or warmth are urgent':urgentCare?'the care I requested cannot wait another six hours':urgentRoof?'the roof I remember is too badly damaged to wait':distrust?'I am not confident enough to wait longer':tooLate?'that proposed time has already passed':'I can allow one more six-hour window, without assuming the problem is solved';
 const response:PromiseDelay['response']=ended||lowNeed||urgentCare||urgentRoof||distrust||tooLate?'refused':'accepted';
 for(const record of [d,k]){record.response=response;record.responseAt=w.tick;record.responseReason=reason;delete record.retryAfter;}
 if(response==='accepted'){c.deadline=d.proposedDeadline;e.deadline=d.proposedDeadline;delete e.endedAt;delete e.source;m.outcome='promised';const r=w.requests.find(r=>r.id===requestId&&r.from===asker.id&&r.to===helper.id&&r.commitmentId===c.id);if(r)r.deadline=d.proposedDeadline;}
 m.tick=w.tick;m.reason=`${helper.name} reported: ${d.attempt.reason}. I ${response} more time because ${reason}. ${response==='accepted'?`We agreed on tick ${e.deadline}.`:'The earlier agreement was not extended.'}`;
 addLog(w,helper,'social',`${asker.name} ${response} my request for more time: ${reason}.`);addLog(w,asker,'social',m.reason);
 return response==='accepted'?`I can allow those extra six hours. Please tell me if the problem remains.`:`I cannot agree to more time: ${reason}.`;
}
export function describeDelay(d:PromiseDelay|undefined):string{
 return d?` Delay proposal: ${d.source}, person #${d.from}, conversation #${d.conversationId}, tick ${d.tick}; attempt #${d.attempt.activityId} at tick ${d.attempt.tick}: ${d.attempt.reason}. Reported contribution: ${d.delivered} items, ${d.contrib} work. Prior deadline ${d.originalExpectedDeadline??d.priorDeadline}; requested deadline ${d.proposedDeadline}.${d.source==='helper statement'?' Cause reported, not independently witnessed.':''} ${d.response?`${d.response} at tick ${d.responseAt}: ${d.responseReason}.`:'No answer received; the agreement has not been extended.'}`:'';
}
export function validatePromiseDelays(w:World):void{
 const int=(n:unknown,min=0,max=w.tick)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,85);
 const check=(d:PromiseDelay,source:PromiseDelay['source'],from:number,id:number,made:number)=>{
  if(!allowed||!d||d.source!==source||d.from!==from||d.commitmentId!==id||!int(d.tick,made)||!int(d.conversationId,1,Number.MAX_SAFE_INTEGER)||!int(d.priorDeadline,made,Number.MAX_SAFE_INTEGER)||!int(d.proposedDeadline,d.priorDeadline,Number.MAX_SAFE_INTEGER)||d.proposedDeadline!==d.priorDeadline+DELAY_EXTENSION||!Number.isFinite(d.delivered)||d.delivered<0||!Number.isFinite(d.contrib)||d.contrib<0)throw new Error('Invalid promise delay proposal');
  if(source==='own attempt'&&d.originalExpectedDeadline!==undefined||source==='helper statement'&&!int(d.originalExpectedDeadline,made,d.proposedDeadline))throw new Error('Invalid original heard deadline');
  const a=d.attempt;if(!a||!int(a.activityId,1,Number.MAX_SAFE_INTEGER)||!int(a.targetId,0,Number.MAX_SAFE_INTEGER)||!int(a.tick,made,d.tick)||!['visit','give','repair','build','deposit','return_tool','haul'].includes(a.kind)||!['travel','work'].includes(a.phase)||typeof a.reason!=='string'||a.reason.length>240||!Number.isFinite(a.delivered)||a.delivered<0||!Number.isFinite(a.contrib)||a.contrib<0||a.resolvedAt!==undefined)throw new Error('Invalid reported delay attempt');
  if(d.response!==undefined&&(!['accepted','refused'].includes(d.response)||!int(d.responseAt,d.tick)||typeof d.responseReason!=='string'||d.responseReason.length>240)||d.response===undefined&&(d.responseAt!==undefined||d.responseReason!==undefined)||d.retryAfter!==undefined&&(source!=='own attempt'||d.response!==undefined||!int(d.retryAfter,d.tick,w.tick+400)))throw new Error('Invalid promise delay answer');
 };
 for(const p of w.persons){for(const c of p.commitments)if(c.delay!==undefined){check(c.delay,'own attempt',p.id,c.id,c.made);if(c.deadline!==(c.delay.response==='accepted'?c.delay.proposedDeadline:c.delay.priorDeadline))throw new Error('Delay changed an unagreed deadline');}
  for(const m of p.socialMemory??[])if(m.expectation?.delay!==undefined){const e=m.expectation;check(e.delay!,'helper statement',m.otherId,e.commitmentId,e.made);if(e.delay!.response==='accepted'&&e.deadline!==e.delay!.proposedDeadline)throw new Error('Heard delay deadline disagrees');}
  for(const a of [p.activity,p.suspended])if(a?.data.purpose==='delay_request'&&!allowed)throw new Error('Unsupported delay activity');
 }
 if(!allowed&&w.conversations.some(c=>c.purpose==='delay_request'))throw new Error('Unsupported delay conversation');
}
