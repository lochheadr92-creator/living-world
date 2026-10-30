// Completion is an engine fact; knowledge and acknowledgement belong to people in contact.
import {DAY} from './constants';
import {runsRulesVersion} from './rulesversion';
import {sameSpace} from './habitation';
import {senseRadius} from './perception';
import {adjustRel} from './relations';
import {noteDeed} from './reputation';
import {addLog} from './events';
import type {Commitment,Person,Request,World} from './types';
export interface CompletionKnowledge {source:'own completion'|'observed completion'|'helper report';tick:number;from:number;completedAt:number;commitmentId:number;activityId:number;conversationId?:number;acknowledgedAt?:number;reportAfter?:number}
type Memory=NonNullable<Person['socialMemory']>[number];
let enabled=true;
export const promiseKnowledgeOn=()=>enabled;
export function setPromiseKnowledge(on:boolean):void{enabled=on;}
export const hasPromiseKnowledge=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,80);
export function completionContact(w:World,a:Person,b:Person):boolean{return a.alive&&b.alive&&a.pose!=='sleep'&&b.pose!=='sleep'&&a.activity?.kind!=='sleep'&&b.activity?.kind!=='sleep'&&sameSpace(w,a,b)&&Math.hypot(a.x-b.x,a.y-b.y)<=Math.min(3,senseRadius(w,a),senseRadius(w,b));}
export function canWitnessCompletion(w:World,a:Person,b:Person,r:Request):boolean{
 if(!completionContact(w,a,b))return false;
 if(r.destKind==='building'||r.destKind==='site'){
  const target=w.byId.get(r.destId??0);if(!target||!['building','site'].includes(target.ent))return false;
  if(a.indoors&&a.indoors!==target.id)return false;
  if(Math.hypot(a.x-target.x,a.y-target.y)>senseRadius(w,a))return false;
 }
 if(r.kind!=='watch')return true;
 const child=w.byId.get(r.destId??0);return child?.ent==='person'&&child.alive&&sameSpace(w,a,child)&&Math.hypot(a.x-child.x,a.y-child.y)<=senseRadius(w,a);
}
/** Called after settlement of an actual completed commitment, never from a report or an observer. */
export function recordPromiseCompletion(w:World,asker:Person|null,helper:Person,r:Request,c:Commitment):boolean{
 const own=helper.socialMemory?.find(m=>m.requestId===r.id&&m.role==='helper');
 const evidence:CompletionKnowledge={source:'own completion',tick:w.tick,from:helper.id,completedAt:w.tick,commitmentId:c.id,activityId:helper.activity?.data.commitmentId===c.id?helper.activity.id:0};
 if(own&&!own.completion)own.completion=evidence;
 if(!asker||!canWitnessCompletion(w,asker,helper,r))return false;
 const known=asker.socialMemory?.find(m=>m.requestId===r.id&&m.role==='asker');if(!known||known.completion)return false;
 known.completion={...evidence,source:'observed completion',from:asker.id};if(own?.completion)own.completion.acknowledgedAt=w.tick;
 adjustRel(asker,helper.id,w.tick,{aff:3,trust:6,note:`Saw ${helper.name} complete their promised contribution`});
 adjustRel(helper,asker.id,w.tick,{aff:1,trust:1});
 noteDeed(w,asker,helper,'reliable',`Saw ${helper.name} complete a promise to ${asker.name}`,true);
 return true;
}
export function pendingCompletionReports(w:World,p:Person):Memory[]{
 if(!hasPromiseKnowledge(w))return [];
 return (p.socialMemory??[]).filter(m=>m.role==='helper'&&m.completion?.source==='own completion'&&m.completion.acknowledgedAt===undefined&&w.tick-m.completion.completedAt<=12*DAY&&(m.completion.reportAfter??0)<=w.tick).slice().reverse();
}
/** The speaker reads their own retained outcome. The listener gets a report, never the speaker's firsthand receipt. */
export function receiveCompletionReport(w:World,speaker:Person,listener:Person,requestId:number,conversationId:number):string|null{
 if(!hasPromiseKnowledge(w)||!completionContact(w,speaker,listener))return null;
 const m=pendingCompletionReports(w,speaker).find(m=>m.requestId===requestId&&m.otherId===listener.id);if(!m?.completion)return null;
 m.completion.reportAfter=w.tick+400;
 const memories=listener.socialMemory??=[],known=memories.find(x=>x.requestId===requestId);
 if(!known){
  const t=m.task;
  memories.push({requestId,otherId:speaker.id,siteId:m.siteId,tick:w.tick,outcome:m.outcome,reason:`${speaker.name} reported: ${m.reason}`,role:'asker',...(t?{task:{kind:t.kind,item:t.item,asked:t.asked,...(t.offered!==undefined?{offered:t.offered}:{})}}:{}),completion:{source:'helper report',tick:w.tick,from:speaker.id,completedAt:m.completion.completedAt,commitmentId:m.completion.commitmentId,activityId:m.completion.activityId,conversationId}});
  if(memories.length>32)memories.shift();
 }
 addLog(w,listener,'social',`Heard ${speaker.name}'s completion report for request #${requestId}; the work itself was not witnessed here.`);
 const task=m.task?.kind,work=task==='watch'?'watching the child':task==='fire'?'tending the fire':task==='repair'?'mending the roof':task==='help_build'?'helping with the building':task==='haul'?'bringing the materials':m.task?.item?`bringing the agreed ${m.task.item}`:'my part of the work';
 return `I've finished ${work}, as we agreed.`;
}
export function acknowledgeCompletionReport(w:World,speaker:Person,listener:Person,requestId:number):boolean{
 if(!hasPromiseKnowledge(w)||!completionContact(w,speaker,listener))return false;
 const own=speaker.socialMemory?.find(m=>m.requestId===requestId&&m.role==='helper'),known=listener.socialMemory?.find(m=>m.requestId===requestId&&m.role==='asker');
 if(!own?.completion||own.completion.source!=='own completion'||!known?.completion)return false;
 if(own.completion.acknowledgedAt===undefined){own.completion.acknowledgedAt=w.tick;delete own.completion.reportAfter;addLog(w,speaker,'social',`${listener.name} acknowledged hearing my report for request #${requestId}.`);}
 return true;
}
export function describeCompletion(k:CompletionKnowledge|undefined):string{
 if(!k)return '';
 return ` Knowledge: ${k.source}, learned tick ${k.tick}${k.source==='helper report'?` from person #${k.from}, conversation #${k.conversationId}; reported, not independently witnessed`:''}; completion tick ${k.completedAt}, commitment #${k.commitmentId}${k.activityId?`, activity #${k.activityId}`:''}.${k.source==='own completion'?k.acknowledgedAt===undefined?' No acknowledgement received.':` Acknowledged at tick ${k.acknowledgedAt}.`:''}`;
}
export function validatePromiseKnowledge(w:World):void{
 const integer=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 for(const p of w.persons){const memories=p.socialMemory??[];if(memories.some(m=>m.completion!==undefined)&&(memories.length>32||new Set(memories.map(m=>m.requestId)).size!==memories.length))throw new Error('Invalid completion memory count');
 for(const m of memories)if(m.completion!==undefined){const k=m.completion;
  if(w.settings.dynamics!=='rich'||!runsRulesVersion(w,80)||!k||!['own completion','observed completion','helper report'].includes(k.source)||!integer(k.tick,0,w.tick)||!integer(k.completedAt,0,k.tick)||!integer(k.commitmentId,1)||!integer(k.activityId)||!['fulfilled','partial'].includes(m.outcome)||k.source==='own completion'&&m.role!=='helper'||k.source!=='own completion'&&m.role!=='asker'||k.from!==(k.source==='helper report'?m.otherId:p.id)||k.source==='helper report'&&!integer(k.conversationId,1)||k.acknowledgedAt!==undefined&&(k.source!=='own completion'||!integer(k.acknowledgedAt,k.tick,w.tick)))throw new Error('Invalid personal promise completion knowledge');
  if(k.source==='helper report'&&(m.task?.receipt||m.task?.workReceipt))throw new Error('Reported completion is not firsthand task evidence');
  if(!integer(m.tick,0,w.tick))throw new Error('Invalid completion memory timestamp');
  if(k.reportAfter!==undefined&&(k.source!=='own completion'||!integer(k.reportAfter,k.tick,w.tick+400)))throw new Error('Invalid bounded report retry');
 }
 }
}
