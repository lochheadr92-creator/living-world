// Political continuity belongs to each resident's own past choices. Factions are derived,
// never centrally assigned, and other residents' private histories are not decision inputs.
import type { World, Person } from './types';
import { runsRulesVersion } from './rulesversion';
import { knowsDeath } from './death_knowledge';
export interface CivicAlignment {projectId:number; townshipId:number; candidateId:number; tick:number}
let enabled=true;
export const politicalAlignmentOn=():boolean=>enabled;
export function setPoliticalAlignment(on:boolean):void{enabled=on;}
export const hasPoliticalAlignment=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,23);
export function rememberAlignment(w:World,p:Person,projectId:number,townshipId:number,candidateId:number):void{
 if(!hasPoliticalAlignment(w))return;
 const records=p.civicAlignment??=[];
 const old=records.findIndex(r=>r.projectId===projectId);if(old>=0)records.splice(old,1);
 records.push({projectId,townshipId,candidateId,tick:w.tick});if(records.length>24)records.shift();
}
/** Only the last four OTHER project choices in this township: a switch replaces a vote. */
export function alignment(w:World,p:Person,townshipId:number,excludeProject=0):{candidateId:number;choices:number}|undefined{
 if(!hasPoliticalAlignment(w))return;
 const counts=new Map<number,number>();
 for(const r of (p.civicAlignment??[]).filter(r=>r.townshipId===townshipId&&r.projectId!==excludeProject).slice(-4)){
  if(knowsDeath(p,r.candidateId))continue;
  counts.set(r.candidateId,(counts.get(r.candidateId)??0)+1);
 }
 const ranked=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
 if((ranked[0]?.[1]??0)<2||ranked[0][1]===(ranked[1]?.[1]??0))return;
 return {candidateId:ranked[0][0],choices:ranked[0][1]};
}
/** Continuity of one's own choice, separate from the existing score for witnessed outcomes. */
export function alignmentWeight(w:World,p:Person,townshipId:number,projectId:number,candidateId:number):number{
 return alignment(w,p,townshipId,projectId)?.candidateId===candidateId?0.08:0;
}
export function factionHistory(w:World,townshipId:number):string[]{
 if(!hasPoliticalAlignment(w))return [];
 const households=new Map(w.households.map(h=>[h.id,h.townshipId]));
 const members=w.persons.filter(p=>p.alive&&households.get(p.hhId)===townshipId),byId=new Map(members.map(p=>[p.id,p]));
 const groups=new Map<number,Person[]>();
 for(const p of members){const a=alignment(w,p,townshipId);if(!a||!byId.has(a.candidateId))continue;const group=groups.get(a.candidateId)??[];group.push(p);groups.set(a.candidateId,group);}
 const rows:string[]=[];
 for(const [id,ps] of groups){if(ps.length<2)continue;const leader=byId.get(id)!;
 rows.push(`Faction supporting ${leader.name}: ${ps.map(p=>p.name).join(', ')}. Each chose this organiser on at least two of their last four projects; this can make them less willing to switch organisers on later projects.`);}
 return rows.length?rows:['No repeated-support faction currently established.'];
}
export function validateAlignments(w:World):void{
 for(const p of w.persons){const rs=p.civicAlignment;if(!rs)continue;
  if(!runsRulesVersion(w,23)||rs.length>24||new Set(rs.map(r=>r.projectId)).size!==rs.length||rs.some(r=>!Number.isInteger(r.projectId)||!Number.isInteger(r.candidateId)||!Number.isFinite(r.tick)||!w.townships?.some(t=>t.id===r.townshipId)))throw new Error('Invalid political alignment history');
 }
}
