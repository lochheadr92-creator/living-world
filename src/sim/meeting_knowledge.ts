// Personally heard appointments belong to the bounded meal, not to shared execution truth.
import {runsRulesVersion} from './rulesversion';
import {completionContact} from './promise_knowledge';
import {knowsDeath} from './death_knowledge';
import {relOf} from './relations';
import {addLog} from './events';
import {DAY} from './constants';
import type {Meal,Person,World} from './types';
export interface MeetingEnd {tick:number;source:'own choice'|'local experience'|'host statement'|'own timeout'|'known death';reason:string;from?:number;conversationId?:number}
export interface MeetingExperience {mealId:number;placeId:number;agreedAt:number;tick:number;source:MeetingEnd['source'];outcome:'ate'|'missed'|'cancelled';reason:string;confidence:'experienced'|'reported'|'cause unknown'}
export interface HeardMeeting {
 hostName:string;placeId:number;placeName:string;x:number;y:number;at:number;heardAt:number;from:number;conversationId?:number;
 reply:'hosting'|'pending'|'accepted'|'refused';invited:number[];accepted:number[];
 arrivedAt?:number;ateAt?:number;sawTable?:boolean;ended?:MeetingEnd;
 laterExplanation?:MeetingEnd;
 updates?:Record<number,{heardAt:number;acknowledgedAt?:number;retryAt:number}>;
}
let enabled=true;
export const meetingKnowledgeOn=()=>enabled;
export const setMeetingKnowledge=(on:boolean):void=>{enabled=on;};
export const hasMeetingKnowledge=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,91);
export const atMeeting=(p:Person,k:Pick<HeardMeeting,'x'|'y'>)=>!p.indoors&&Math.hypot(p.x-k.x,p.y-k.y)<=4;
export function hearInvitation(w:World,m:Meal,a:Person,b:Person,conversationId?:number):void{
 if(!hasMeetingKnowledge(w))return;
 const records=m.heard??={};
 const base={hostName:a.name,placeId:m.placeId,placeName:m.placeName,x:m.x,y:m.y,at:m.at,heardAt:w.tick,from:a.id,...(conversationId?{conversationId}:{})};
 records[a.id]??={...base,reply:'hosting',invited:[],accepted:[]};
 if(!records[a.id].invited.includes(b.id))records[a.id].invited.push(b.id);
 records[b.id]??={...base,reply:'pending',invited:[],accepted:[]};
}
export function hearReply(w:World,m:Meal,a:Person,b:Person,why:string):void{
 if(!hasMeetingKnowledge(w))return;
 const own=m.heard?.[a.id],guest=m.heard?.[b.id];if(!own||!guest)return;
 guest.reply=why?'refused':'accepted';
 if(why)guest.ended={tick:w.tick,source:'own choice',reason:why};
 else if(!own.accepted.includes(b.id))own.accepted.push(b.id);
}
/** A detached view: it contains only this person's heard arrangement and own experience. */
export function personalMeal(m:Meal,p:Person):Meal|null{
 const k=m.heard?.[p.id];if(!k||k.reply==='pending'||k.reply==='refused')return null;
 return {...m,placeId:k.placeId,placeName:k.placeName,x:k.x,y:k.y,at:k.at,invited:[...k.invited],accepted:[...k.accepted],
  arrived:k.arrivedAt===undefined?[]:[p.id],ate:k.ateAt===undefined?[]:[p.id],missed:{},table:{},servings:0,reserved:k.accepted.length,
  status:k.ended?(k.ateAt===undefined?'cancelled':'done'):'inviting',end:k.ended?.reason??''};
}
export function endMeetingKnowledge(w:World,m:Meal,p:Person,end:Omit<MeetingEnd,'tick'>):void{
 const k=m.heard?.[p.id];if(!k||k.ended)return;
 k.ended={tick:w.tick,...end};p.nextThink=w.tick;
 const reason=end.reason.slice(0,240);addLog(w,p,'social',`Meal #${m.id} at ${k.placeName}: ${reason}.`);
 const others=p.id===m.host?k.accepted:[m.host];
 for(const id of others){const r=relOf(p,id);if(r.meeting?.mealId===m.id)continue;
  r.meeting={mealId:m.id,placeId:k.placeId,agreedAt:k.at,tick:w.tick,source:end.source,outcome:k.ateAt!==undefined?'ate':end.source==='own timeout'?'missed':'cancelled',reason,
   confidence:end.source==='host statement'?'reported':end.source==='own timeout'?'cause unknown':'experienced'};
  // Attendance experience does not impose a trust penalty or claim ability/bad faith.
 }
}
/** Called by simulation upkeep, never from an observer or option generator. */
export function updateMeetingKnowledge(w:World,m:Meal):string|null{
 if(!hasMeetingKnowledge(w))return null;
 let cancellation:string|null=null;
 for(const [id,k] of Object.entries(m.heard??{})){
  const p=w.byId.get(Number(id));if(!p||p.ent!=='person'||!p.alive||k.ended||k.reply==='refused')continue;
  if(k.reply==='pending'){if(w.tick>k.at)k.ended={tick:w.tick,source:'own timeout',reason:'The invitation time passed without my acceptance'};continue;}
  if(p.id!==m.host&&knowsDeath(p,m.host)){endMeetingKnowledge(w,m,p,{source:'known death',reason:'I learned that the host died'});continue;}
  if(atMeeting(p,k)&&k.sawTable&&(m.status==='done'||m.status==='cancelled')){endMeetingKnowledge(w,m,p,{source:'local experience',reason:k.ateAt!==undefined?'I ate at the shared table':'The table I saw is no longer serving; I do not know every cause'});continue;}
  if(p.id===m.host&&!k.accepted.length&&k.invited.length&&w.tick>=k.at-160){endMeetingKnowledge(w,m,p,{source:'own choice',reason:'None of the people I invited accepted'});cancellation='nobody accepted the invitation';}
  if(w.tick>k.at+(p.id===m.host?1100:500))endMeetingKnowledge(w,m,p,{source:'own timeout',reason:k.ateAt!==undefined?'I ate at the meal':'My agreed meeting window passed; the cause is unknown'});
 }
 return cancellation;
}
export function canForgetMeeting(w:World,m:Meal):boolean{
 return !hasMeetingKnowledge(w)||Object.entries(m.heard??{}).every(([id,k])=>k.ended||k.reply==='refused'||!w.persons.some(p=>p.id===Number(id)&&p.alive));
}
export function pendingMeetingUpdates(w:World,p:Person):{meal:Meal;guest:number}[]{
 if(!hasMeetingKnowledge(w))return [];
 const out:{meal:Meal;guest:number}[]=[];
 for(const m of w.meals){const k=m.heard?.[p.id];if(m.host!==p.id||!k?.ended||k.ateAt!==undefined||w.tick-k.ended.tick>2*DAY)continue;
  for(const id of k.accepted){const update=k.updates?.[id];if(!knowsDeath(p,id)&&update?.acknowledgedAt===undefined&&(update?.retryAt??0)<=w.tick)out.push({meal:m,guest:id});}
 }
 return out;
}
export function receiveMeetingCancellation(w:World,a:Person,b:Person,id:number,conversationId:number):string|null{
 if(!hasMeetingKnowledge(w)||!completionContact(w,a,b))return null;
 const m=w.meals.find(m=>m.id===id),k=m?.heard?.[a.id],guest=m?.heard?.[b.id];
 if(!m||m.host!==a.id||!k?.ended||!k.accepted.includes(b.id)||!guest)return null;
 const previous=k.updates?.[b.id];if(previous?.acknowledgedAt!==undefined)return `I already told you why our meal ended: ${k.ended.reason}.`;
 (k.updates??={})[b.id]={heardAt:previous?.heardAt??w.tick,retryAt:w.tick+400};
 const report={source:'host statement' as const,reason:`${a.name} said: ${k.ended.reason}`.slice(0,240),from:a.id,conversationId};
 if(guest.ended){
  guest.laterExplanation??={tick:w.tick,...report};
  const experience=b.relations[a.id]?.meeting;
  if(experience?.mealId===m.id&&experience.confidence==='cause unknown'){experience.source='host statement';experience.confidence='reported';experience.reason=report.reason;experience.tick=w.tick;}
 }else endMeetingKnowledge(w,m,b,report);
 return `I cannot keep our meal arrangement: ${k.ended.reason}.`;
}
export function acknowledgeMeetingCancellation(w:World,a:Person,b:Person,id:number):boolean{
 if(!hasMeetingKnowledge(w)||!completionContact(w,a,b))return false;
 const m=w.meals.find(m=>m.id===id),update=m?.heard?.[a.id]?.updates?.[b.id];if(!m||m.host!==a.id||!update)return false;
 if(update.acknowledgedAt===undefined){update.acknowledgedAt=w.tick;addLog(w,a,'social',`${b.name} acknowledged the cancellation of meal #${id}.`);}return true;
}
export function describeHeardMeeting(k:HeardMeeting):string{
 return `Heard from person #${k.from} at tick ${k.heardAt}${k.conversationId?`, conversation #${k.conversationId}`:', conversation identity not recorded'}; agreed tick ${k.at} at ${k.placeName}. ${k.ended?`${k.ended.source}, tick ${k.ended.tick}: ${k.ended.reason}.`:'No ending has been learned.'}${k.laterExplanation?` Later reported explanation at tick ${k.laterExplanation.tick}: ${k.laterExplanation.reason}.`:''}`;
}
export function validateMeetingKnowledge(w:World):void{
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,91),int=(n:unknown,min=0,max=w.tick)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 for(const m of w.meals){if(m.heard===undefined)continue;
  if(!allowed||!m.heard||Object.keys(m.heard).length>5)throw new Error('Invalid heard meeting count');
  for(const [id,k] of Object.entries(m.heard)){
   if(!int(Number(id),1,Number.MAX_SAFE_INTEGER)||!k||k.from!==m.host||!int(k.heardAt,m.created)||!int(k.at,m.created,Number.MAX_SAFE_INTEGER)||!int(k.placeId,1,Number.MAX_SAFE_INTEGER)||![k.x,k.y].every(Number.isFinite)||typeof k.placeName!=='string'||typeof k.hostName!=='string'||!['hosting','pending','accepted','refused'].includes(k.reply)||!Array.isArray(k.invited)||!Array.isArray(k.accepted)||k.invited.length>4||k.accepted.length>4||k.accepted.some(id=>!k.invited.includes(id))||k.conversationId!==undefined&&!int(k.conversationId,1,Number.MAX_SAFE_INTEGER))throw new Error('Invalid heard meeting');
   for(const end of [k.ended,k.laterExplanation])if(end&&(!int(end.tick,k.heardAt)||!['own choice','local experience','host statement','own timeout','known death'].includes(end.source)||typeof end.reason!=='string'||end.reason.length>300||end.source==='host statement'&&(end.from!==m.host||!int(end.conversationId,1,Number.MAX_SAFE_INTEGER))))throw new Error('Invalid meeting ending');
   if(k.laterExplanation&&(!k.ended||k.laterExplanation.source!=='host statement'||k.laterExplanation.tick<k.ended.tick))throw new Error('Invalid later meeting explanation');
   if(k.at!==m.at||k.at>m.created+760||k.placeId!==m.placeId||Number(id)===m.host&&k.reply!=='hosting'||Number(id)!==m.host&&(!m.invited.includes(Number(id))||k.reply==='hosting'||k.invited.length||k.accepted.length)||new Set(k.invited).size!==k.invited.length||new Set(k.accepted).size!==k.accepted.length||k.invited.some(id=>!int(id,1,Number.MAX_SAFE_INTEGER))||k.sawTable!==undefined&&typeof k.sawTable!=='boolean')throw new Error('Invalid personal meeting membership');
   for(const n of [k.arrivedAt,k.ateAt])if(n!==undefined&&!int(n,k.heardAt))throw new Error('Invalid meeting experience time');
   if(k.updates)for(const [guest,u] of Object.entries(k.updates))if(Number(id)!==m.host||!k.accepted.includes(Number(guest))||!int(u.heardAt,k.heardAt)||!int(u.retryAt,u.heardAt,w.tick+400)||u.acknowledgedAt!==undefined&&!int(u.acknowledgedAt,u.heardAt))throw new Error('Invalid meeting update');
  }
  if(m.replacesMealId!==undefined&&(!int(m.replacesMealId,1,m.id-1)||m.replacementId!==undefined)||m.replacementId!==undefined&&!int(m.replacementId,m.id+1,Number.MAX_SAFE_INTEGER))throw new Error('Invalid bounded meal replacement');
 }
 for(const p of w.persons)for(const [id,r] of Object.entries(p.relations)){const e=r.meeting;if(!e)continue;
  if(!allowed||!int(Number(id),1,Number.MAX_SAFE_INTEGER)||!int(e.mealId,1,Number.MAX_SAFE_INTEGER)||!int(e.placeId,1,Number.MAX_SAFE_INTEGER)||!int(e.agreedAt,0,Number.MAX_SAFE_INTEGER)||!int(e.tick)||!['own choice','local experience','host statement','own timeout','known death'].includes(e.source)||!['ate','missed','cancelled'].includes(e.outcome)||!['experienced','reported','cause unknown'].includes(e.confidence)||typeof e.reason!=='string'||e.reason.length>240)throw new Error('Invalid retained meeting experience');
 }
 if(!allowed&&(w.conversations.some(c=>c.purpose==='cancel_meeting')||w.persons.some(p=>[p.activity,p.suspended].some(a=>a?.data.purpose==='cancel_meeting'))))throw new Error('Unsupported meeting update');
}
