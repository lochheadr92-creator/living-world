import {describeDelay} from './promise_delays';
// The requester remembers a heard agreement, not the helper's private progress or lifecycle state.
import {DAY,ALL_ITEMS} from './constants';
import {runsRulesVersion} from './rulesversion';
import {knowsDeath} from './death_knowledge';
import {addLog} from './events';
import type {Commitment,ItemKind,Person,Request,RequestStatus,World} from './types';
export interface PromiseExpectation {commitmentId:number;conversationId:number;made:number;deadline:number;amount:number;item:ItemKind|null;planId:number;destId:number;otherName:string;received:number;delay?:import('./promise_delays').PromiseDelay;endedAt?:number;source?:'observed completion'|'helper report'|'known death'|'own timeout'|'own cancellation'}
type Memory=NonNullable<Person['socialMemory']>[number];
let enabled=true;
export const promiseExpectationsOn=()=>enabled;
export function setPromiseExpectations(on:boolean):void{enabled=on;}
export const hasPromiseExpectations=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,82);
/** Called in the actual answer phase after the helper accepts; the deadline is spoken in that exchange. */
export function rememberExpectation(w:World,asker:Person,helper:Person,r:Request,c:Commitment,conversationId:number):void{
 if(!hasPromiseExpectations(w))return;
 const memories=asker.socialMemory??=[];if(memories.some(m=>m.requestId===r.id))return;
 const hours=Math.max(1,Math.ceil((c.deadline-w.tick)/DAY*24)),deadline=w.tick+hours*(DAY/24);
 memories.push({requestId:r.id,otherId:helper.id,siteId:r.siteId,tick:w.tick,outcome:'promised',reason:`${helper.name} agreed to help; expected by tick ${deadline}. Later progress is not known.`,role:'asker',task:{kind:r.kind,item:r.item,asked:r.amount,offered:r.offered??c.amount},expectation:{commitmentId:c.id,conversationId,made:w.tick,deadline,amount:c.amount,item:c.item,planId:r.planId??0,destId:c.destId??c.siteId,otherName:helper.name,received:0}});
 if(memories.length>32)memories.shift();
 if(helper.speech)helper.speech.text+=` I’ll aim to finish within ${hours} ${hours===1?'hour':'hours'}.`;
}
export function expectedStatus(w:World,p:Person,m:Memory):{status:RequestStatus;reason:string}{
 const e=m.expectation!;if(e.endedAt!==undefined)return {status:m.outcome as RequestStatus,reason:m.reason};
 if(m.task?.kind==='watch'&&knowsDeath(p,e.destId))return {status:'cancelled',reason:'I learned that the child died; the agreed watch is no longer possible.'};
 if(knowsDeath(p,m.otherId))return {status:'cancelled',reason:`I learned that ${e.otherName} died; their help can no longer be expected.`};
 if(w.tick>e.deadline)return {status:'expired',reason:'My agreed waiting period ended without a known completion; the cause is unknown.'};
 return {status:'promised',reason:m.reason};
}
export function updateExpectations(w:World,p:Person):void{
 if(!hasPromiseExpectations(w))return;
 for(const m of p.socialMemory??[])if(m.expectation&&m.expectation.endedAt===undefined){const known=expectedStatus(w,p,m);if(known.status!=='promised'){m.outcome=known.status;m.reason=known.reason;m.tick=w.tick;m.expectation.endedAt=w.tick;m.expectation.source=known.status==='cancelled'?'known death':'own timeout';addLog(w,p,'social',known.reason);}}
}
export function endExpectation(w:World,m:Memory,source:PromiseExpectation['source']):void{
 if(!hasPromiseExpectations(w)||!m.expectation)return;
 m.expectation.endedAt=w.tick;m.expectation.source=source;
}
export function noteExpectedReceipt(w:World,p:Person,requestId:number,item:ItemKind,amount:number):void{
 if(!hasPromiseExpectations(w))return;const e=p.socialMemory?.find(m=>m.requestId===requestId&&m.role==='asker')?.expectation;if(e&&e.item===item)e.received=Math.min(e.amount,e.received+amount);
}
/** A terminal report may revise a personally timed-out expectation, retaining the original agreement. */
export function storeKnownReport(w:World,p:Person,m:Memory):void{
 const memories=p.socialMemory??=[],old=memories.find(x=>x.requestId===m.requestId);
 if(old?.expectation&&hasPromiseExpectations(w)){const expectation=old.expectation;Object.assign(old,m,{expectation});endExpectation(w,old,'helper report');}
 else if(!old){memories.push(m);if(memories.length>32)memories.shift();}
}
export function expectedOutstanding(w:World,p:Person,item:ItemKind,planId?:number,destId=0):number{
 let n=0;
 for(const r of w.requests)if(r.from===p.id&&r.status==='pending'&&r.item===item&&(planId===undefined||r.planId===planId)&&(!destId||r.destId===destId||r.siteId===destId))n+=r.amount;
 for(const m of p.socialMemory??[]){const e=m.expectation;if(!e||e.item!==item||(planId!==undefined&&e.planId!==planId)||(destId&&e.destId!==destId&&m.siteId!==destId)||expectedStatus(w,p,m).status!=='promised')continue;n+=Math.max(0,e.amount-e.received);}
 return n;
}
export function expectsCare(w:World,p:Person):boolean{
 if(!hasPromiseExpectations(w))return w.requests.some(r=>r.from===p.id&&(r.kind==='watch'||r.kind==='fire')&&(r.status==='pending'||r.status==='promised'));
 return w.requests.some(r=>r.from===p.id&&(r.kind==='watch'||r.kind==='fire')&&r.status==='pending')||(p.socialMemory??[]).some(m=>m.expectation&&(m.task?.kind==='watch'||m.task?.kind==='fire')&&expectedStatus(w,p,m).status==='promised');
}
function expectedRequest(w:World,p:Person,m:Memory):Request{
 const e=m.expectation!,known=expectedStatus(w,p,m);
 return {id:m.requestId,kind:m.task!.kind,from:p.id,to:m.otherId,item:e.item,amount:m.task!.asked,offer:null,offerAmount:0,siteId:m.siteId,infoKind:'',created:e.made,expires:e.deadline,status:known.status,note:known.reason,resolved:e.endedAt??0,offered:e.amount,delivered:e.received,planId:e.planId||undefined,destId:e.destId,deadline:e.deadline,commitmentId:e.commitmentId};
}
/** Identity is already part of an accepted promise; this lookup reveals no current location or life state. */
export function promisedPerson(w:World,p:Person,id:number):{id:number;name:string}|null{
 if(knowsDeath(p,id))return null;const q=w.byId.get(id);return {id,name:q?.ent==='person'?q.name:w.deceased.find(d=>d.id===id)?.name??'the person I promised to help'};
}
export function promisedLocation(p:Person,id:number):{x:number;y:number;how:string}|null{
 const seen=p.seen.find(s=>s.ent==='person'&&s.id===id);if(seen)return {x:seen.x,y:seen.y,how:'in sight'};const old=p.whereabouts[id];return old?{x:old.x,y:old.y,how:'last remembered; may no longer be there'}:null;
}
/** Pure shared reader for decisions, inspector and the restricted AI observation. */
export function personalRequests(w:World,p:Person):Request[]{
 if(!hasPromiseExpectations(w))return w.requests;
 const out:Request[]=[];
 for(const r of w.requests){if(r.from!==p.id&&r.to!==p.id)continue;
  const m=p.socialMemory?.find(m=>m.requestId===r.id&&m.role===(r.from===p.id?'asker':'helper'));if(r.from===p.id&&m?.expectation)continue;
  if(r.to===p.id){const c=p.commitments.find(c=>c.requestId===r.id);if(c){const status:RequestStatus=c.status==='active'?'promised':c.status==='done'?'fulfilled':c.status==='moot'?'cancelled':c.status;out.push({...r,status,note:c.reason??'My accepted promise; no later outcome is known.',delivered:c.delivered??0});continue;}}
  // Forgotten accepted agreements do not reveal their remote operational outcome.
  if(r.commitmentId&&r.outcome!=='lent'&&!m)continue;
  out.push(m?{...r,status:m.outcome as RequestStatus,note:m.reason,resolved:m.tick,delivered:m.task?.receipt?.amount??0}:r);
 }
 for(const m of p.socialMemory??[])if(m.expectation)out.push(expectedRequest(w,p,m));
 return out.sort((a,b)=>a.created-b.created||a.id-b.id);
}
export function describeExpectation(e:PromiseExpectation|undefined):string{
 if(!e)return '';
 return ` Heard agreement: conversation #${e.conversationId}, tick ${e.made}, commitment #${e.commitmentId}; ${e.delay?.response==='accepted'?`originally expected by tick ${e.delay.originalExpectedDeadline}; revised in conversation #${e.delay.conversationId} at tick ${e.delay.responseAt} to tick ${e.deadline}`:`expected by tick ${e.deadline}`}. ${e.endedAt===undefined?'Waiting on personal knowledge, not the helper’s private progress.':`Expectation ended by ${e.source} at tick ${e.endedAt}.`}${describeDelay(e.delay)}`;
}
export function validatePromiseExpectations(w:World):void{
 const integer=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 for(const p of w.persons){const memories=p.socialMemory??[];if(memories.some(m=>m.expectation!==undefined)&&(memories.length>32||new Set(memories.map(m=>m.requestId)).size!==memories.length))throw new Error('Invalid expectation memory count');
 for(const m of memories)if(m.expectation!==undefined){const e=m.expectation;
  if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,82)||!e||m.role!=='asker'||!m.task||!integer(e.commitmentId,1)||!integer(e.conversationId,1)||!integer(e.made,0,w.tick)||!integer(e.deadline,e.made)||!Number.isFinite(e.amount)||e.amount<=0||e.item!==null&&!ALL_ITEMS.includes(e.item)||!integer(e.planId)||!integer(e.destId)||typeof e.otherName!=='string'||e.otherName.length>100||!Number.isFinite(e.received)||e.received<0||e.received>e.amount||e.endedAt!==undefined&&(!integer(e.endedAt,e.made,w.tick)||!['observed completion','helper report','known death','own timeout',...(runsRulesVersion(w,84)?['own cancellation']:[])].includes(e.source??''))||!integer(m.tick,e.made,w.tick)||e.source==='own timeout'&&(m.outcome!=='expired'||Number(e.endedAt)<=e.deadline)||e.source==='known death'&&m.outcome!=='cancelled'||e.source==='own cancellation'&&(m.outcome!=='cancelled'||m.cancellation?.source!=='own target observation')||e.source==='observed completion'&&!['fulfilled','partial'].includes(m.outcome)||e.source==='helper report'&&!m.completion&&!m.resolution||e.endedAt===undefined&&(e.source!==undefined||m.outcome!=='promised'))throw new Error('Invalid personal promise expectation');
 }
 }
}
