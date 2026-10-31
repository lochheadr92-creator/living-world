// Personal inputs for only the hand-tool prerequisite currently being prepared, not the whole graph.
import {TOOL_DEFS,TOOL_RECIPE} from './constants';
import {runsRulesVersion} from './rulesversion';
import type {ProjectGraph} from './project_graph';
import type {ProjectStep} from './project_step';
import type {Items,Person,ToolKind,World} from './types';
let enabled=true;
export const projectHandInputsOn=()=>enabled;
export function setProjectHandInputs(on:boolean):void{enabled=on;}
export const hasProjectHandInputs=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,115);
/** Pure desired input claim. Existing inventory/commitment owners decide which actual goods are available. */
export function currentHandInputs(w:World,g:ProjectGraph,s:ProjectStep):Items|null{
 if(!hasProjectHandInputs(w)||!['acquire','craft'].includes(s.phase))return null;
 // A hand recipe has only raw carried input children. A sibling/future hand tool is not the current task.
 const hand=s.node.method==='hand'?s.node:g.nodes.find(n=>n.method==='hand'&&n.dependencies.includes(s.node.id));
 if(!hand||hand.destination!==0||!TOOL_DEFS[hand.item as ToolKind]?.hand)return null;
 const r=TOOL_RECIPE[hand.item as ToolKind],inputs:Items={};
 if(r.wood>0)inputs.wood=r.wood;if(r.stone>0)inputs.stone=r.stone;return inputs;
}

/** A separate tool intention must not reserve the very same prerequisite a live batch is already preparing. */
export function alreadyPreparingHandTool(w:World,p:Person,tool:ToolKind):boolean{
 if(!hasProjectHandInputs(w))return false;
 return p.intentions.some(i=>{
  if(i.status!=='active'||i.kind!=='batch'||!i.project||i.project.failure)return false;
  const g=i.project,n=g.nodes.find(n=>n.id===g.current);if(!n)return false;
  const hand=n.method==='hand'?n:g.nodes.find(parent=>parent.method==='hand'&&parent.dependencies.includes(n.id));
  return hand?.item===tool;
 });
}
