// Build a finite prerequisite tree from personal knowledge. Compilation creates no action, reservation or material.
import {TOOL_DEFS,TOOL_RECIPE,isHomeType} from './constants';
import {hasKnownResource} from './intent';
import {isRawMaterial} from './options_work';
import {rankWaterSpots} from './optutil';
import type {Ctx} from './optutil';
import {facilitiesOf,preferredRecipeForTools,toolAvailable} from './production';
import {recipesMaking} from './recipes';
import type {Recipe} from './recipes';
import {techniqueBlocker} from './techniques';
import {toolsHeldBy} from './toolreg';
import {reservedFor} from './social';
import type {BuildingType,Intention,ItemKind,Items,ToolKind} from './types';
import {PROJECT_LIMITS,projectGoalError,projectGraphError} from './project_graph';
import type {ProjectGoal,ProjectGraph,ProjectNode} from './project_graph';

export type ProjectCompilation={ok:true;graph:ProjectGraph;searched:number}|{ok:false;reason:string;searched:number};
export function recipeInputs(r:Recipe):Items{
 const need:Items={...r.inputs};for(const k of Object.keys(r.fuel) as ItemKind[])need[k]=(need[k]??0)+(r.fuel[k]??0);return need;
}
export function compileProject(ctx:Ctx,goal:ProjectGoal,ownPlan?:Pick<Intention,'wants'>):ProjectCompilation{
 const bad=projectGoalError(goal);if(bad)return {ok:false,reason:bad,searched:0};
 const {p,world}=ctx,nodes:ProjectNode[]=[];let searched=0;
 const build=(item:ItemKind|'cart',quantity:number,tier:0|1,destination:number,depth:number,path:Set<string>):number=>{
  if(++searched>PROJECT_LIMITS.search)throw new Error('project search budget exhausted');
  if(depth>PROJECT_LIMITS.depth)throw new Error('project prerequisite depth exceeded');
  if(nodes.length>=PROJECT_LIMITS.nodes)throw new Error('project step limit exceeded');
  if(quantity>PROJECT_LIMITS.quantity)throw new Error('prerequisite quantity exceeds project bounds');
  const key=item+':'+tier+':'+destination;if(path.has(key))throw new Error('cyclic production dependency for '+item);
  const chain=new Set(path);chain.add(key);
  const node:ProjectNode={id:nodes.length+1,item,quantity,tier,destination,method:'present',place:0,recipe:'',dependencies:[],alternatives:[],estimatedTicks:0};nodes.push(node);
  const shelf=destination?p.beliefs[destination]?.items?.[item as ItemKind]??0:0;
  const held=item==='cart'?0:tier===1?toolsHeldBy(world,p.id,item as ToolKind).filter(t=>t.tier===1).length:Math.max(0,(p.inv[item]??0)-reservedFor(world,p,item)+(ownPlan?.wants[item]??0));
  if(shelf+held>=quantity)return node.id;
  // Reuse remembered workshop output. Owned food reserves retain the ordinary supply planner's separate surplus gate.
  if(tier===0&&item!=='cart'&&!['berries','fruit','grain','fish','bread','meat','flour'].includes(item)){
   const stored=Object.values(p.beliefs).some(b=>b.id!==destination&&b.kind==='building'&&(b.items?.[item]??0)>=quantity&&
    (b.btype==='storehouse'||(b.hh===p.hhId&&isHomeType(b.btype))||!!b.btype&&facilitiesOf(ctx,b.btype as BuildingType).some(f=>f.b.id===b.id)));
   if(stored){node.method='supply';return node.id;}
  }
  if(item!=='cart'&&((isRawMaterial(item)&&hasKnownResource(world,p,item))||(item==='water'&&rankWaterSpots(ctx,1).length>0))){node.method='supply';return node.id;}
  const tool=item as ToolKind,hand=TOOL_DEFS[tool]?.hand;
  if(tier===0&&hand){
   const checkpoint=nodes.length;
   try{
    node.method='hand';node.recipe=tool;
    for(const k of ['wood','stone'] as const){const n=TOOL_RECIPE[tool][k];if(n>0)node.dependencies.push(build(k,n,0,0,depth+1,chain));}
    node.estimatedTicks=TOOL_RECIPE[tool].work+node.dependencies.reduce((n,id)=>n+nodes[id-1].estimatedTicks,0);return node.id;
   }catch{nodes.splice(checkpoint);node.dependencies=[];}
  }
  let failure='no personally known way to obtain '+item;
  for(const r of recipesMaking(item)){
   if(tier===1&&r.toolOut?.tier!==1)continue;
   if(techniqueBlocker(world,p,r.id)){failure=techniqueBlocker(world,p,r.id)!;continue;}
   for(const fac of facilitiesOf(ctx,r.at).slice(0,PROJECT_LIMITS.alternatives)){
    if(++searched>PROJECT_LIMITS.search)throw new Error('project search budget exhausted');
    if(!preferredRecipeForTools(ctx,fac,r))continue;
    const checkpoint=nodes.length;node.dependencies=[];
    try{
     node.method='recipe';node.place=fac.b.id;node.recipe=r.id;
     if(r.tool?.required&&!toolAvailable(ctx,fac,r))node.dependencies.push(build(r.tool.kind,1,0,0,depth+1,chain));
     for(const k of Object.keys(recipeInputs(r)) as ItemKind[])node.dependencies.push(build(k,recipeInputs(r)[k]!,0,fac.b.id,depth+1,chain));
     const perBatch=r.cartOut||r.toolOut?1:r.outputs[item as ItemKind]??r.fromDeposit?.n??1;
     node.estimatedTicks=Math.ceil(quantity/perBatch)*(r.work+r.burn+node.dependencies.reduce((n,id)=>n+nodes[id-1].estimatedTicks,0));
     node.alternatives=recipesMaking(item).filter(other=>other.id!==r.id&&facilitiesOf(ctx,other.at).length>0&&!techniqueBlocker(world,p,other.id)).slice(0,PROJECT_LIMITS.alternatives).map(other=>other.id);
     return node.id;
    }catch(e){failure=e instanceof Error?e.message:String(e);nodes.splice(checkpoint);node.dependencies=[];}
   }
  }
  throw new Error(failure);
 };
 try{
  const root=build(goal.item,goal.quantity,goal.tier,0,0,new Set()),graph:ProjectGraph={version:1,goal:{...goal},root,nodes,current:0,completed:[],retries:0,history:[]};
  const why=projectGraphError(graph);return why?{ok:false,reason:why,searched}:{ok:true,graph,searched};
 }catch(e){return {ok:false,reason:e instanceof Error?e.message:String(e),searched};}
}
