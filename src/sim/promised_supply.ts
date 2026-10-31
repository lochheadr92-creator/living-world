// Rules 101: what somebody has actually promised to bring counts against the recipient's own fetching, until the spoken time.
//
// Rules 82 lets the asker remember a heard agreement (promise_expectations.ts): who promised what, for which site or
// plan, and the hour it was spoken for. That memory already stopped them asking twice (options_social.ts), but it changed
// nothing about what they fetched: a person promised three wood for their site set off for the tree all the same, the
// promise arrived to a site that no longer needed it, and the trip was wasted. Here the person's OWN remembered, still-live
// promises for a site are subtracted from the material they set out to get for it, with the waiting named among the things
// set aside; a plan to supply their own home site does the same. Nothing of the helper's private progress is read: the
// coverage ends by the asker's own clock (the spoken hour, rules 82), by a hand-over they experience, by a report they hear,
// or by learning that the helper died. Unanswered asks are not coverage: only an actual promise is.
import {expectedStatus,hasPromiseExpectations} from './promise_expectations';
import {runsRulesVersion} from './rulesversion';
import type {ItemKind,Person,World} from './types';
let enabled=true;
export const promisedSupplyOn=()=>enabled;
export const setPromisedSupply=(on:boolean):void=>{enabled=on;};
export const hasPromisedSupply=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,101)&&hasPromiseExpectations(w);
export interface PromisedSupply {amount:number;by:string[];deadline:number}
/** Pure. Live promises this person personally heard, of this material, for this site or plan; nothing of the helper's state. */
export function promisedSupply(w:World,p:Person,item:ItemKind,destId:number):PromisedSupply|null{
 if(!hasPromisedSupply(w)||!destId)return null;
 let amount=0,deadline=0;const by:string[]=[];
 for(const m of p.socialMemory??[]){
  const e=m.expectation;if(!e||e.item!==item||e.destId!==destId&&m.siteId!==destId||expectedStatus(w,p,m).status!=='promised')continue;
  const left=Math.max(0,e.amount-e.received);if(left<=0)continue;
  amount+=left;deadline=Math.max(deadline,e.deadline);if(!by.includes(e.otherName))by.push(e.otherName);
 }
 return amount>0?{amount,by,deadline}:null;
}
export const promisedText=(s:PromisedSupply,item:ItemKind)=>`${s.by.join(' and ')} promised ${s.amount} ${item}, expected by tick ${s.deadline}`;
