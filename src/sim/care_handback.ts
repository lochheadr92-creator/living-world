// An accepted watch returns through actual three-person contact, never remote recovery.
import {runsRulesVersion} from './rulesversion';
import {laidUp,WATCH_TICKS} from './responsibilities';
import {personalDriveMax,settle} from './social';
import {completionContact} from './promise_knowledge';
import {expectedStatus} from './promise_expectations';
import {sameSpace} from './habitation';
import {isAdultWorker} from './people';
import {releaseClaims} from './economy';
import {addLog} from './events';
import type {Activity,Person,World} from './types';
type Memory=NonNullable<Person['socialMemory']>[number];
export interface CareHandback {childId:number;commitmentId:number;conversationId:number;proposedAt:number;answeredAt?:number;state:'proposed'|'accepted'|'refused'|'already ended';reason:string;watchedTicks?:number;}
let enabled=true;
export const careHandbackOn=()=>enabled;
export const setCareHandback=(on:boolean):void=>{enabled=on;};
export const hasCareHandback=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,97);
const able=(w:World,p:Person)=>p.alive&&isAdultWorker(w,p)&&!laidUp(w,p)&&p.health>=45&&p.needs.energy>=30&&personalDriveMax(w,p)<=50;
/** Only the requester's own agreement and present capability; no helper-state lookup. */
export function careReturns(w:World,p:Person):Memory[]{
 if(!hasCareHandback(w)||!able(w,p))return [];
 return (p.socialMemory??[]).filter(m=>m.role==='asker'&&m.task?.kind==='watch'&&m.expectation&&expectedStatus(w,p,m).status==='promised'&&(p.cooldowns['care-return:'+m.requestId]??0)<=w.tick&&m.careHandback?.state!=='accepted').slice(-2);
}
function childContact(w:World,a:Person,b:Person,id:number):boolean{
 const q=w.byId.get(id);return q?.ent==='person'&&q.alive&&sameSpace(w,a,q)&&sameSpace(w,b,q)&&Math.hypot(a.x-q.x,a.y-q.y)<=3.2&&Math.hypot(b.x-q.x,b.y-q.y)<=3.2;
}
function rememberHelper(p:Person,other:number,own:Memory):Memory{
 const memories=p.socialMemory??=[];let m=memories.find(m=>m.requestId===own.requestId&&m.otherId===other&&m.role==='helper');
 if(!m){m={requestId:own.requestId,otherId:other,siteId:0,tick:own.tick,outcome:'promised',reason:'Heard a proposal to return childcare.',role:'helper',task:{kind:'watch',item:null,asked:1,offered:1}};memories.push(m);if(memories.length>32)memories.shift();}
 return m;
}
export function proposeCareReturn(w:World,a:Person,b:Person,requestId:number,conversationId:number):string|null{
 if(!hasCareHandback(w)||!completionContact(w,a,b))return null;
 const m=careReturns(w,a).find(m=>m.requestId===requestId&&m.otherId===b.id),e=m?.expectation;if(!m||!e)return null;
 const c=b.commitments.find(c=>c.id===e.commitmentId&&c.to===a.id&&c.requestId===requestId&&c.milestone==='watched');
 if(!c)return null;const h:CareHandback={childId:e.destId,commitmentId:e.commitmentId,conversationId,proposedAt:w.tick,state:'proposed',reason:'The requester says they can take care back; acceptance has not been heard.'};
 m.careHandback={...h};rememberHelper(b,a.id,m).careHandback={...h};a.cooldowns['care-return:'+requestId]=w.tick+160;
 addLog(w,b,'social',`${a.name} asked to take care back. My watch has not ended merely because they asked.`);
 return 'I feel able to take care of the child again. Can I take over here?';
}
export function answerCareReturn(w:World,a:Person,b:Person,requestId:number,conversationId:number):string|null{
 if(!hasCareHandback(w)||!completionContact(w,a,b))return null;
 const am=a.socialMemory?.find(m=>m.role==='asker'&&m.requestId===requestId&&m.otherId===b.id),bm=b.socialMemory?.find(m=>m.role==='helper'&&m.requestId===requestId&&m.otherId===a.id),h=am?.careHandback;
 if(!h||h.state!=='proposed'||h.conversationId!==conversationId||bm?.careHandback?.conversationId!==conversationId)return null;
 const c=b.commitments.find(c=>c.id===h.commitmentId&&c.requestId===requestId&&c.to===a.id&&c.destId===h.childId&&c.milestone==='watched');
 if(!c)return null;
 const state:CareHandback['state']=c.status!=='active'?'already ended':!able(w,a)||!childContact(w,a,b,h.childId)?'refused':'accepted';
 const reason=state==='accepted'?'The recovered requester and helper agreed in contact with the child; the remaining watch was returned, not completed.':state==='already ended'?`The helper reports that this watch already ended (${c.status}).`:'The return is not safe now: the requester must be capable and both adults must be with the child.';
 const held=b.suspended?.data.commitmentId===c.id&&b.suspended.data.watch?b.suspended:undefined;
 const watched=held?.data.watchedTicks??held?.progress??0;
 for(const m of [am!,bm!]){Object.assign(m.careHandback!,{state,answeredAt:w.tick,reason,...(held?{watchedTicks:watched}:{})});m.tick=w.tick;}
 if(state==='accepted'){
  c.status='cancelled';c.reason='The requester resumed care here by agreement; remaining watch cancelled.';
  if(held){releaseClaims(w,held.claims);b.suspended=null;}
  am!.outcome=bm!.outcome='cancelled';am!.reason=bm!.reason=reason;am!.expectation!.endedAt=w.tick;am!.expectation!.source='agreed care return';
  const r=w.requests.find(r=>r.id===requestId&&r.from===a.id&&r.to===b.id);if(r?.status==='promised')settle(w,r,'cancelled',c.reason);
 }else if(state==='already ended'){
  am!.expectation!.endedAt=w.tick;am!.expectation!.source='helper report';am!.outcome=c.status==='done'?'fulfilled':c.status==='moot'?'cancelled':c.status;am!.reason=reason;
 }
 addLog(w,a,'social',reason);addLog(w,b,'social',reason);
 return state==='accepted'?'Yes. You are here with the child; you can take over now.':state==='already ended'?'That watch has already ended.':'Not yet. We need you well enough and both of us here with the child.';
}
/** Watch time is paid only in physical contact; travel and conversations add none. */
export function retainWatchTick(w:World,a:Activity):void{if(hasCareHandback(w))a.data.watchedTicks=a.progress;}
export function restoreWatchProgress(w:World,a:Activity):void{if(hasCareHandback(w)&&a.data.watch){a.duration=WATCH_TICKS;a.progress=a.pprogress=a.data.watchedTicks??0;}}
export function careReturnHistory(p:Person):string[]{return (p.socialMemory??[]).filter(m=>m.careHandback).slice(-3).map(m=>{const h=m.careHandback!;return `Childcare return for person #${h.childId}: ${h.state}, proposed at tick ${h.proposedAt}${h.answeredAt===undefined?'; answer not heard':`, answered ${h.answeredAt}`}. ${h.reason}${h.watchedTicks===undefined?'':` ${h.watchedTicks} actual watch ticks retained; no full-watch completion claimed.`}`;});}
export function validateCareHandback(w:World):void{
 const ok=w.settings.dynamics==='rich'&&runsRulesVersion(w,97),int=(v:unknown,min:number,max:number)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
 for(const p of w.persons){for(const m of p.socialMemory??[]){const h=m.careHandback;if(!h)continue;
  if(!ok||m.task?.kind!=='watch'||!int(h.childId,1,Number.MAX_SAFE_INTEGER)||!int(h.commitmentId,1,Number.MAX_SAFE_INTEGER)||!int(h.conversationId,1,Number.MAX_SAFE_INTEGER)||!int(h.proposedAt,0,w.tick)||!['proposed','accepted','refused','already ended'].includes(h.state)||typeof h.reason!=='string'||h.reason.length>500||h.state==='proposed'&&h.answeredAt!==undefined||h.state!=='proposed'&&h.answeredAt===undefined||h.answeredAt!==undefined&&!int(h.answeredAt,h.proposedAt,w.tick)||h.watchedTicks!==undefined&&!int(h.watchedTicks,0,WATCH_TICKS)||m.role==='asker'&&(m.expectation?.commitmentId!==h.commitmentId||m.expectation?.destId!==h.childId))throw new Error('Invalid childcare return receipt');
  const c=m.role==='helper'?p.commitments.find(c=>c.id===h.commitmentId):undefined;
  if(c&&(c.requestId!==m.requestId||c.to!==m.otherId||c.destId!==h.childId||c.milestone!=='watched'))throw new Error('Mismatched childcare return obligation');
 }
 for(const a of [p.activity,p.suspended])if(a?.data.watchedTicks!==undefined&&(!ok||a.kind!=='visit'||!a.data.watch||!int(a.data.watchedTicks,0,WATCH_TICKS)))throw new Error('Invalid retained watch progress');
 if(!ok&&[p.activity,p.suspended].some(a=>a?.data.purpose==='return_care'))throw new Error('Unsupported childcare return activity');
 }
 if(!ok&&w.conversations.some(c=>c.purpose==='return_care'))throw new Error('Unsupported childcare return conversation');
}
