// Rules 106: care for a dependant out of sight is decided from how they looked when last seen, never from their live needs.
//
// The audit behind docs/LOCATION_QUESTION.md found that `optCare` read a dependant's current hunger, thirst and warmth
// while they were out of sight, so a parent set out with food the moment a child two fields away grew hungry, which
// nobody could know. Perception already reports the visible signs of a person in sight (perception.ts describeSeenPerson:
// looks hungry below 42, thirsty below 40, cold below 35). Here those signs are kept on the whereabouts note written at the
// same sight, and the care option for somebody not in sight reads only that note: what they looked like, when. Somebody in
// sight is judged as before, from what the carer can see up close. A note from before these rules carries no signs, and
// then the carer simply does not know how the dependant is.
import {runsRulesVersion} from './rulesversion';
import type {Person,SeenEntity,World} from './types';
export interface RememberedSigns {hungry:boolean;thirsty:boolean;cold:boolean}
let enabled=true;
export const rememberedNeedOn=()=>enabled;
export const setRememberedNeed=(on:boolean):void=>{enabled=on;};
export const hasRememberedNeed=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,106);
/** Perception only: the visible signs go with the whereabouts note of the same sight. */
export function rememberSigns(w:World,p:Person,seen:SeenEntity):void{
 if(!hasRememberedNeed(w))return;const note=p.whereabouts[seen.id];if(!note)return;
 note.seen={hungry:seen.hungry,thirsty:seen.thirsty,cold:seen.cold};
}
/** Pure. What the carer remembers of a dependant not in sight, or null when they never noted how they looked. */
export function rememberedSigns(p:Person,id:number):(RememberedSigns&{tick:number})|null{
 const note=p.whereabouts[id];if(!note?.seen)return null;return {...note.seen,tick:note.tick};
}
/** Pure. Needs as the carer can honestly assume them from remembered signs: just past the visible threshold, or fine. */
export function needsFromSigns(s:RememberedSigns):{hunger:number;thirst:number;warmth:number}{
 return {hunger:s.hungry?41:100,thirst:s.thirsty?39:100,warmth:s.cold?34:100};
}
/**
 * Pure. What a carer can honestly take a household dependant's needs to be: the live figures when the dependant is in
 * sight (and, below rules 106, always, as before), the needs implied by how they looked when last seen otherwise, and
 * null when they are out of sight and the carer never noted how they looked. `lookedAt` is the tick of that last sight.
 */
export function knownNeeds(w:World,p:Person,d:Person,seenNow:boolean):{hunger:number;thirst:number;warmth:number;lookedAt?:number}|null{
 if(seenNow||!hasRememberedNeed(w))return d.needs;
 const r=rememberedSigns(p,d.id);if(!r)return null;
 return {...needsFromSigns(r),lookedAt:r.tick};
}
export function validateRememberedSigns(w:World):void{
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,106);
 for(const p of w.persons)for(const n of Object.values(p.whereabouts))if(n.seen!==undefined&&(!allowed||typeof n.seen.hungry!=='boolean'||typeof n.seen.thirsty!=='boolean'||typeof n.seen.cold!=='boolean'))throw new Error('Invalid remembered signs');
}
