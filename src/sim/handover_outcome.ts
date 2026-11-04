// Rules 157: a goods hand-over that moved nothing says why, from what the giver can see at the hand-over itself.
// Ordinary origin (review_evidence/carry-recovery-20261105): across four 10-day worlds every recorded "they had no room
// to carry it" care failure was a carer who had set out on a remembered need and arrived to find the dependant (nearly
// always a child) already carrying food. Reported as a full pack, it also sent the carer on the rules-63 errand of
// leaving food at home for someone already holding food. Now that ending says so and leaves no pack-room memory; a pack
// genuinely full of other things keeps the existing household-store fallback. Nothing is moved, created or lost here.
// The carer keeps what they found for a while (HAD_FOOD_MEMORY): out of sight, a dependant last reached holding food is not
// set out for again on food alone; seeing them again, or a need for water, decides afresh.
import {isFood} from './social';
import {roomFor} from './economy';
import {carryCap} from './people';
import {noteFailure,recentFailure} from './knowledge';
import {runsRulesVersion} from './rulesversion';
import type {ItemKind,Items,Person,World} from './types';

let enabled=true;
export const handoverTruthOn=():boolean=>enabled;
export const setHandoverTruth=(on:boolean):void=>{enabled=on;};
export const hasHandoverTruth=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,157);

export const GIVER_LACKS='I no longer had what I was bringing';
export const ALREADY_HAS_FOOD='they already have food with them';
export type EmptyHandover='giver lacks'|'already has food'|'no room';

/** Why a hand-over of `want` from p to q moved nothing. Call only after the transfer moved nothing. */
export function emptyHandover(w:World,p:Person,q:Person,want:Items):EmptyHandover{
 const kinds=(Object.keys(want) as ItemKind[]).filter(k=>(want[k]??0)>0);
 if(!kinds.some(k=>(p.inv[k]??0)>0))return 'giver lacks';
 const offered=kinds.filter(k=>(p.inv[k]??0)>0);
 const holdsFood=(Object.keys(q.inv) as ItemKind[]).some(k=>isFood(k)&&(q.inv[k]??0)>0);
 if(holdsFood&&offered.every(k=>isFood(k)&&roomFor(q.inv,carryCap(w,q),k)<1))return 'already has food';
 return 'no room';
}

export const HAD_FOOD_MEMORY=600;
export const HAD_FOOD_REASON='had food with them when I last reached them';
const MAX_HAD_FOOD=6;

/** Remember, in the carer's own failure store, that this dependant was found holding food. Bounded like rules 63. */
export function noteHadFood(w:World,p:Person,q:Person):void{
 noteFailure(w,p,q.id,ALREADY_HAS_FOOD);
 const entries=Object.entries(p.failures).filter(([,f])=>f.reason===ALREADY_HAS_FOOD).sort((a,b)=>b[1].tick-a[1].tick||Number(a[0])-Number(b[0]));
 for(let n=0;n<entries.length;n++)if(n>=MAX_HAD_FOOD||w.tick-entries[n][1].tick>=HAD_FOOD_MEMORY)delete p.failures[Number(entries[n][0])];
}

/** True when this carer recently reached the dependant and found them holding food. */
export function recentlyHadFood(w:World,p:Person,id:number):boolean{
 return hasHandoverTruth(w)&&recentFailure(w,p,id,HAD_FOOD_MEMORY)?.reason===ALREADY_HAS_FOOD;
}
