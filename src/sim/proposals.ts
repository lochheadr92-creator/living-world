// Proposed projects (docs/PROPOSED_PROJECTS.md): an outside controller may PROPOSE a bounded production goal for the person it
// drives, and nothing more. The engine validates the goal with the planner it already has (project_compile.ts, from the person's
// own knowledge only), adopts it as the ordinary batch plan through the ordinary gates (intent.ts adoptProposedBatch), or refuses
// it with a reason. A proposal creates no goods, knowledge, access or reservation: a plan is what the planner would have made for
// the same want, and every step of it is the engine's own offer, judged and executed as for anyone. With nothing installed none of
// this runs; the autonomous world is byte for byte unchanged, so this seam carries no rules version of its own.
import {compileProject} from './project_compile';
import {projectGoalError} from './project_graph';
import type {ProjectGoal} from './project_graph';
import {hasProjectPlans} from './project_step';
import {hasBatchPlans} from './batch_plan';
import {adoptProposedBatch} from './intent';
import type {Ctx} from './optutil';
import {facilitiesOf} from './production';
import {RECIPES} from './recipes';
import type {Intention,ItemKind} from './types';
export type ProposalResult={ok:true;plan:Intention;searched:number}|{ok:false;reason:string};
/** the goal as text, for notes and logs */
export const goalText=(g:ProjectGoal):string=>`${g.quantity} ${g.tier===1?'iron ':''}${g.item}`;
/**
 * Pure until adoption, and nothing is written on a refusal. Order: shape, rules, repeat, feasibility from personal knowledge,
 * a workshop recipe at the root (a thing simply fetched or already held is no project), then the ordinary adoption gates.
 */
export function proposeProject(ctx:Ctx,goal:unknown):ProposalResult{
 const bad=projectGoalError(goal);if(bad)return {ok:false,reason:bad};
 const g=goal as ProjectGoal,{world,p}=ctx;
 if(!hasProjectPlans(world)||!hasBatchPlans(world))return {ok:false,reason:'these rules do not run production projects'};
 if(p.intentions.some(i=>i.status==='active'&&i.kind==='batch'&&i.makes===g.item))return {ok:false,reason:`already seeing ${g.item} through`};
 const compiled=compileProject(ctx,{item:g.item,quantity:g.quantity,tier:g.tier});
 if(!compiled.ok)return {ok:false,reason:compiled.reason};
 const root=compiled.graph.nodes.find(n=>n.id===compiled.graph.root)!;
 if(root.method!=='recipe')return {ok:false,reason:root.method==='present'?`already has ${goalText(g)}`:root.method==='supply'?`${g.item} is simply fetched from a known place, not made`:`a ${g.item} is made by hand, which the ordinary tool plan covers`};
 const adopted=adoptProposedBatch(ctx,{item:g.item,recipe:root.recipe,facilityId:root.place,qty:g.quantity,forSite:0,why:'proposed from outside',wants:{},project:compiled.graph});
 if(!adopted.plan)return {ok:false,reason:adopted.reason};
 return {ok:true,plan:adopted.plan,searched:compiled.searched};
}
/**
 * Pure. What the person could propose at all, from their own knowledge: the outputs of recipes at workshops they know of, and a
 * cart where they know a timber yard. Knowing a workshop is not feasibility; the proposal is still compiled and may be refused.
 */
export function proposableItems(ctx:Ctx):string[]{
 if(!hasProjectPlans(ctx.world)||!hasBatchPlans(ctx.world)||ctx.stage==='child')return [];
 const out=new Set<string>();
 for(const r of RECIPES){
  if(!facilitiesOf(ctx,r.at).length)continue;
  if(r.cartOut)out.add('cart');
  if(r.toolOut)out.add(r.toolOut.kind);
  for(const k of Object.keys(r.outputs) as ItemKind[])if((r.outputs[k]??0)>0)out.add(k);
  if(r.fromDeposit)out.add(r.fromDeposit.item);
 }
 return [...out].sort();
}
