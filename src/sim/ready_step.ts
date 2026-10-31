// Rules 99: a project step that is already prepared is finished, not left while its maker hauls by hand.
//
// Diagnosed on the rules-98 staged cart scene run with ordinary decisions (docs/READY_STEP.md): with four planks, two handles,
// two wood on the timber yard's shelf and the hammer in hand, the assembly offer (base 28 less the walk) scored about 17
// against about 40 for gathering the same site's stone by hand, and the prepared cart was never built in three days. The
// plan's own nudge (14) does not close that gap. Here a step whose every input the person has personally seen on the shelf,
// whose tool is in hand or on the rack and whose workshop they remember free gets one bounded, named part; a step short of
// anything, or at a workshop remembered busy, gets nothing and is planned exactly as before. The same slice stops a recipe
// node from "collecting" its own output from the workshop that is also its destination, which looped collect/deposit
// instead of making the remaining quantity.
import {runsRulesVersion} from './rulesversion';
import type {Belief,ItemKind,Person,World} from './types';
import type {Recipe} from './recipes';
let enabled=true;
export const readyStepOn=()=>enabled;
export const setReadyStep=(on:boolean):void=>{enabled=on;};
export const hasReadyStep=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,99);
/** Bounded, like the plan nudge: a preference for finishing what is prepared, never an override of a need. */
export const READY_STEP_BONUS=18;
const unitsOf=(n:number|undefined):number=>n??0;
/** Pure. Every input and fuel the recipe takes is on the shelf as the person last saw it, and nobody else's batch occupies it. */
export function stepPrepared(w:World,p:Person,b:Belief,r:Recipe,toolAvailable:boolean):boolean{
 if(!hasReadyStep(w)||!toolAvailable)return false;
 const snap=b.ops;
 // their own batch of this very recipe, under way as they last saw it: its inputs are in the job, not on the shelf
 if(snap?.job===r.id&&snap.client===p.id&&snap.burn===0&&snap.progress<1)return true;
 if(snap?.job&&snap.readyAt>w.tick)return false;
 for(const k of Object.keys(r.inputs) as ItemKind[])if(unitsOf(b.items?.[k])<unitsOf(r.inputs[k]))return false;
 for(const k of Object.keys(r.fuel) as ItemKind[])if(unitsOf(b.items?.[k])<unitsOf(r.fuel[k]))return false;
 return true;
}
