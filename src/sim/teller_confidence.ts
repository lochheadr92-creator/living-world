// Rules 154 (P1.2): acting on what a person has found out about a teller. A told food place weighs less when this person
// has checked that teller's first-hand accounts (rules 107, Relation.accounts) and found some not borne out. The same
// doubt makes them slower to pass that teller's places on. Old hearsay as such is not discounted: measured on three
// ordinary seeds, told places were wasted at about the first-hand rate (owner decision, 4 November 2026).
// Reads only the listener's own belief and relation; never the place's real contents or the teller's honesty.
import {runsRulesVersion} from './rulesversion';
import type {Belief,Person,World} from './types';

let enabled=true;
export const tellerConfidenceOn=():boolean=>enabled;
export const setTellerConfidence=(on:boolean):void=>{enabled=on;};
export const hasTellerConfidence=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,154);

const DOUBT_COST=10;

/** Share of this teller's checked accounts that were not borne out (0 when never checked or always right). */
export function tellerDoubt(p:Person,tellerId:number):number{
 const a=p.relations[tellerId]?.accounts;
 return a&&a.checked>0&&a.checked>a.borneOut?(a.checked-a.borneOut)/a.checked:0;
}

/** Scorer parts for travelling on hearsay; empty for first-hand places or before rules 154. */
export function hearsayTripCosts(w:World,p:Person,b:Belief):[string,number][]{
 if(!hasTellerConfidence(w)||b.src!=='told'||!b.from)return [];
 const out:[string,number][]=[],doubt=tellerDoubt(p,b.from);
 if(doubt>0){
  const teller=w.byId.get(b.from),name=teller?.ent==='person'?teller.name:'the teller',a=p.relations[b.from]!.accounts!;
  out.push([`won't go on ${name}'s word alone (${a.borneOut} of ${a.checked} accounts borne out)`,-DOUBT_COST*doubt]);
 }
 return out;
}

/** How much less newsworthy a teller's place is to someone who has caught that teller out. */
export function hearsayNewsCost(w:World,S:Person,b:Belief):number{
 return hasTellerConfidence(w)&&b.src==='told'&&b.from?3*tellerDoubt(S,b.from):0;
}
