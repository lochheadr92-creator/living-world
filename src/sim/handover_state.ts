// Bounded personal agreement state. This module does not read another person's plans.
import type {HeardUndertaking} from './continuity_knowledge';
import type {Intention,Person,World} from './types';
import {runsRulesVersion} from './rulesversion';
export interface WorkHandover {
 id:number;from:number;to:number;cause:'incapacity'|'departure';work:HeardUndertaking;
 proposedAt:number;state:'proposed'|'accepted'|'declined'|'returned'|'finished'|'failed';
 answeredAt?:number;helperPlan?:number;endedAt?:number;reason:string;reportAt?:number;
}
let enabled=true;
export const workHandoverOn=()=>enabled;
export const setWorkHandover=(on:boolean):void=>{enabled=on;};
export const hasWorkHandover=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,94);
export const personalHandovers=(p:Person):WorkHandover[]=>Object.values(p.relations).flatMap(r=>r.handovers??[]);
/** A person's accepted delegation prevents another private plan of the same kind until informed closure. */
export const handedOver=(p:Person,kind:Intention['kind'])=>personalHandovers(p).some(h=>h.from===p.id&&h.state==='accepted'&&h.work.kind===kind);
