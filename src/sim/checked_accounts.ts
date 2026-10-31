// Rules 107: a neighbour's first-hand account of a place, checked in person soon after, is grounds about that neighbour.
//
// Programme row A7 (conflicting reports) asks that teller, age and first-hand against hearsay be preserved, that later
// observation revise a belief, and that disagreement, trust and reconciliation be recorded only on grounds the person has.
// The belief store already keeps the teller (`from`), when they saw it (`seen`), when it was told (`learned`) and how many
// mouths it passed (`hops`), and a fresher personal observation already replaces hearsay (knowledge.ts `learn`). What was
// missing was any record of what became of an account once checked, and any later choice that used it. Here the one
// moment of grounds is the personal observation of a place somebody described: if the teller spoke of what they had seen
// themselves no more than a day before, the listener checks within two days of the telling, and the description was of
// two or more, the listener may say whether the account was borne out (at least half of what the description, regrown by
// the ordinary estimate, led them to expect) or not. A relayed account (two or more mouths) is logged and held against
// nobody. A description that was stale by the teller's own dating, or checked long after, is no grounds: things get picked.
//
// What is kept is a bounded tally on the existing relation (the one memory of a person this engine has): accounts checked,
// accounts borne out, and the last check in full. It is not a probability, not a lie detector and not a measure of skill;
// a bush somebody else stripped the same morning counts against the teller because the listener has no way to know that,
// which is the cost of local knowledge. It changes one later choice, bounded: whom to ask where something can be found,
// among those present, by at most ±4, with the tally as the reason. Trust moves by a bounded step with a dated note.
import {DAY} from './constants';
import {addLog} from './events';
import {SOURCE_NOUN} from './labels';
import {adjustRel,relOf} from './relations';
import {runsRulesVersion} from './rulesversion';
import type {Belief,Person,SourceType,World} from './types';
export interface CheckedAccounts {
 checked:number;
 borneOut:number;
 last:{tick:number;id:number;kind:string;described:number;expected:number;found:number;borneOut:boolean;toldAt:number};
}
/** the tally is halved before it would pass this, so recent checks always weigh more than a long-ago run */
export const ACCOUNT_CAP=12;
let enabled=true;
export const checkedAccountsOn=()=>enabled;
export const setCheckedAccounts=(on:boolean):void=>{enabled=on;};
export const hasCheckedAccounts=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,107);
const nounOf=(kind:string)=>(SOURCE_NOUN as Record<string,string>)[kind]??kind;
const nameOf=(w:World,id:number)=>{const q=w.byId.get(id);return q?.ent==='person'?q.name:'someone';};
/** Pure. Can this told belief be held to its teller? First-hand, fresh when told, of two or more, and being checked soon. */
export function checkableAccount(w:World,old:Belief):boolean{
 return old.src==='told'&&!!old.from&&old.hops===1&&old.amount>=2&&old.learned-old.seen<=DAY&&w.tick-old.learned<=2*DAY;
}
/**
 * Called by knowledge.observe just before a personal observation of a source replaces a told belief of it. `expected` is
 * what the description led the listener to expect now (the ordinary regrowth estimate of the told belief); `found` is
 * what is there. Writes only to the observer: a log line, the tally on their relation with the teller, a trust step.
 */
export function checkAccount(w:World,p:Person,old:Belief,found:number,expected:number):void{
 if(!hasCheckedAccounts(w)||old.src!=='told'||!old.from||old.from===p.id)return;
 const teller=nameOf(w,old.from),noun=nounOf(old.kind),ago=((w.tick-old.learned)/DAY).toFixed(1);
 const state=found<=0?'it was bare':`${Math.floor(found)} there`;
 if(!checkableAccount(w,old)){
  if((old.hops??0)>=2&&old.amount>=2&&found*2<expected)addLog(w,p,'info',`What ${teller} passed on from somebody else about the ${noun} (about ${Math.round(old.amount)}) was not borne out: ${state}. I hold it against nobody.`);
  return;
 }
 const borneOut=found*2>=expected;
 const r=relOf(p,old.from),a:CheckedAccounts=r.accounts??{checked:0,borneOut:0,last:{tick:0,id:0,kind:'',described:0,expected:0,found:0,borneOut:false,toldAt:0}};
 if(a.checked>=ACCOUNT_CAP){a.checked=Math.floor(a.checked/2);a.borneOut=Math.min(a.checked,Math.floor(a.borneOut/2));}
 a.checked++;if(borneOut)a.borneOut++;
 a.last={tick:w.tick,id:old.id,kind:old.kind,described:Math.round(old.amount),expected:Math.round(expected*10)/10,found:Math.floor(found),borneOut,toldAt:old.learned};
 r.accounts=a;
 const verdict=borneOut?`was borne out: ${state}`:`was not borne out: ${state}`;
 addLog(w,p,'info',`${teller}'s account of the ${noun} (about ${Math.round(old.amount)}, told ${ago} days ago from their own sight) ${verdict}. ${a.borneOut} of ${a.checked} of their accounts have been borne out when I checked.`);
 adjustRel(p,old.from,w.tick,{trust:borneOut?1:-3,note:borneOut?`the ${noun} ${teller} described was as described when I got there`:`the ${noun} ${teller} described (about ${Math.round(old.amount)}) ${found<=0?'was bare':`held only ${Math.floor(found)}`} when I got there ${ago} days later`});
}
/** Conversation only (news.ts tellBelief): a newer account that differs much from the listener's own earlier sight is logged as a disagreement they can ground. */
export function noteDisagreement(w:World,S:Person,L:Person,old:Belief,b:Belief):void{
 if(!hasCheckedAccounts(w)||old.src!=='seen'||b.seen<=old.seen)return;
 if(Math.max(old.amount,b.amount)<2||Math.abs(b.amount-old.amount)*2<=Math.max(old.amount,b.amount))return;
 addLog(w,L,'info',`${S.name} says the ${nounOf(b.kind)} holds about ${Math.round(b.amount)}; I remembered about ${Math.round(old.amount)} when I saw it myself at tick ${old.seen}. Theirs is the newer sight, so I go by it until I see for myself.`);
}
/** Bounded preference among people present for whom to ask where something can be found: ±4 at most, with the tally as the reason. */
export function accountsExperience(w:World,p:Person,otherId:number):{bonus:number;reason:string}{
 if(!hasCheckedAccounts(w))return {bonus:0,reason:''};
 const a=p.relations[otherId]?.accounts;if(!a||a.checked<1)return {bonus:0,reason:''};
 const bonus=Math.max(-4,Math.min(4,Math.round((a.borneOut/a.checked-0.5)*8*10)/10));
 return {bonus,reason:`${a.borneOut} of ${a.checked} of their accounts of places ${a.checked===1?'was':'were'} borne out when I checked (last: the ${nounOf(a.last.kind)}, tick ${a.last.tick}); past accounts, not a guarantee of this one`};
}
export function describeAccounts(a:CheckedAccounts):string{
 const l=a.last;
 return `Accounts of places checked: ${a.checked}, borne out ${a.borneOut}. Last: the ${nounOf(l.kind)} #${l.id} described as about ${l.described} (told at tick ${l.toldAt}), ${l.found<=0?'bare':`${l.found} there`} at tick ${l.tick} against about ${l.expected} expected: ${l.borneOut?'borne out':'not borne out'}. Grounds are my own sight only; what others may have taken meanwhile is unknown to me.`;
}
export function validateCheckedAccounts(w:World):void{
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,107),int=(n:unknown,min:number,max:number)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
 for(const p of w.persons)for(const [id,r] of Object.entries(p.relations)){
  const a=r.accounts;if(a===undefined)continue;
  const l=a.last;
  if(!allowed||Number(id)===p.id||!int(a.checked,1,ACCOUNT_CAP)||!int(a.borneOut,0,a.checked)||!l||!int(l.tick,0,w.tick)||!int(l.id,1,Number.MAX_SAFE_INTEGER)||typeof l.kind!=='string'||!int(l.described,2,Number.MAX_SAFE_INTEGER)||typeof l.expected!=='number'||!Number.isFinite(l.expected)||l.expected<0||!int(l.found,0,Number.MAX_SAFE_INTEGER)||typeof l.borneOut!=='boolean'||!int(l.toldAt,0,l.tick))throw new Error('Invalid checked accounts');
 }
}
