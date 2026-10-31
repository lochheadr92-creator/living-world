// Rules 116 (review 2, LW-01): a paused ordinary activity that cannot be taken up again, or is stopped while paused, ends through
// the common ending path (`endActivity`), so its claims, handler cleanup, promise attempt, result and decision are recorded exactly
// as an active activity's would be. Before 116 it was dropped silently. The occasion branch (rules 112) already did this.
import {runsRulesVersion} from './rulesversion';
import type {Activity,World} from './types';
let enabled=true;
export const suspendedEndingsOn=()=>enabled;
export function setSuspendedEndings(on:boolean):void{enabled=on;}
export const hasSuspendedEndings=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,116);
/** Why a paused ordinary activity cannot resume, worded and classed as the same activity would end while active; null if it can. */
export function ordinaryResumeFailure(w:World,a:Activity,nightWait:boolean):{outcome:'failed'|'partial';detail:string}|null{
 if(w.tick>a.expire&&!nightWait)return {outcome:a.cycle>0?'partial':'failed',detail:'took too long'};
 if(a.targetId&&a.targetType!=='person'&&a.targetType!=='tile'&&!w.byId.has(a.targetId)&&!nightWait)return {outcome:a.cycle>0?'partial':'failed',detail:`the ${a.targetType} it was for was gone when the conversation ended`};
 return null;
}
