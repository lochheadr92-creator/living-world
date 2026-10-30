import {afterEach,expect,it} from 'vitest';
import {projectProductionScene} from './helpers/project_production';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {reviewIntentions,settleIntentions} from '../src/sim/intent';
import {observeInhabitant} from '../src/agent/observe';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {consume,produce,conservationReport} from '../src/sim/economy';
import {observe,delBelief} from '../src/sim/knowledge';
import {setProjectPlans} from '../src/sim/project_step';
import {parseIntervention} from '../scripts/lab/lab';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {abortActivity} from '../src/sim/activities';
import {compileProject} from '../src/sim/project_compile';
import {breakTool} from '../src/sim/tools';
import {toolsHeldBy} from '../src/sim/toolreg';
import {carryCap} from '../src/sim/people';
afterEach(()=>setProjectPlans(true));
function adopted(){const f=projectProductionScene();stepWorld(f.w);const plan=f.p.intentions.find(i=>i.project)!;expect(plan).toBeDefined();return {...f,plan};}
it.each(['old','removed'] as const)('does not adopt prerequisite graphs with %s rules',why=>{
 const undo=why==='removed'?parseIntervention('rich-no-project-plans').install!():()=>{};
 try{const f=projectProductionScene(why==='old'?68:69);for(let n=0;n<80;n++)stepWorld(f.w);expect(f.p.intentions.some(i=>i.project)).toBe(false);}finally{undo();}
});
it('observation and repeated prerequisite offers do not mutate the saved project',()=>{
 const f=adopted(),saved=serializeWorld(f.w);
 for(let n=0;n<30;n++){const ctx=generateOptions(f.w,f.p,true,true);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));}
 expect(serializeWorld(f.w)).toBe(saved);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
it.each(['cycle','wrong output','wrong input','oversized history','old rules'] as const)('rejects %s in persisted graph data',why=>{
 const f=adopted(),g=f.plan.project!;
 if(why==='cycle')g.nodes[0].dependencies.push(g.root);
 if(why==='wrong output')g.nodes[0].recipe='burn_charcoal';
 if(why==='wrong input')g.nodes.find(n=>n.item==='ore')!.quantity=1;
 if(why==='oversized history')g.history=Array.from({length:9},()=>({tick:0,node:g.root,reason:'x'}));
 if(why==='old rules')f.w.settings.rulesVersion=68;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/project/i);
});
it('recompiles lost stocked input into a known raw source, without changing goods or accepting unseen stock',()=>{
 const f=adopted();consume(f.w,f.kiln.store.items,'wood',f.kiln.store.items.wood??0,'staged competing use');observe(f.w,f.p,f.kiln);
 const inventory={...f.p.inv};reviewIntentions(generateOptions(f.w,f.p,true,true));
 expect(f.plan.project!.retries).toBe(1);expect(f.plan.project!.nodes.some(n=>n.item==='wood'&&n.method==='supply')).toBe(true);
 expect(f.p.inv).toEqual(inventory);expect(conservationReport(f.w).ok).toBe(true);expect(()=>deserializeWorld(serializeWorld(f.w))).not.toThrow();
});
it('bounds unsuccessful reconsideration and records an honest abandoned result',()=>{
 const f=adopted();consume(f.w,f.kiln.store.items,'wood',f.kiln.store.items.wood??0,'staged competing use');observe(f.w,f.p,f.kiln);delBelief(f.p,f.tree.id);
 // Decision-boundary contract: advance only its clock, with no claim of ordinary physical continuation.
 for(let n=0;n<3;n++){reviewIntentions(generateOptions(f.w,f.p,true,true));expect(f.plan.project!.retries).toBe(n+1);f.w.tick+=240;}
 settleIntentions(f.w,f.p);expect(f.plan.status).toBe('dropped');expect(f.plan.reason).toContain('3 reconsiderations');expect(f.plan.project!.history.length).toBeLessThanOrEqual(8);
});
it.each(['cancelled','promised','lost goods'] as const)('revalidates %s during an actual prerequisite delivery',why=>{
 const f=adopted();
 for(let n=0;n<2200&&!f.p.activity?.data.projectSupply;n++)stepWorld(f.w);
 const a=f.p.activity!;expect(a?.data.projectSupply).toBe(f.plan.id);
 const item=Object.keys(a.data.items)[0] as keyof typeof f.p.inv,target=f.w.byId.get(a.targetId)!;
 expect(target.ent).toBe('building');if(target.ent!=='building')return;
 const stock=target.store.items[item]??0;
 if(why==='cancelled')f.plan.status='dropped';
 if(why==='promised')f.p.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.p.id,item,amount:f.p.inv[item]??0,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});
 if(why==='lost goods')consume(f.w,f.p.inv,item,f.p.inv[item]??0,'staged loss during delivery');
 setProjectPlans(false);const copy=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<900&&f.p.activity?.id===a.id;n++){stepWorld(f.w);stepWorld(copy);}
 expect(f.p.lastResult?.outcome).toBe('failed');expect(target.store.items[item]??0).toBe(stock);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
it('waits for a personally started firing even at full energy, and ends when the goal is cancelled',()=>{
 const f=adopted();for(let n=0;n<1000&&!f.p.beliefs[f.kiln.id]?.ops?.burn;n++)stepWorld(f.w);
 expect(f.p.beliefs[f.kiln.id]?.ops?.burn).toBeGreaterThan(0);
 abortActivity(f.w,f.p,'staged selection of the offered wait');f.p.needs.energy=100;
 const offer=generateOptions(f.w,f.p,true,true).options.find(o=>o.key.startsWith('project_wait:'));expect(offer).toBeDefined();
 const selected=selectPrerequisite(f.w,f.p,offer!.key);selected.restore();const copy=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<25;n++){stepWorld(f.w);stepWorld(copy);}
 expect(f.p.activity?.id).toBe(selected.act.id);expect(selected.act.progress).toBeGreaterThan(1);expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 f.plan.status='dropped';setProjectPlans(false);for(let n=0;n<10&&f.p.activity?.id===selected.act.id;n++)stepWorld(f.w);
 expect(f.p.lastResult?.outcome).toBe('partial');expect(f.p.lastResult?.detail).toContain('no longer active');expect(conservationReport(f.w).ok).toBe(true);
});
it.each([false,true])('revalidates a compiled hand-tool prerequisite before consuming inputs (competing promise: %s)',promised=>{
 const f=adopted();abortActivity(f.w,f.p,'staged tool-loss boundary');breakTool(f.w,toolsHeldBy(f.w,f.p.id,'hammer')[0],'staged tool loss');
 consume(f.w,f.p.inv,'bread',2,'staged lighter craft load');consume(f.w,f.p.inv,'water',2,'staged lighter craft load');
 produce(f.w,f.p.inv,carryCap(f.w,f.p),'wood',1,'staged craft supplies');produce(f.w,f.p.inv,carryCap(f.w,f.p),'stone',2,'staged craft supplies');
 expect(f.p.inv.stone).toBe(2);
 // Explicitly stage a freshly compiled accepted graph to isolate the physical crafting contract.
 const graph=compileProject(generateOptions(f.w,f.p,true,true),f.plan.project!.goal,f.plan);expect(graph.ok,JSON.stringify({graph,inv:f.p.inv,plans:f.p.intentions})).toBe(true);if(!graph.ok)return;f.plan.project=graph.graph;
 const selected=selectPrerequisite(f.w,f.p,'craft:hammer');selected.restore();expect(selected.act.data.projectCraft).toBe(f.plan.id);
 if(promised)f.p.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.p.id,item:'wood',amount:1,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});
 const copy=deserializeWorld(serializeWorld(f.w));for(let n=0;n<900&&f.p.activity?.id===selected.act.id;n++){stepWorld(f.w);stepWorld(copy);}
 expect(toolsHeldBy(f.w,f.p.id,'hammer').length).toBe(promised?0:1);expect(f.p.lastResult?.outcome).toBe(promised?'failed':'success');
 if(promised){expect(f.p.inv.wood).toBe(1);expect(f.p.inv.stone).toBe(2);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
