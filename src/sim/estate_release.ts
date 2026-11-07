// Rules 163: what a household left behind does not stay locked to a household that no longer exists.
// Origin (the 7 November 2026 adversarial review, item 5; review_evidence/estate-release-20261107): rules 93 stamps a dead person's
// belongings with their household and pile_access.ts admits only that household. dissolveHousehold released a dissolved household's
// buildings, sites and plots but never its parcels, so when the last member died, or the last member (usually a child) was taken into
// another household, the parcel stayed stamped for a household nobody belonged to: nobody could take it and nobody was offered it.
// The rule: when a household dissolves, its estate parcels pass to the household its last member joined (an adopted child, someone who
// moved in with a partner or kin, a relocation that split the household) and become shared property (owner 0, anyone may take them)
// when the last member died. The tools in a parcel change owner with it. Nothing is moved, created or lost: a parcel still has to be
// reached and collected as before, and people learn the new owner when they next see the parcel (knowledge.ts copies the stamp on
// sight). Meal leftovers and tools lent out of a dissolved household are not touched here.
import {addEvent} from './events';
import {runsRulesVersion} from './rulesversion';
import {toolsHeldBy} from './toolreg';
import type {Household,Person,World} from './types';

let enabled=true;
export const estateReleaseOn=():boolean=>enabled;
/** The lab switch: module-level, never saved, never hashed. Off, a rules-163 world keeps its parcels stamped as rules 162 did. */
export const setEstateRelease=(on:boolean):void=>{enabled=on;};
export const hasEstateRelease=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,163);

/**
 * Called by `dissolveHousehold` once the household is out of the world. `heir` is the household the last member joined and `via` that
 * member; both are absent when the last member died. Returns how many parcels changed hands.
 */
export function releaseEstate(w:World,gone:Household,heir?:Household,via?:Person):number{
 if(!hasEstateRelease(w))return 0;
 const to=heir?.id??0;
 let n=0,x=0,y=0;
 for(const pile of w.piles){
  const e=pile.estate;if(!e||e.hhId!==gone.id)continue;
  e.hhId=to;
  for(const t of toolsHeldBy(w,pile.id))if(t.ownerHh===gone.id)t.ownerHh=to;
  if(!n){x=pile.x+.5;y=pile.y+.5;}
  n++;
 }
 if(n)addEvent(w,'life',heir
  ?`What the ${gone.name} household left behind passed to the ${heir.name} household with ${via?.name??'its last member'}.`
  :`No one of the ${gone.name} household is left; what they left behind is anyone's to take.`,via?[via.id]:[],x,y);
 return n;
}
