// Rules 156: work matched to age by the physical task, not the broad activity name. A child (under 12) may pick berries,
// fruit and grain, fetch water, learn and play, but does not chop wood or break stone: the same `gather` activity at a tree
// or rock carries the injury risk of heavy work (act_resource.ts riskOfHarm). The construction, crafting, farming and fire
// limits in decision.ts stay as they were. Youths (12-15) are unchanged: no youth gap has been demonstrated.
// The offer is withheld with a truthful reason; execution and resumption are refused on the same rule.
import {stageOf} from './people';
import {addBlocked} from './optutil';
import type {Ctx,Option} from './optutil';
import {runsRulesVersion} from './rulesversion';
import type {Person,World} from './types';

let enabled=true;
export const childTasksOn=():boolean=>enabled;
export const setChildTasks=(on:boolean):void=>{enabled=on;};
export const hasChildTasks=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,156);

export const CHILD_HEAVY_REASON='too young to chop wood or break stone';
const HEAVY=new Set(['tree','rock']);

/** True when this person may not do this physical gathering task under rules 156. */
export function childHeavyTask(w:World,p:Person,sourceType:string|undefined):boolean{
 return hasChildTasks(w)&&!!sourceType&&HEAVY.has(sourceType)&&stageOf(w,p)==='child';
}

/** Withhold a child's wood and stone gathering, recording why. Other options pass unchanged. */
export function childTaskFilter(ctx:Ctx,opts:Option[]):Option[]{
 if(ctx.stage!=='child'||!hasChildTasks(ctx.world))return opts;
 return opts.filter(o=>{
  if(o.kind!=='gather')return true;
  const real=ctx.world.byId.get(o.targetId);
  const type=ctx.p.beliefs[o.targetId]?.kind??(real?.ent==='source'?real.type:undefined);
  if(!childHeavyTask(ctx.world,ctx.p,type))return true;
  addBlocked(ctx,'gather',o.label,o.targetId,CHILD_HEAVY_REASON,o.tag);
  return false;
 });
}
