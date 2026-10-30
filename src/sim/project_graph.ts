// Declarative, bounded production prerequisites. These are beliefs and intentions, never inventory or executable code.
import {WEIGHT,TOOL_DEFS,TOOL_RECIPE} from './constants';
import {RECIPE_BY_ID} from './recipes';
import {runsRulesVersion} from './rulesversion';
import type {ItemKind,ToolKind,World} from './types';

export const PROJECT_LIMITS={nodes:32,depth:6,search:96,quantity:24,alternatives:4,retries:3,history:8} as const;
export interface ProjectGoal {item:ItemKind|'cart';quantity:number;tier:0|1;}
export interface ProjectNode {
 id:number;
 item:ItemKind|'cart';
 quantity:number;
 tier:0|1;
 /** 0 means carried; otherwise the personally known workshop receiving the ingredient. */
 destination:number;
 method:'present'|'supply'|'recipe'|'hand';
 place:number;
 recipe:string;
 dependencies:number[];
 /** Known candidate recipes for bounded reconsideration, subject to a fresh prerequisite check. */
 alternatives:string[];
 /** Unmodified recipe/hand-work ticks, including passive burning; a rough upper estimate, not a deadline. */
 estimatedTicks:number;
}
export interface ProjectGraph {
 version:1;
 goal:ProjectGoal;
 root:number;
 nodes:ProjectNode[];
 current:number;
 completed:number[];
 retries:number;
 retryAt?:number;
 failure?:string;
 history:{tick:number;node:number;reason:string}[];
}
const itemOk=(v:unknown):v is ItemKind|'cart'=>typeof v==='string'&&(v==='cart'||Object.hasOwn(WEIGHT,v));
const integer=(v:unknown,min:number,max:number):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function projectGoalError(goal:unknown):string|null{
 if(!goal||typeof goal!=='object')return 'a goal is required';
 const g=goal as ProjectGoal;
 if(!itemOk(g.item))return 'unknown project item';
 if(!integer(g.quantity,1,PROJECT_LIMITS.quantity))return 'project quantity is outside its bounded range';
 if(g.tier!==0&&g.tier!==1)return 'invalid project quality';
 if(g.tier===1&&!TOOL_DEFS[g.item as ToolKind])return 'quality requires a tool';
 return null;
}
/** Structural validation is independent of the world. Actual access and execution remain engine checks. */
export function projectGraphError(value:unknown):string|null{
 if(!value||typeof value!=='object')return 'missing project graph';
 const g=value as ProjectGraph,goalError=projectGoalError(g.goal);if(goalError)return goalError;
 if(g.version!==1||!Array.isArray(g.nodes)||!g.nodes.length||g.nodes.length>PROJECT_LIMITS.nodes)return 'invalid project graph size or version';
 const ids=new Set<number>();
 for(const n of g.nodes){
  if(!n||!integer(n.id,1,PROJECT_LIMITS.nodes)||ids.has(n.id)||!itemOk(n.item)||!integer(n.quantity,1,PROJECT_LIMITS.quantity)||![0,1].includes(n.tier))return 'invalid project node';
  ids.add(n.id);
  if(!integer(n.destination,0,Number.MAX_SAFE_INTEGER)||!integer(n.place,0,Number.MAX_SAFE_INTEGER)||!['present','supply','recipe','hand'].includes(n.method))return 'invalid project location or method';
  if(!Array.isArray(n.dependencies)||n.dependencies.length>PROJECT_LIMITS.nodes||new Set(n.dependencies).size!==n.dependencies.length)return 'invalid prerequisite list';
  if(!Array.isArray(n.alternatives)||n.alternatives.length>PROJECT_LIMITS.alternatives||n.alternatives.some(r=>typeof r!=='string'||!Object.hasOwn(RECIPE_BY_ID,r)))return 'invalid project alternative';
  if(typeof n.recipe!=='string'||(n.method==='recipe'&&!Object.hasOwn(RECIPE_BY_ID,n.recipe)))return 'unknown project recipe';
  if(n.method==='hand'&&(!TOOL_DEFS[n.recipe as ToolKind]?.hand||n.recipe!==n.item||n.tier!==0))return 'unknown hand-tool recipe';
  if(n.method==='recipe'){
   const r=RECIPE_BY_ID[n.recipe];
   const produces=n.item==='cart'?r.cartOut:(r.outputs[n.item]??0)>0||r.toolOut?.kind===n.item||r.fromDeposit?.item===n.item;
   if(!produces||n.place===0||(n.tier===1&&r.toolOut?.tier!==1))return 'recipe does not produce the project item';
  }
  if(!Number.isFinite(n.estimatedTicks)||n.estimatedTicks<0||n.estimatedTicks>1e7)return 'invalid expected project cost';
 }
 if(!ids.has(g.root)||!integer(g.current,0,PROJECT_LIMITS.nodes)||(g.current!==0&&!ids.has(g.current)))return 'unknown project root or current step';
 const root=g.nodes.find(n=>n.id===g.root)!;
 if(root.item!==g.goal.item||root.quantity!==g.goal.quantity||root.tier!==g.goal.tier||root.destination!==0)return 'project root does not describe its goal';
 const active=new Set<number>(),visited=new Set<number>();let traversed=0;
 const visit=(id:number,depth:number):string|null=>{
  if(++traversed>PROJECT_LIMITS.search)return 'project validation budget exhausted';
  if(depth>PROJECT_LIMITS.depth)return 'project prerequisite depth exceeded';
  if(!ids.has(id))return 'unknown prerequisite';
  if(active.has(id))return 'cyclic project prerequisites';
  active.add(id);visited.add(id);
  for(const child of g.nodes.find(n=>n.id===id)!.dependencies){const why=visit(child,depth+1);if(why)return why;}
  active.delete(id);return null;
 };
 const why=visit(g.root,0);if(why)return why;
 if(visited.size!==g.nodes.length)return 'unreachable project step';
 for(const n of g.nodes){
  if((n.method==='present'||n.method==='supply')&&(n.dependencies.length||n.recipe||n.place))return 'supply step has production data';
  if(n.method==='recipe'||n.method==='hand'){
   const r=n.method==='recipe'?RECIPE_BY_ID[n.recipe]:null;
   const hand=n.method==='hand'?TOOL_RECIPE[n.item as ToolKind]:null;
   const need:Partial<Record<ItemKind,number>>=r?{...r.inputs}:hand?{wood:hand.wood,stone:hand.stone}:{};
   if(r)for(const k of Object.keys(r.fuel) as ItemKind[])need[k]=(need[k]??0)+(r.fuel[k]??0);
   const children=n.dependencies.map(id=>g.nodes.find(c=>c.id===id)!);
   for(const k of Object.keys(need) as ItemKind[])if(need[k]!>0){
    const matching=children.filter(c=>c.item===k&&c.destination===(r?n.place:0)&&c.tier===0&&c.quantity===need[k]);
    if(matching.length!==1)return 'recipe prerequisites do not match its physical inputs';
   }
   for(const c of children){
    const input=c.destination===(r?n.place:0)&&c.tier===0&&c.item!=='cart'&&need[c.item]===c.quantity;
    const tool=r?.tool?.required&&c.item===r.tool.kind&&c.destination===0&&c.quantity===1&&c.tier===0;
    if(!input&&!tool)return 'unrelated recipe prerequisite';
   }
  }
 }
 if(!integer(g.retries,0,PROJECT_LIMITS.retries)||!Array.isArray(g.completed)||g.completed.length>PROJECT_LIMITS.nodes||new Set(g.completed).size!==g.completed.length||g.completed.some(id=>!ids.has(id)))return 'invalid project progress';
 if(g.retryAt!==undefined&&!integer(g.retryAt,0,Number.MAX_SAFE_INTEGER))return 'invalid project retry time';
 if(g.failure!==undefined&&(typeof g.failure!=='string'||g.failure.length>240))return 'invalid project failure';
 if(!Array.isArray(g.history)||g.history.length>PROJECT_LIMITS.history||g.history.some(h=>!h||!integer(h.tick,0,Number.MAX_SAFE_INTEGER)||!ids.has(h.node)||typeof h.reason!=='string'||h.reason.length>240))return 'invalid project history';
 return null;
}
export function validateProjectGraphs(w:World):void{
 for(const p of w.persons??[])for(const i of p.intentions??[])if(i.project!==undefined){
  if(!runsRulesVersion(w,69)||w.settings.dynamics!=='rich'||i.kind!=='batch')throw new Error('Invalid project rules or intention');
  const why=projectGraphError(i.project);if(why)throw new Error('Invalid project: '+why);
  if(i.makes!==i.project.goal.item)throw new Error('Invalid project goal identity');
 }
}
/** A viewer explanation of the saved intention, not a claim that its prerequisites have happened. */
export function describeProject(g:ProjectGraph):string{
 const names:string[]=[];
 const visit=(id:number)=>{
  const n=g.nodes.find(n=>n.id===id)!;
  for(const c of n.dependencies)visit(c);
  if(n.method==='recipe'){
   const label=RECIPE_BY_ID[n.recipe].label;
   if(!names.includes(label))names.push(label);
  }else if(n.method==='hand'&&!names.includes(`Make ${n.item}`))names.push(`Make ${n.item}`);
 };
 visit(g.root);
 const root=g.nodes.find(n=>n.id===g.root)!;
 return `Planned production: ${names.join(' → ')||'collect known supplies'}. Estimated work and firing: ${Math.round(root.estimatedTicks)} ticks, plus travel and interruptions.`+
  (g.retries?` Reconsidered ${g.retries} time${g.retries===1?'':'s'}.`:'')+
  (g.history.length?` Last change: ${g.history.at(-1)!.reason}.`:'');
}
