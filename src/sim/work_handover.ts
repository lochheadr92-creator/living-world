// Actual informed responsibility transfer. Plans, work, tools and goods keep their existing owners.
import {hasWorkHandover,personalHandovers,type WorkHandover} from './handover_state';
import {shareableUndertaking,hearUndertaking} from './continuity_knowledge';
import {completionContact} from './promise_knowledge';
import {laidUp} from './responsibilities';
import {currentRelocation} from './relocation';
import {householdById} from './households';
import {relOf,trustOf} from './relations';
import {knowsDeath} from './death_knowledge';
import {makeCtx} from './optutil';
import {acceptCommunicatedPlan} from './intent';
import {releaseClaims} from './economy';
import {addLog} from './events';
import type {Intention,Person,World} from './types';
export type HandoverMode='offer'|'return'|'report';
function cause(w:World,p:Person,to:number):WorkHandover['cause']|null{
 if(laidUp(w,p))return 'incapacity';
 const r=currentRelocation(householdById(w,p.hhId));
 // The organiser personally heard the departure responses. Other travellers do not
 // learn another member's refusal by inspecting the engine's shared agreement.
 return r&&r.organiserId===p.id&&r.phase==='packing'&&r.members.some(m=>m.id===p.id&&m.response==='accepted')&&r.members.some(m=>m.id===to&&(m.response==='refused'||m.response==='stays'))?'departure':null;
}
function room(p:Person,other:number):boolean{return (p.relations[other]?.handovers??[]).filter(h=>h.state==='accepted'||h.state==='proposed').length<2;}
function remember(p:Person,other:number,h:WorkHandover):void{
 const r=relOf(p,other),list=r.handovers??=[];
 while(list.length>=2){const at=list.findIndex(x=>x.state!=='accepted'&&x.state!=='proposed');if(at<0)throw new Error('No handover history capacity');list.splice(at,1);}
 list.push(structuredClone(h));
}
export function handoverOffer(w:World,p:Person,to:number):{plan:Intention;cause:WorkHandover['cause']}|null{
 if(!hasWorkHandover(w)||!room(p,to)||(p.cooldowns['handover:'+to]??0)>w.tick)return null;
 const why=cause(w,p,to);if(!why)return null;
 const plan=p.intentions.find(i=>shareableUndertaking(i)&&!i.handoverId&&!personalHandovers(p).some(h=>h.work.planId===i.id&&(h.state==='accepted'||h.state==='proposed')));
 return plan?{plan,cause:why}:null;
}
export function handoverFollowup(w:World,p:Person,other:number):{id:number;mode:HandoverMode}|null{
 if(!hasWorkHandover(w)||(p.cooldowns['handover:'+other]??0)>w.tick)return null;
 const hs=p.relations[other]?.handovers??[];
 const report=hs.find(h=>h.to===p.id&&(h.state==='finished'||h.state==='failed')&&h.reportAt===undefined);
 if(report)return {id:report.id,mode:'report'};
 const back=hs.find(h=>h.from===p.id&&h.state==='accepted'&&h.cause==='incapacity');
 return back&&!laidUp(w,p)?{id:back.id,mode:'return'}:null;
}
function pair(a:Person,b:Person,id:number){return [a.relations[b.id]?.handovers?.find(h=>h.id===id),b.relations[a.id]?.handovers?.find(h=>h.id===id)] as const;}
function stopPlan(w:World,p:Person,i:Intention,reason:string):void{
 i.status='dropped';i.ended=w.tick;i.reason=reason;i.wants={};i.step='';i.stepKind='none';i.stepKey=null;i.stepItem=null;i.stepTarget=0;
 // A conversation already suspended the listener's activity and released its claims.
 // Only work explicitly attached to this plan is discarded; unrelated obligations remain.
 if(p.suspended?.data.forPlan===i.id){releaseClaims(w,p.suspended.claims);p.suspended=null;}
 addLog(w,p,'work',reason);
}
export function proposeHandover(w:World,a:Person,b:Person,planId:number,conversationId:number,mode:HandoverMode,id=0):string|null{
 if(!hasWorkHandover(w)||!completionContact(w,a,b))return null;
 a.cooldowns['handover:'+b.id]=w.tick+400;
 if(mode!=='offer'){
  const [own,other]=pair(a,b,id);if(!own||!other)return null;
  if(mode==='return')return own.from===a.id&&own.state==='accepted'&&own.cause==='incapacity'&&!laidUp(w,a)?'I have recovered enough to take my undertaking back. Can we agree who continues it?':null;
  return own.to===a.id&&(own.state==='finished'||own.state==='failed')?`My work on your undertaking has ${own.state==='finished'?'finished':'ended'}: ${own.reason}`:null;
 }
 const why=cause(w,a,b.id),i=a.intentions.find(i=>i.id===planId&&shareableUndertaking(i)&&!i.handoverId);
 if(!why||!i||!a.hhId||a.hhId!==b.hhId||!room(a,b.id)||!room(b,a.id)||personalHandovers(a).some(h=>h.work.planId===planId&&(h.state==='proposed'||h.state==='accepted')))return null;
 if(!hearUndertaking(w,a,b,planId,conversationId))return null;
 const work=b.relations[a.id].workHeard!.find(k=>k.planId===planId)!;
 const h:WorkHandover={id:conversationId,from:a.id,to:b.id,cause:why,work:structuredClone(work),proposedAt:w.tick,state:'proposed',reason:'heard proposal; no acceptance yet'};
 remember(a,b.id,h);remember(b,a.id,h);
 return `I ${why==='incapacity'?'am laid up':'have agreed to leave'}. Will you take responsibility for my undertaking: ${work.goal}? My goods and other promises stay with me.`;
}
export function answerHandover(w:World,a:Person,b:Person,id:number,mode:HandoverMode,conversationId:number):string|null{
 if(!hasWorkHandover(w)||!completionContact(w,a,b))return null;
 const [own,heard]=pair(a,b,id);if(!own||!heard)return null;
 if(mode==='report'){
  if(own.to!==a.id||!['finished','failed'].includes(own.state))return null;
  heard.state=own.state;heard.reason=own.reason;heard.endedAt=w.tick;heard.reportAt=w.tick;own.reportAt=w.tick;
  addLog(w,b,'work',`${a.name} reported undertaking #${own.work.planId}: ${own.state}; ${own.reason}.`);
  return 'I have heard how your work ended. I will decide what is needed from my own knowledge.';
 }
 if(mode==='return'){
  if(own.from!==a.id||own.state!=='accepted'||own.cause!=='incapacity'||laidUp(w,a))return null;
  const active=b.intentions.find(i=>i.id===heard.helperPlan);
  if(!active||active.status!=='active'){
   const state=active?.status==='done'?'finished':'failed';for(const h of [own,heard]){h.state=state;h.reason=active?.reason??'I no longer retain that active undertaking';h.endedAt=w.tick;h.reportAt=w.tick;}
   return `There is no active undertaking to hand back: ${own.reason}.`;
  }
  const ctx=makeCtx(w,b,false);if(ctx.criticals.length||ctx.dangers.length)return 'I cannot discuss handing it back while dealing with an urgent need.';
  if(!hearUndertaking(w,b,a,active.id,conversationId))return null;
  const known=a.relations[b.id].workHeard!.find(k=>k.planId===active.id)!,result=acceptCommunicatedPlan(makeCtx(w,a,false),known,true);
  if(!result.plan)return `I cannot hand this back yet: ${result.reason}.`;
  stopPlan(w,b,active,`Agreed with ${a.name} to return responsibility after recovery; my own work remains credited to me.`);
  for(const h of [own,heard]){h.state='returned';h.endedAt=w.tick;h.reason='agreed return after recovery';h.reportAt=w.tick;}
  result.plan.goal=`resume after agreed handback: ${result.plan.goal}`;
  return 'We agree: you will continue it now. The goods stay where they are, and the work I did remains mine.';
 }
 if(own.from!==a.id||heard.to!==b.id||own.state!=='proposed'||heard.state!=='proposed')return null;
 const original=a.intentions.find(i=>i.id===own.work.planId&&shareableUndertaking(i));
 const ctx=makeCtx(w,b,false);
 const why=!original?'the original undertaking is no longer active':a.hhId!==b.hhId?'we no longer belong to the same household':!cause(w,a,b.id)?'the stated incapacity or departure no longer applies':laidUp(w,b)?'I am laid up myself':trustOf(b,a.id)<-20?'I do not trust this request':ctx.criticals.length||ctx.dangers.length?'my urgent needs come first':null;
 const result:{plan?:Intention;reason:string}=why?{reason:why}:acceptCommunicatedPlan(ctx,heard.work);
 if(!result.plan){for(const h of [own,heard]){h.state='declined';h.answeredAt=w.tick;h.endedAt=w.tick;h.reason=result.reason;}addLog(w,b,'work',`Declined ${a.name}'s handover: ${result.reason}.`);return `I cannot take it over: ${result.reason}.`;}
 result.plan.handoverId=id;result.plan.goal=`cover ${a.name}'s undertaking: ${result.plan.goal}`;
 stopPlan(w,a,original!,`${b.name} accepted responsibility in conversation #${conversationId}; my goods, skills and promises were not transferred.`);
 for(const h of [own,heard]){h.state='accepted';h.answeredAt=w.tick;h.helperPlan=result.plan.id;h.reason='explicitly accepted in contact';}
 addLog(w,b,'work',`Accepted ${a.name}'s undertaking #${original!.id}; new personal plan #${result.plan.id}, reported earlier work ${heard.work.worked}.`);
 return 'I accept responsibility. I will use my own knowledge and collect what I actually need.';
}
/** Only one's own execution or personally learned death closes one's own record. No remote plan polling. */
export function reviewHandovers(w:World,p:Person):void{
 if(!hasWorkHandover(w))return;
 for(const h of personalHandovers(p)){
  if(h.state==='proposed'&&w.tick-h.proposedAt>400){h.state='declined';h.endedAt=w.tick;h.reason='the proposal received no timely answer';}
  if(h.state!=='accepted')continue;
  if(h.to===p.id){const i=p.intentions.find(i=>i.id===h.helperPlan);if(!i||i.status!=='active'){h.state=i?.status==='done'?'finished':'failed';h.reason=i?.reason??'the personal undertaking is no longer retained';h.endedAt=w.tick;}}
  else if(knowsDeath(p,h.to)){h.state='failed';h.reason='I learned that the person covering my undertaking died';h.endedAt=w.tick;}
 }
}
export function validateWorkHandovers(w:World):void{
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,94),id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0,time=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=w.tick;
 for(const p of w.persons){for(const [other,r] of Object.entries(p.relations))if(r.handovers!==undefined){
  if(!allowed||!Array.isArray(r.handovers)||r.handovers.length>2||new Set(r.handovers.map(h=>h.id)).size!==r.handovers.length)throw new Error('Invalid work handover history');
  for(const h of r.handovers){
   if(!h||!id(h.id)||!id(h.from)||!id(h.to)||h.from===h.to||![h.from,h.to].includes(p.id)||![h.from,h.to].includes(Number(other))||!['incapacity','departure'].includes(h.cause)||!['proposed','accepted','declined','returned','finished','failed'].includes(h.state)||!time(h.proposedAt)||!h.work||h.work.from!==h.from||h.work.conversationId!==h.id||!id(h.work.planId)||typeof h.work.goal!=='string'||h.work.goal.length>240||!Number.isFinite(h.work.worked)||h.work.worked<0||typeof h.reason!=='string'||h.reason.length>400||h.answeredAt!==undefined&&(!time(h.answeredAt)||h.answeredAt<h.proposedAt)||h.endedAt!==undefined&&(!time(h.endedAt)||h.endedAt<(h.answeredAt??h.proposedAt))||h.reportAt!==undefined&&(!time(h.reportAt)||h.reportAt<h.proposedAt)||h.helperPlan!==undefined&&!id(h.helperPlan)||h.state==='accepted'&&(h.answeredAt===undefined||!id(h.helperPlan)))throw new Error('Invalid work handover');
   const k=h.work;if(!id(k.householdId)||k.heardAt!==h.proposedAt||!['shelter','tool','stock','batch'].includes(k.kind)||!Number.isSafeInteger(k.aboutId)||k.aboutId<0||typeof k.makes!=='string'||typeof k.name!=='string'||k.forSite!==undefined&&!id(k.forSite)||k.recipe!==undefined&&typeof k.recipe!=='string')throw new Error('Invalid communicated handover work');
  }
 }
 // Pre-intention saves are normalised later by the existing loader.
 for(const i of p.intentions??[])if(i.handoverId!==undefined&&(!allowed||!id(i.handoverId)))throw new Error('Invalid handed-over plan');
 }
 if(!allowed&&(w.conversations.some(c=>c.purpose==='handover_work')||w.persons.some(p=>[p.activity,p.suspended].some(a=>a?.data.purpose==='handover_work'))))throw new Error('Unsupported work handover');
}
import {runsRulesVersion} from './rulesversion';
