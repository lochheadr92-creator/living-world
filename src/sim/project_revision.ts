// An installed inhabitant may revise a personal production quantity. No autonomous caller.
import {compileProject} from './project_compile';
import {PROJECT_LIMITS,PROJECT_RETRY_TICKS,projectGraphError} from './project_graph';
import {hasProjectPlans,recordProjectStep} from './project_step';
import {hasBatchPlans,batchStep} from './batch_plan';
import {addLog} from './events';
import type {Ctx} from './optutil';
import type {ProposalResult} from './proposals';
export interface ProjectRevision {planId:number;quantity:number;}
export function reviseProject(ctx:Ctx,request:unknown):ProposalResult{
 const no=(reason:string):ProposalResult=>({ok:false,reason});
 if(!request||typeof request!=='object'||Array.isArray(request))return no('a plan and revised quantity are required');
 const r=request as ProjectRevision;
 if(Object.keys(r).some(k=>k!=='planId'&&k!=='quantity')||!Number.isSafeInteger(r.planId)||r.planId<=0||!Number.isSafeInteger(r.quantity)||r.quantity<1||r.quantity>PROJECT_LIMITS.quantity)return no('invalid plan id or bounded whole quantity');
 const {world,p}=ctx;
 if(!hasProjectPlans(world)||!hasBatchPlans(world))return no('these rules do not run production projects');
 if(ctx.stage==='child'||ctx.criticals.length||ctx.dangers.length)return no('not while too young, in danger or meeting an urgent need');
 if(p.activity||p.suspended)return no('finish or interrupt the current activity through its normal boundary first');
 const plan=p.intentions.find(i=>i.id===r.planId&&i.kind==='batch'&&i.status==='active'&&i.project);
 if(!plan?.project)return no('no such active production plan of mine');
 const old=plan.project;
 if(plan.forSite)return no('a site delivery commitment cannot be revised as a private quantity');
 if(old.goal.item==='cart')return no('a cart plan is for one cart, not a revised batch quantity');
 if(world.tick>plan.until||old.failure)return no('the project has already reached its ending boundary');
 if(old.retryAt!==undefined&&world.tick-old.retryAt<PROJECT_RETRY_TICKS)return no('the current retry wait has not elapsed');
 if(old.retries>=PROJECT_LIMITS.retries)return no('the project reconsideration budget is used up');
 if(old.goal.quantity===r.quantity)return no('that is already the planned quantity');
 const compiled=compileProject(ctx,{...old.goal,quantity:r.quantity},plan);if(!compiled.ok)return no(compiled.reason);
 const graph=compiled.graph,root=graph.nodes.find(n=>n.id===graph.root)!;
 const aboutId=root.method==='recipe'?root.place:plan.aboutId;
 if(p.beliefs[aboutId]?.kind!=='building')return no('the production workshop is no longer known');
 graph.retries=old.retries+1;graph.retryAt=world.tick;
 // Recompilation can renumber/remove nodes. Preserve bounded past facts as explicitly
 // prior-graph history, anchored at the new root rather than pretending a new node did them.
 graph.history=old.history.map(h=>({tick:h.tick,node:graph.root,reason:`Prior step ${h.node}: ${h.reason}`.slice(0,240)})).slice(-(PROJECT_LIMITS.history-1));
 const reason=`revised ${old.goal.item} quantity from ${old.goal.quantity} to ${r.quantity}; original deadline retained`;
 const bad=projectGraphError(graph);if(bad)return no(bad);
 // Only now mutate the existing plan. No id, deadline, paid work, goods or activity changes.
 plan.project=graph;plan.reserve=r.quantity;plan.aboutId=aboutId;
 if(root.method==='recipe')plan.recipe=root.recipe;
 plan.goal=`see ${r.quantity} ${old.goal.item} through at the ${(p.beliefs[aboutId]?.btype??'workshop').replace('_',' ')}`;
 recordProjectStep(ctx,plan);const step=batchStep(ctx,plan);
 plan.step=step.step;plan.stepKind=step.kind;plan.stepTarget=step.target;plan.stepItem=step.item;plan.stepKey=step.key;plan.blocked=step.blocked;
 // Keep the revision intelligible after recording the freshly validated next step.
 graph.history.push({tick:world.tick,node:graph.root,reason});graph.history=graph.history.slice(-PROJECT_LIMITS.history);
 addLog(world,p,'work',`${reason}.`);
 return {ok:true,plan,searched:compiled.searched};
}
