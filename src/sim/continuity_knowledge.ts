// What one household member actually told another about their work. No estate or skill transfer.
import {runsRulesVersion} from './rulesversion';
import {completionContact} from './promise_knowledge';
import {relOf} from './relations';
import {learn} from './knowledge';
import {addLog} from './events';
import {DAY} from './constants';
import type {Intention,ItemKind,Person,World} from './types';
export interface HeardUndertaking {
 planId:number;from:number;name:string;householdId:number;heardAt:number;conversationId:number;
 kind:'shelter'|'tool'|'stock'|'batch';aboutId:number;makes:string;recipe?:string;forSite?:number;worked:number;goal:string;
 retryAfter?:number;obstacle?:string;
 /** rules 100: the material the plan was fetching when told, and the tick the listener left that supply to the teller */
 item?:ItemKind;deferredAt?:number;
 /** rules 104: heard at a shared household supper rather than in a conversation; the id is then the meal's */
 via?:'meal';
}
export interface ToldUndertaking {planId:number;tick:number;conversationId:number;acknowledgedAt?:number}
let enabled=true;
export const continuityKnowledgeOn=()=>enabled;
export const setContinuityKnowledge=(on:boolean):void=>{enabled=on;};
export const hasContinuityKnowledge=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,92);
export function shareableUndertaking(i:Intention):boolean{
 return i.status==='active'&&(i.kind==='tool'||i.kind==='stock'||i.kind==='shelter'&&!!i.aboutId||i.kind==='batch'&&!!i.forSite);
}
/** Offer creation reads the speaker's own intentions and record of what they said. */
export function workToTell(w:World,a:Person,otherId:number):Intention|null{
 if(!hasContinuityKnowledge(w))return null;
 return a.intentions.find(i=>shareableUndertaking(i)&&!a.relations[otherId]?.workTold?.some(k=>k.planId===i.id&&w.tick-k.tick<DAY))??null;
}
export function hearUndertaking(w:World,a:Person,b:Person,planId:number,conversationId:number,via?:'meal'):string|null{
 if(!hasContinuityKnowledge(w)||!completionContact(w,a,b)||!a.hhId||a.hhId!==b.hhId)return null;
 const i=a.intentions.find(i=>i.id===planId&&shareableUndertaking(i));if(!i)return null;
 const r=relOf(b,a.id),said=relOf(a,b.id);
 if(r.workHeard?.some(k=>k.conversationId===conversationId&&k.planId===planId))return `I am working to ${i.goal}.`;
 const item=runsRulesVersion(w,100)?(Object.keys(i.wants) as ItemKind[]).find(x=>(i.wants[x]??0)>0)??i.stepItem??undefined:undefined;
 const k:HeardUndertaking={planId,from:a.id,name:a.name,householdId:a.hhId,heardAt:w.tick,conversationId,kind:i.kind as HeardUndertaking['kind'],aboutId:i.aboutId,makes:i.makes,worked:i.worked,goal:i.goal.slice(0,240),...(i.recipe?{recipe:i.recipe}:{}),...(i.forSite?{forSite:i.forSite}:{}),...(item?{item}:{}),...(via&&runsRulesVersion(w,104)?{via}:{})};
 r.workHeard=[...(r.workHeard??[]).filter(x=>x.planId!==planId),k].slice(-2);
 said.workTold=[...(said.workTold??[]).filter(x=>x.planId!==planId),{planId,tick:w.tick,conversationId}].slice(-2);
 // A dated place report, copied from the speaker's memory, never refreshed from the world.
 for(const id of [i.aboutId,i.forSite]){const known=id?a.beliefs[id]:undefined;if(known&&(!b.beliefs[known.id]||known.seen>b.beliefs[known.id].seen))learn(b,{...structuredClone(known),src:'told',from:a.id,learned:w.tick,hops:(known.hops??0)+1,origin:known.origin??a.id});}
 addLog(w,b,'social',`Heard ${a.name}'s undertaking #${planId}${k.via==='meal'?` at our supper #${conversationId}`:''}: ${k.goal}; reported progress ${Math.round(k.worked)} at tick ${w.tick}. This is information, not my promise.`);
 return `I am working to ${k.goal}; I have done ${Math.round(k.worked)} work so far.`;
}
export function acknowledgeUndertaking(w:World,a:Person,b:Person,planId:number,conversationId:number):boolean{
 if(!hasContinuityKnowledge(w)||!completionContact(w,a,b))return false;
 const k=a.relations[b.id]?.workTold?.find(k=>k.planId===planId&&k.conversationId===conversationId);
 if(!k)return false;k.acknowledgedAt??=w.tick;return true;
}
export function validateContinuityKnowledge(w:World):void{
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,92),id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0,time=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=w.tick;
 for(const p of w.persons)for(const [other,r] of Object.entries(p.relations)){
  if(r.workHeard!==undefined){if(!allowed||!Array.isArray(r.workHeard)||r.workHeard.length>2||new Set(r.workHeard.map(k=>k.planId)).size!==r.workHeard.length)throw new Error('Invalid heard undertakings');
   for(const k of r.workHeard)if(!k||!id(k.planId)||k.from!==Number(other)||!id(k.householdId)||!id(k.conversationId)||!time(k.heardAt)||!['shelter','tool','stock','batch'].includes(k.kind)||!Number.isSafeInteger(k.aboutId)||k.aboutId<0||typeof k.name!=='string'||typeof k.goal!=='string'||k.goal.length>240||typeof k.makes!=='string'||!Number.isFinite(k.worked)||k.worked<0||k.forSite!==undefined&&!id(k.forSite)||k.recipe!==undefined&&typeof k.recipe!=='string'||k.retryAfter!==undefined&&(!Number.isSafeInteger(k.retryAfter)||k.retryAfter<k.heardAt||k.retryAfter>w.tick+400)||k.obstacle!==undefined&&(typeof k.obstacle!=='string'||k.obstacle.length>240)||k.item!==undefined&&(!runsRulesVersion(w,100)||typeof k.item!=='string')||k.deferredAt!==undefined&&(!runsRulesVersion(w,100)||!time(k.deferredAt)||k.deferredAt<k.heardAt)||k.via!==undefined&&(!runsRulesVersion(w,104)||k.via!=='meal'))throw new Error('Invalid heard undertaking');
  }
  if(r.workTold!==undefined){if(!allowed||!Array.isArray(r.workTold)||r.workTold.length>2||new Set(r.workTold.map(k=>k.planId)).size!==r.workTold.length)throw new Error('Invalid told undertakings');for(const k of r.workTold)if(!id(k.planId)||!id(k.conversationId)||!time(k.tick)||k.acknowledgedAt!==undefined&&(!time(k.acknowledgedAt)||k.acknowledgedAt<k.tick))throw new Error('Invalid told undertaking');}
 }
 if(!allowed&&(w.conversations.some(c=>c.purpose==='share_work')||w.persons.some(p=>[p.activity,p.suspended].some(a=>a?.data.purpose==='share_work'))))throw new Error('Unsupported undertaking conversation');
}
