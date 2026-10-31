// Rules 103: a bounded personal ledger of recent decisions and what became of them, for the inspector.
//
// Until now only the last decision and the last result were kept (types.ts DecisionRecord, ResultRecord), and nothing tied a
// decision to the activity it started or to how that activity ended: the inspector could say what was weighed a moment ago,
// never "she chose the tree over the storehouse at tick 4,120, the trip failed at 4,310 because nothing was left, and the
// next time she chose the storehouse". Each entry here is written where the engine already records a decision
// (decision.ts record) with the activity it launched, and closed where that activity ends (activities.ts endActivity). It
// keeps what was known THEN: the chosen option, the three strongest alternatives passed over and the first three options
// set aside with the reasons given at the time. Nothing is re-scored against the present world. The ledger is personal
// state saved with the person and bounded to DECISION_LEDGER_CAP entries; what falls off the end is counted, not hidden.
// Nothing in the simulation reads it, so it is not part of the state fingerprint, exactly like the last decision and the log.
import {runsRulesVersion} from './rulesversion';
import type {Ctx,Option} from './optutil';
import type {Activity,Person,World} from './types';
export interface DecisionEntry {
 tick:number;trigger:string;key:string;chosen:string;kind:string;targetId:number;forPlan:number;activityId:number;
 passedOver:string[];setAside:{label:string;reason:string}[];
 outcome?:'success'|'failed'|'interrupted'|'partial';detail?:string;endedAt?:number;
}
export const DECISION_LEDGER_CAP=8;
let enabled=true;
export const decisionLedgerOn=()=>enabled;
export const setDecisionLedger=(on:boolean):void=>{enabled=on;};
/** Whether people in this world carry the ledger fields at all (save shape); independent of the lab switch. */
export const carriesDecisionLedger=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,103);
export const hasDecisionLedger=(w:World)=>enabled&&carriesDecisionLedger(w);
const text=(s:string,n=120)=>s.length>n?s.slice(0,n-1)+'…':s;
/** Decision-time only: one entry per recorded decision, oldest dropped and counted beyond the cap. */
export function ledgerDecision(w:World,p:Person,ctx:Ctx,ranked:Option[],chosen:Option|null,trigger:string,act:Activity|null):void{
 if(!hasDecisionLedger(w))return;
 const entry:DecisionEntry={tick:w.tick,trigger:text(trigger,40),key:chosen?text(chosen.key,80):'',chosen:chosen?text(chosen.label):'',kind:chosen?.kind??'',targetId:chosen?.targetId??0,forPlan:act?.data.forPlan as number??0,activityId:act?.id??0,
  passedOver:ranked.filter(o=>o!==chosen).slice(0,3).map(o=>text(o.label,80)),setAside:ctx.blocked.slice(0,3).map(o=>({label:text(o.label,80),reason:text(o.blocked??'',120)}))};
 const list=p.decisions??=[];p.decisionsDropped??=0;list.push(entry);
 while(list.length>DECISION_LEDGER_CAP){list.shift();p.decisionsDropped=(p.decisionsDropped??0)+1;}
}
/** Activity-end only: the entry that launched this activity records how it ended. */
export function closeDecision(w:World,p:Person,a:Activity,outcome:DecisionEntry['outcome'],detail:string):void{
 if(!hasDecisionLedger(w)||!p.decisions)return;
 for(let i=p.decisions.length-1;i>=0;i--){const e=p.decisions[i];if(e.activityId===a.id){e.outcome=outcome;e.detail=text(detail);e.endedAt=w.tick;return;}}
}
/** Load: every person of a world that carries the ledger has the fields; nobody else does. */
export function normaliseDecisionLedger(w:World):void{
 for(const p of w.persons){
  if(carriesDecisionLedger(w)){if(!Array.isArray(p.decisions))p.decisions=[];if(!Number.isSafeInteger(p.decisionsDropped))p.decisionsDropped=0;}
 }
}
export function validateDecisionLedger(w:World):void{
 const allowed=carriesDecisionLedger(w),time=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=w.tick;
 for(const p of w.persons){
  if(p.decisions===undefined&&p.decisionsDropped===undefined)continue;
  if(!allowed||!Array.isArray(p.decisions)||p.decisions.length>DECISION_LEDGER_CAP||!Number.isSafeInteger(p.decisionsDropped)||(p.decisionsDropped as number)<0)throw new Error('Invalid decision ledger');
  let last=-1;
  for(const e of p.decisions){
   if(!e||!time(e.tick)||e.tick<last||typeof e.trigger!=='string'||typeof e.key!=='string'||typeof e.chosen!=='string'||typeof e.kind!=='string'||!Number.isSafeInteger(e.targetId)||!Number.isSafeInteger(e.forPlan)||!Number.isSafeInteger(e.activityId)||!Array.isArray(e.passedOver)||e.passedOver.length>3||!Array.isArray(e.setAside)||e.setAside.length>3)throw new Error('Invalid decision entry');
   if(e.outcome!==undefined&&(!['success','failed','interrupted','partial'].includes(e.outcome)||!time(e.endedAt)||(e.endedAt as number)<e.tick||typeof e.detail!=='string'))throw new Error('Invalid decision outcome');
   last=e.tick;
  }
 }
}
