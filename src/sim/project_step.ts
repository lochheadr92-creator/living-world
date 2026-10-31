import {currentHandInputs} from './project_hand_inputs';
// Pure interpretation of a saved prerequisite graph. It describes a next ordinary action; it never executes one.
import {runsRulesVersion} from './rulesversion';
import {reservedFor} from './social';
import {toolsHeldBy} from './toolreg';
import type {Ctx} from './optutil';
import {eta} from './optutil';
import type {Intention,ItemKind,Person,ToolKind,World} from './types';
import {PROJECT_LIMITS} from './project_graph';
import {hasReadyStep} from './ready_step';
import type {ProjectGraph,ProjectNode} from './project_graph';
let enabled=true;
export const projectPlansOn=()=>enabled;
export function setProjectPlans(on:boolean):void{enabled=on;}
export const hasProjectPlans=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,69);
export function projectAvailable(w:World,p:Person,i:Pick<Intention,'wants'>,item:ItemKind):number{
 return Math.max(0,(p.inv[item]??0)-reservedFor(w,p,item)+(i.wants[item]??0));
}
export function projectCraftPlan(ctx:Ctx,tool:ToolKind):Intention|undefined{
 if(!hasProjectPlans(ctx.world))return;
 return ctx.p.intentions.find(i=>{
  if(i.status!=='active'||!i.project)return false;
  const s=nextProjectStep(ctx,i.project,i);return s.phase==='craft'&&s.node.item===tool;
 });
}
export interface ProjectStep {
 phase:'done'|'acquire'|'deposit'|'operate'|'collect'|'craft'|'wait'|'blocked';
 node:ProjectNode;
 target:number;
 quantity:number;
 wait:number;
 reason:string;
 completed:number[];
}
export function nextProjectStep(ctx:Ctx,graph:ProjectGraph,plan:Pick<Intention,'wants'>):ProjectStep{
 const {world,p}=ctx,completed:number[]=[];
 const answer=(node:ProjectNode,phase:ProjectStep['phase'],target=0,quantity=node.quantity,reason='',wait=0):ProjectStep=>({node,phase,target,quantity,reason,wait,completed});
 const visit=(id:number):ProjectStep|null=>{
  const n=graph.nodes.find(n=>n.id===id)!;
  const dest=n.destination?p.beliefs[n.destination]:null;
  if(n.destination&&(!dest||dest.kind!=='building'))return answer(n,'blocked',n.destination,0,'the receiving workshop is no longer known');
  const held=n.item==='cart'?Object.values(p.beliefs).filter(b=>b.kind==='cart'&&b.hh===p.hhId).length:
   n.tier===1?toolsHeldBy(world,p.id,n.item as ToolKind).filter(t=>t.tier===1).length:projectAvailable(world,p,plan,n.item);
  const stock=dest?.items?.[n.item as ItemKind]??0;
  if((n.destination?stock:held)>=n.quantity){completed.push(id);return null;}
  const remaining=n.quantity-(n.destination?stock:held);
  if(n.destination&&held>0)return answer(n,'deposit',n.destination,Math.min(held,remaining));
  if(n.method==='supply')return answer(n,'acquire',0,remaining);
  if(n.method==='present')return answer(n,'blocked',n.destination,remaining,'the supplies previously counted on are no longer available');
  const b=n.place?p.beliefs[n.place]:null;
  if(n.method==='recipe'&&(!b||b.kind!=='building'))return answer(n,'blocked',n.place,remaining,'the workshop is no longer known');
  if(b){
   const snap=b.ops,mine=snap?.client===p.id&&snap.job===n.recipe;
   // rules 99 (ready_step.ts): output already at the workshop that is also its destination is stock, not something to collect
   if(n.item!=='cart'&&(b.items?.[n.item]??0)>0&&!(hasReadyStep(world)&&n.place===n.destination))return answer(n,'collect',b.id,remaining);
   if(mine&&snap!.burn===0&&snap!.progress<1)return answer(n,'operate',b.id,remaining);
   if(mine&&snap!.burn>0){
    const until=snap!.readyAt-world.tick;
    if(until>eta(ctx,b.x,b.y)+60)return answer(n,'wait',b.id,remaining,'waiting for the batch I started',Math.min(240,Math.max(1,until)));
    if(n.item!=='cart')return answer(n,'collect',b.id,remaining);
   }
  }
  for(const child of n.dependencies){const step=visit(child);if(step)return step;}
  return answer(n,n.method==='hand'?'craft':'operate',n.place,remaining);
 };
 return visit(graph.root)??answer(graph.nodes.find(n=>n.id===graph.root)!,'done');
}
/** Decision mutation only: observation uses nextProjectStep directly and never records progress. */
export function recordProjectStep(ctx:Ctx,i:Intention):void{
 if(!i.project||!hasProjectPlans(ctx.world))return;
 const step=nextProjectStep(ctx,i.project,i),g=i.project;
 const reason=step.phase+': '+(step.reason||step.node.item);
 if(g.current!==step.node.id||g.history.at(-1)?.reason!==reason){
  g.history.push({tick:ctx.world.tick,node:step.node.id,reason});
  if(g.history.length>PROJECT_LIMITS.history)g.history.splice(0,g.history.length-PROJECT_LIMITS.history);
 }
 g.current=step.node.id;g.completed=step.completed;
 // Claims cover the current trip or immediate hand-tool inputs, never distant stock or the whole tree.
 i.wants=currentHandInputs(ctx.world,g,step)??(step.node.item==='cart'||step.phase==='blocked'||step.phase==='wait'||step.phase==='done'?{}:
  step.phase==='acquire'||step.phase==='deposit'?{[step.node.item]:step.quantity}:{});
}
