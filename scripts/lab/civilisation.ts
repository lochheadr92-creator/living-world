// Pure end-of-window observations. Retained records are NOT lifetime event totals.
import type {World} from '../../src/sim/types';
import {DAY} from '../../src/sim/constants';
import {alignment} from '../../src/sim/political_alignment';
export const CIVILISATION_METRICS=[
 'retainedSharedCompleted','retainedSharedFailed','retainedRelocationsSettled','retainedRelocationsFailed',
 'retainedExchangePairs','retainedExchangeReceipts','alignedResidentsAtEnd','factionsAtEnd',
 'charcoalHoldersAtEnd','taughtCharcoalAtEnd','supperHoldersAtEnd','familySupperAtEnd','secondTransmissionAtEnd','newbornSupperAtEnd',
 'townsWithRepeatedProduction','townProductionDistance',
] as const;
export type CivilisationMetric=typeof CIVILISATION_METRICS[number];
export function civilisationOutcome(w:World,from:number):Record<CivilisationMetric,number>{
 const projects=(w.civicProjects??[]).filter(q=>(q.ended??-1)>=from),relocations=w.households.flatMap(h=>h.relocations??[]).filter(r=>(r.ended??-1)>=from);
 const receipts=(w.exchangeReceipts??[]).filter(r=>r.tick>=from),pairs=new Map<string,number>();
 for(const r of receipts){const key=[r.fromTown,r.toTown].sort((a,b)=>a-b).join(':');pairs.set(key,(pairs.get(key)??0)+1);}
 const households=new Map(w.households.map(h=>[h.id,h.townshipId])),members=new Map(w.persons.map(p=>[p.id,p]));
 const groups=new Map<string,number>();let aligned=0;
 for(const p of w.persons){const town=households.get(p.hhId);if(!town)continue;const a=alignment(w,p,town),leader=a&&members.get(a.candidateId);if(!a||!leader||households.get(leader.hhId)!==town)continue;aligned++;const key=town+':'+a.candidateId;groups.set(key,(groups.get(key)??0)+1);}
 const production=(w.economicObservations?.production??[]).filter(r=>r.day>Math.floor(w.tick/DAY)-8&&r.day>=Math.ceil(from/DAY));
 const towns=new Map<number,{days:Set<number>;items:Map<string,number>}>();
 for(const r of production){const row=towns.get(r.townshipId)??{days:new Set<number>(),items:new Map<string,number>()};row.days.add(r.day);for(const [item,n] of Object.entries(r.items))row.items.set(item,(row.items.get(item)??0)+n!);towns.set(r.townshipId,row);}
 const repeated=[...towns.values()].filter(r=>r.days.size>=3),mixes=repeated.map(r=>{const total=[...r.items.values()].reduce((a,b)=>a+b,0);return new Map([...r.items].map(([k,n])=>[k,n/Math.max(1,total)]));});
 let distance=0,nPairs=0;for(let i=0;i<mixes.length;i++)for(let j=i+1;j<mixes.length;j++){let d=0;for(const k of new Set([...mixes[i].keys(),...mixes[j].keys()]))d+=Math.abs((mixes[i].get(k)??0)-(mixes[j].get(k)??0));distance+=d/2;nPairs++;}
 const holders=w.persons.filter(p=>p.sharedSupper?.learned),family=holders.filter(p=>p.sharedSupper!.learned!.source==='family');
 return {
  retainedSharedCompleted:projects.filter(q=>q.status==='completed').length,retainedSharedFailed:projects.filter(q=>q.status==='failed').length,
  retainedRelocationsSettled:relocations.filter(r=>r.phase==='settled').length,retainedRelocationsFailed:relocations.filter(r=>r.phase==='failed').length,
  retainedExchangePairs:[...pairs.values()].filter(n=>n>=2).length,retainedExchangeReceipts:receipts.length,
  alignedResidentsAtEnd:aligned,factionsAtEnd:[...groups.values()].filter(n=>n>=2).length,
  charcoalHoldersAtEnd:w.persons.filter(p=>p.techniques?.charcoal).length,taughtCharcoalAtEnd:w.persons.filter(p=>p.techniques?.charcoal?.source==='taught').length,
  supperHoldersAtEnd:holders.length,familySupperAtEnd:family.length,secondTransmissionAtEnd:family.filter(p=>p.sharedSupper!.learned!.generation>=2).length,newbornSupperAtEnd:family.filter(p=>p.birthTick>=from).length,
  townsWithRepeatedProduction:repeated.length,townProductionDistance:nPairs?distance/nPairs:0,
 };
}
