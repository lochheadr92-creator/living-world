// A bounded collective choice over who coordinates ONE existing public project.
// Support is recorded only by actual recruitment conversations. This owns no goods.
import type { Person, World } from './types';
import type { CivicProject, Participation } from './townships';
import { runsRulesVersion } from './rulesversion';
import { knowsDeath, withinHearing } from './death_knowledge';
import { addEvent } from './events';
export interface Council {
 candidates: { personId:number; tick:number; reason:string }[];
 coordinatorId:number;
 changes:{tick:number;from:number;to:number;reason:string}[];
}
let enabled=true;
export const civicChoiceOn=()=>enabled;
export function setCivicChoice(on:boolean):void{enabled=on;}
export const hasCivicChoice=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,15);
export function councilFor(w:World,q:CivicProject):Council|undefined{return hasCivicChoice(w)?q.council:undefined;}
export function initialiseCouncil(w:World,q:CivicProject):void{
 if(!hasCivicChoice(w))return;
 q.council={candidates:[{personId:q.organiserId,tick:w.tick,reason:'proposed the physical project'}],coordinatorId:0,changes:[]};
 q.participants[0].supports=q.organiserId;
}
const member=(w:World,p:Person,q:CivicProject)=>w.households.find(h=>h.id===p.hhId)?.townshipId===q.townshipId;
export function challengeReason(w:World,p:Person,q:CivicProject):string{
 const c=councilFor(w,q);if(!c||c.candidates.length>=4||!p.beliefs[q.siteId]||!q.participants.some(m=>m.personId===p.id)||!member(w,p,q))return '';
 if(c.candidates.some(x=>x.personId===p.id))return '';
 const own=q.participants.find(m=>m.personId===p.id)!;
 const leader=own.supports||own.decisions?.at(-1)?.candidateId||q.organiserId,rel=p.relations[leader];
 if(knowsDeath(p,leader))return 'the previous organiser is known to have died';
 if(rel?.grievance)return 'a remembered grievance against the organiser';
 if((rel?.trust??10)<0||(rel?.affinity??0)<0)return 'does not trust the present organiser';
 if(p.civicOutcomes?.some(m=>m.organiserId===leader&&!m.success))return 'personally witnessed this organiser fail';
 return '';
}
export function mayCoordinate(w:World,p:Person,q:CivicProject):boolean{
 const c=councilFor(w,q);return !!c&&p.alive&&member(w,p,q)&&(c.candidates.some(x=>x.personId===p.id)&&q.participants.some(m=>m.personId===p.id&&m.status==='supporting')||!!challengeReason(w,p,q));
}
export function mayAskSupport(w:World,a:Person,b:Person,q:CivicProject):boolean{
 const c=councilFor(w,q);if(!c||!mayCoordinate(w,a,q)||a.id===b.id||!member(w,b,q))return false;
 const m=q.participants.find(m=>m.personId===b.id);
 return (!m||m.status!=='withdrawn') && !m?.decisions?.some(d=>d.candidateId===a.id) && m?.supports!==a.id;
}
/** A challenger has actually reached someone and proposes to coordinate the existing work. */
export function nominate(w:World,a:Person,b:Person,q:CivicProject):void{
 const c=councilFor(w,q);if(!c||!withinHearing(a,b)||c.candidates.some(x=>x.personId===a.id))return;
 const reason=challengeReason(w,a,q);if(!reason)return;
 c.candidates.push({personId:a.id,tick:w.tick,reason});
 const m=q.participants.find(m=>m.personId===a.id)!;
 releaseOldSupport(w,a,q.siteId,'proposed an alternative coordinator');
 m.status='supporting';m.supports=a.id;m.reason=reason;
 recount(w,q);
 addEvent(w,'social',`${a.name} proposed to coordinate the shared storehouse: ${reason}.`,[a.id,q.siteId],a.x,a.y);
}
/** Compare only the respondent's relationships and personally witnessed outcomes. */
export function confidence(p:Person,id:number):number{
 const r=p.relations[id];
 const experience=Math.max(-0.12,Math.min(0.12,(p.civicOutcomes??[]).filter(m=>m.organiserId===id).reduce((n,m)=>n+(m.success?0.04:-0.04),0)));
 return 0.004*(r?.affinity??0)+0.003*(r?.trust??10)+experience-(r?.grievance?0.15:0);
}
export function oppositionReason(w:World,p:Person,a:Person,q:CivicProject):string{
 if(!councilFor(w,q))return '';
 const m=q.participants.find(m=>m.personId===p.id),old=m?.status==='supporting'?m.supports:0;
 if(!old||old===a.id||knowsDeath(p,old))return '';
 return confidence(p,a.id)>confidence(p,old)+0.05?'':`prefers the organiser already supported (#${old})`;
}
export function releaseOldSupport(w:World,p:Person,siteId:number,reason:string):void{
 for(const c of p.commitments)if(c.siteId===siteId&&c.status==='active'){
  c.status='interrupted';c.reason=reason;
  const r=w.requests.find(r=>r.id===c.requestId);if(r){r.status='interrupted';r.note=reason;r.resolved=w.tick;r.outcome='interrupted';}
 }
}
export function recordChoice(w:World,q:CivicProject,m:Participation,a:Person,accepted:boolean,reason:string):void{
 if(!councilFor(w,q))return;
 const decisions=m.decisions??=[];
 if(decisions.some(d=>d.candidateId===a.id))return;
 decisions.push({candidateId:a.id,accepted,reason,tick:w.tick});
 if(accepted)m.supports=a.id;
 recount(w,q);
}
export function mandate(w:World,q:CivicProject):number{
 const c=councilFor(w,q);if(!c)return q.organiserId;
 const counts=c.candidates.map(x=>{
  const p=w.byId.get(x.personId);
  const eligible=p?.ent==='person'&&p.alive&&member(w,p,q);
  return {id:x.personId,n:eligible?q.participants.filter(m=>m.status==='supporting'&&m.supports===x.personId&&(()=>{const p=w.byId.get(m.personId);return p?.ent==='person'&&p.alive&&member(w,p,q);})()).length:0};
 }).sort((a,b)=>b.n-a.n||a.id-b.id);
 return counts[0]?.n>=2&&counts[0].n>(counts[1]?.n??0)?counts[0].id:0;
}
/** Public accepted support determines authority; a tie or fewer than two supporters means no mandate. */
export function recount(w:World,q:CivicProject):void{
 const c=councilFor(w,q);if(!c||q.status!=='active')return;
 const winner=mandate(w,q);
 if(winner===c.coordinatorId)return;
 const reason=winner?'most accepted support (at least two people)':'support is tied, insufficient or the coordinator left';
 c.changes.push({tick:w.tick,from:c.coordinatorId,to:winner,reason});if(c.changes.length>12)c.changes.shift();
 c.coordinatorId=winner;
}
export function councilAllowsWork(w:World,p:Person,q:CivicProject):boolean{
 const c=councilFor(w,q);const leader=mandate(w,q);return !c||!!leader&&q.participants.some(m=>m.personId===p.id&&m.status==='supporting'&&m.supports===leader);
}
