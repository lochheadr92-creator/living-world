import {expect,it} from 'vitest';
import {addPerson,building,done,give,stage} from './helpers/kit';
import {observe,delBelief} from '../src/sim/knowledge';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
import {compileProject} from '../src/sim/project_compile';
import {PROJECT_LIMITS,projectGraphError} from '../src/sim/project_graph';
import type {ProjectGraph} from '../src/sim/project_graph';

function scene(){
 const s=stage('project-prerequisites');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=68;
 const p=addPerson(s,'Ada',40,40,{age:35,inv:{bread:3,water:2},hunger:95,thirst:95,energy:95});
 const kiln=building(s,'kiln',44,43,0,{wood:12});
 const smithy=building(s,'smithy',48,43,0,{ore:6});
 const yard=building(s,'timber_yard',44,48,0,{handles:2});
 give(s.w,p,'hammer');done(s);
 p.techniques={charcoal:{source:'initial',learned:0,teacher:0},smelting:{source:'initial',learned:0,teacher:0},forging:{source:'initial',learned:0,teacher:0}};
 for(const b of [kiln,smithy,yard])observe(s.w,p,b);
 return {w:s.w,p,kiln,smithy,yard};
}
function graph():ProjectGraph{
 const f=scene(),r=compileProject(generateOptions(f.w,f.p,true,true),{item:'axe',quantity:1,tier:1});
 if(!r.ok)throw new Error(r.reason);return r.graph;
}
it('compiles a personal charcoal → iron → forged-tool prerequisite tree without changing world state',()=>{
 const f=scene(),before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
 const r=compileProject(ctx,{item:'axe',quantity:1,tier:1});expect(r.ok,r.ok?'':r.reason).toBe(true);
 if(!r.ok)return;
 expect(r.graph.nodes.some(n=>n.recipe==='forge_axe'&&n.place===f.smithy.id)).toBe(true);
 expect(r.graph.nodes.some(n=>n.recipe==='smelt_iron'&&n.place===f.smithy.id)).toBe(true);
 expect(r.graph.nodes.some(n=>n.recipe==='burn_charcoal'&&n.place===f.kiln.id)).toBe(true);
 expect(r.graph.nodes.find(n=>n.item==='handles')?.method).toBe('supply');
 expect(r.graph.nodes[0].estimatedTicks).toBeGreaterThan(500);
 expect(r.searched).toBeLessThanOrEqual(PROJECT_LIMITS.search);
 expect(projectGraphError(r.graph)).toBeNull();expect(serializeWorld(f.w)).toBe(before);
 expect(compileProject(ctx,{item:'axe',quantity:1,tier:1})).toEqual(r);
});
it.each(['unheard kiln','unknown procedure','unavailable input'] as const)('rejects a production goal with %s',why=>{
 const f=scene();if(why==='unheard kiln')delBelief(f.p,f.kiln.id);
 if(why==='unknown procedure')delete f.p.techniques!.forging;
 if(why==='unavailable input')f.p.beliefs[f.smithy.id].items!.ore=0;
 const before=serializeWorld(f.w),r=compileProject(generateOptions(f.w,f.p,true,true),{item:'axe',quantity:1,tier:1});
 expect(r.ok).toBe(false);if(!r.ok)expect(r.reason.length).toBeGreaterThan(0);expect(serializeWorld(f.w)).toBe(before);
});
it('does not learn an unseen workshop or its stock through compilation',()=>{
 const f=scene();delBelief(f.p,f.kiln.id);
 const before=compileProject(generateOptions(f.w,f.p,true,true),{item:'axe',quantity:1,tier:1});
 f.kiln.store.items.charcoal=100; // unobserved diagnostic world difference; no execution or conservation claim
 expect(compileProject(generateOptions(f.w,f.p,true,true),{item:'axe',quantity:1,tier:1})).toEqual(before);
});
it('reuses known finished inputs instead of prescribing their production again',()=>{
 const f=scene();f.p.beliefs[f.smithy.id].items!.iron=1;f.p.beliefs[f.smithy.id].items!.charcoal=1;
 const r=compileProject(generateOptions(f.w,f.p,true,true),{item:'axe',quantity:1,tier:1});expect(r.ok).toBe(true);
 if(r.ok)expect(r.graph.nodes.some(n=>n.recipe==='smelt_iron'||n.recipe==='burn_charcoal')).toBe(false);
});
it.each(['cycle','unreachable','unknown prerequisite','size','depth','bad quantity','bad recipe','progress'] as const)('rejects %s graph data before persistence',why=>{
 const g=graph();
 if(why==='cycle')g.nodes[0].dependencies.push(g.root);
 if(why==='unreachable')g.nodes.push({...g.nodes.at(-1)!,id:g.nodes.length+1,dependencies:[]});
 if(why==='unknown prerequisite')g.nodes[0].dependencies.push(9999);
 if(why==='size')while(g.nodes.length<=PROJECT_LIMITS.nodes)g.nodes.push({...g.nodes[0],id:g.nodes.length+1});
 if(why==='depth'){
  g.nodes=Array.from({length:8},(_,n)=>({...g.nodes[0],id:n+1,dependencies:n<7?[n+2]:[]}));
 }
 if(why==='bad quantity')g.goal.quantity=Infinity;
 if(why==='bad recipe')g.nodes[0].recipe='run arbitrary code';
 if(why==='progress')g.retries=PROJECT_LIMITS.retries+1;
 expect(projectGraphError(g)).not.toBeNull();
});
