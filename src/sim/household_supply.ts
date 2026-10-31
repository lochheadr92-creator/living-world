// Rules 100: what a household member actually said they are supplying leaves that reserve to them and shapes complementary work.
//
// The channel already exists (rules 92, continuity_knowledge.ts): a member tells another, in a real conversation, which
// undertaking they are working on, and the listener keeps a dated, personally heard record. Nothing read that record when the
// listener decided what to take on, so two members of one household could each set out to fill the same store (the rules-2
// test says so in as many words). Here the listener's own record, and nothing of the speaker's live state, is consulted:
// a season reserve a member said they are putting by is left to them while the account is fresh (one day), unless the
// listener can see hardship for themselves; a home site's material a member said they are fetching makes the listener
// pick a different missing material when there is one. A heard account is information, not a promise: it assigns nothing,
// and it lapses on its own when nobody repeats it, when the teller is known to be dead, or when the work was handed over.
import {DAY} from './constants';
import {knowsDeath} from './death_knowledge';
import {addLog} from './events';
import {personalHandovers} from './handover_state';
import {runsRulesVersion} from './rulesversion';
import type {HeardUndertaking} from './continuity_knowledge';
import type {ItemKind,Person,World} from './types';
let enabled=true;
export const householdSupplyOn=()=>enabled;
export const setHouseholdSupply=(on:boolean):void=>{enabled=on;};
export const hasHouseholdSupply=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,100);
/** Pure. The freshest personally heard account of a living household member supplying this same thing, or nothing. */
export function heardSupply(w:World,p:Person,kind:HeardUndertaking['kind'],aboutId:number):HeardUndertaking|undefined{
 if(!hasHouseholdSupply(w)||!p.hhId)return;
 let best:HeardUndertaking|undefined;
 for(const r of Object.values(p.relations))for(const k of r.workHeard??[]){
  if(k.kind!==kind||k.aboutId!==aboutId||k.householdId!==p.hhId||k.from===p.id||w.tick-k.heardAt>DAY||knowsDeath(p,k.from))continue;
  if(personalHandovers(p).some(h=>h.work.planId===k.planId&&h.to===p.id&&(h.state==='accepted'||h.state==='proposed')))continue;
  if(!best||k.heardAt>best.heardAt)best=k;
 }
 return best;
}
/** Decision-time only. True when the season reserve for this store is left to a member who said they are putting it by. */
export function deferReserve(w:World,p:Person,aboutId:number):boolean{
 const k=heardSupply(w,p,'stock',aboutId);if(!k)return false;
 if(k.deferredAt===undefined){k.deferredAt=w.tick;addLog(w,p,'work',`${k.name} said they are putting food by for the household (heard at tick ${k.heardAt}); I leave that reserve to them for now. I have promised nothing, and I will see to it myself if the store runs low or the account goes stale.`);}
 return true;
}
/** Pure. The first missing material no member said they are fetching for this site; the site's own first when every one was. */
export function complementaryKind(w:World,p:Person,siteId:number,kinds:ItemKind[]):ItemKind{
 const k=heardSupply(w,p,'shelter',siteId);
 if(!k||!k.item)return kinds[0];
 return kinds.find(x=>x!==k.item)??kinds[0];
}
