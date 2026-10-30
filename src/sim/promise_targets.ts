import {recordRequesterTarget} from './request_cancellation';
// Local target changes belong to the existing accepted obligation, then its bounded outcome receipt.
import {runsRulesVersion} from './rulesversion';
import {senseRadius} from './perception';
import {addLog} from './events';
import type {Commitment,Person,World} from './types';
export interface PromiseTargetEvidence {targetId:number;kind:'building'|'site';tick:number;x:number;y:number;source:'observed absence'|'completed here'}
let enabled=true;
export const promiseTargetsOn=()=>enabled;
export function setPromiseTargets(on:boolean):void{enabled=on;}
export const hasPromiseTargets=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,83);
export function promiseTarget(c:Commitment):{id:number;kind:'building'|'site'}|null{
 if(c.kind==='work'&&c.destKind==='building'&&c.destId)return {id:c.destId,kind:'building'};
 if(['help_build','haul','work'].includes(c.kind)&&c.siteId)return {id:c.siteId,kind:'site'};
 return null;
}
/** Called only at physical missing-place observation or by the worker who actually completes this site. */
export function observePromiseTarget(w:World,p:Person,id:number,x:number,y:number,source:PromiseTargetEvidence['source']='observed absence'):void{
 if(!hasPromiseTargets(w)||!p.alive||p.indoors||p.pose==='sleep'||p.activity?.kind==='sleep'||w.byId.has(id)||Math.hypot(p.x-x,p.y-y)>senseRadius(w,p)*0.92)return;
 const remembered=p.beliefs[id];if(remembered?.kind==='building'||remembered?.kind==='site')recordRequesterTarget(w,p,{targetId:id,kind:remembered.kind,tick:w.tick,x,y,source});
 for(const c of p.commitments){const t=promiseTarget(c);if(c.status!=='active'||!t||t.id!==id||c.targetEvidence)continue;
  if(source==='completed here'&&(t.kind!=='site'||(c.contrib??0)<=0))continue;
  c.targetEvidence={targetId:id,kind:t.kind,tick:w.tick,x,y,source};
  addLog(w,p,'work',source==='completed here'?'I finished the site I had promised to help with.':`The ${t.kind} I promised to help with is no longer here; I do not know why.`);
 }
}
/** Unknown disappearance never establishes completion, abandonment, or another person's intent. */
export function targetOutcome(w:World,c:Commitment):{done:boolean;reason:string}|null{
 if(!hasPromiseTargets(w)||!c.targetEvidence)return null;
 const k=c.targetEvidence,total=c.kind==='haul'?Math.max(1,c.amount):40,got=c.kind==='haul'?c.delivered??0:c.contrib??0;
 if(k.source==='completed here'&&c.kind!=='haul'||got>=total)return {done:true,reason:'completed my promised contribution'};
 return {done:false,reason:k.source==='completed here'?`I finished the site, but delivered only ${got}/${total} ${c.item??'items'} promised. There is no longer a site to receive the rest.`:`I saw that the promised ${k.kind} was no longer there; its fate is unknown. My contribution remains ${got}/${total}.`};
}
export function describeTargetEvidence(k:PromiseTargetEvidence|undefined):string{
 return k?` Target evidence: ${k.source}, ${k.kind} #${k.targetId}, tick ${k.tick}, at (${k.x}, ${k.y}).`:'';
}
export function validateTargetEvidence(w:World,k:PromiseTargetEvidence,maxTick=w.tick):void{
 if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,83)||!k||!Number.isSafeInteger(k.targetId)||k.targetId<=0||!['building','site'].includes(k.kind)||!Number.isSafeInteger(k.tick)||k.tick<0||k.tick>maxTick||!Number.isFinite(k.x)||!Number.isFinite(k.y)||k.x<0||k.y<0||k.x>w.W||k.y>w.H||!['observed absence','completed here'].includes(k.source)||k.source==='completed here'&&k.kind!=='site')throw new Error('Invalid personal promise target evidence');
}
export function validatePromiseTargets(w:World):void{
 for(const p of w.persons)for(const c of p.commitments)if(c.targetEvidence!==undefined){const k=c.targetEvidence,t=promiseTarget(c);validateTargetEvidence(w,k);if(!t||t.id!==k.targetId||t.kind!==k.kind||k.tick<c.made)throw new Error('Target evidence does not match promise');}
}
