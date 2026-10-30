// Adapted from c4ba75b's diagnosed required/convenience conflict; this lineage reserves rules 59 for cart order.
import {afterEach,expect,it} from 'vitest';
import {toolPrecedenceScene} from './helpers/tool_precedence';
import {generateOptions} from '../src/sim/decision';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {parseIntervention} from '../scripts/lab/lab';
import {setToolPrecedence} from '../src/sim/production';
import {setExternalController} from '../src/sim/external';
import {addPerson,building,done,pin} from './helpers/kit';
import {breakTool,mintTool,toolOf} from '../src/sim/tools';
import {relOf} from '../src/sim/relations';
import {perceive} from '../src/sim/perception';
import {delBelief,observe} from '../src/sim/knowledge';
import {conservationReport} from '../src/sim/economy';
import {toolReport} from '../src/sim/toolreg';
import {finishPrerequisite,selectPrerequisite} from './helpers/tool_prerequisite';
import {stepWorld} from '../src/sim/world';
import {batchRecipeScene} from './helpers/batch_recipe';
afterEach(()=>{setToolPrecedence(true);setExternalController(null);});
it('a required hammer displaces a convenience saw, while rules 63 keeps its original choice',()=>{
 for(const version of [63,64]){
  const f=toolPrecedenceScene(version),before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
  expect(ctx.blocked.some(o=>o.label==='Sawing planks'&&o.blocked?.includes('needs a saw'))).toBe(true);
  expect(ctx.blocked.some(o=>o.label==='Building a handcart'&&o.blocked?.includes('needs a hammer'))).toBe(true);
  expect(ctx.toolWanted?.kind).toBe(version===64?'hammer':'saw');
  expect(ctx.toolWanted?.required).toBe(version===64?true:undefined);
  expect(serializeWorld(f.w)).toBe(before);
 }
});

it('the isolated removal restores the first tool on the same world and person',()=>{
 const f=toolPrecedenceScene(),before=serializeWorld(f.w),undo=parseIntervention('rich-no-tool-precedence').install!();
 try{expect(generateOptions(f.w,f.p,true,true).toolWanted).toEqual({kind:'saw',for:'sawing planks'});}
 finally{undo();}
 expect(generateOptions(f.w,f.p,true,true).toolWanted?.kind).toBe('hammer');
 expect(serializeWorld(f.w)).toBe(before);
});

it('connects the required tool to both legal crafting and visible-neighbour borrowing, without losing reservations',()=>{
 const f=toolPrecedenceScene(),q=addPerson(f.s,'Ben',41.5,40.5,{age:32,hunger:100,thirst:100,energy:100});
 f.p.inv.wood=1;f.p.inv.stone=2;done(f.s);
 mintTool(f.w,'hammer',0,q.hhId,q.id,q.inv,q.id,'staged neighbour equipment');
 mintTool(f.w,'saw',0,q.hhId,q.id,q.inv,q.id,'staged neighbour equipment');
 relOf(f.p,q.id).trust=50;relOf(f.p,q.id).affinity=50;perceive(f.w,f.p);
 const ctx=generateOptions(f.w,f.p,true,true);
 expect(ctx.options.some(o=>o.key==='craft:hammer')).toBe(true);
 expect(ctx.options.some(o=>o.label.includes('lend a hammer'))).toBe(true);
 expect(ctx.options.some(o=>o.key==='craft:saw'||o.label.includes('lend a saw'))).toBe(false);
 f.p.intentions.push({id:f.w.nextId++,kind:'tool',goal:'make an axe',since:f.w.tick,until:f.w.tick+3000,status:'active',reason:'staged prior undertaking',setAside:0,aboutId:0,wants:{wood:2,stone:1},makes:'axe',sheltered:0,worked:0,ended:0,step:'',stepKind:'none',stepTarget:0,stepItem:null,stepKey:null,blocked:''});
 expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key==='craft:hammer')).toBe(false);
 expect(conservationReport(f.w).ok&&toolReport(f.w).ok).toBe(true);
});

it('a physically present remembered rack hammer enables the cart and leaves only the optional saw wanted',()=>{
 const f=toolPrecedenceScene();mintTool(f.w,'hammer',0,0,f.yard.id,f.yard.store.items,0,'staged rack equipment');observe(f.w,f.p,f.yard);
 const ctx=generateOptions(f.w,f.p,true,true);
 expect(ctx.toolWanted).toEqual({kind:'saw',for:'sawing planks',required:false});
 expect(ctx.options.some(o=>o.key===`operate:${f.yard.id}:build_cart`)).toBe(true);
 expect(ctx.options.some(o=>o.key==='craft:hammer')).toBe(false);
 expect(conservationReport(f.w).ok&&toolReport(f.w).ok).toBe(true);
});

it('quarry work remains possible without a pick, including when no loose-rock source is known',()=>{
 for(const knowsRock of [true,false]){
  const f=toolPrecedenceScene(),quarry=building(f.s,'quarry',45,52);observe(f.w,f.p,quarry);
  delBelief(f.p,f.stock.id);if(!knowsRock)delBelief(f.p,f.rock.id);
  const ctx=generateOptions(f.w,f.p,true,true);
  expect(ctx.blocked.some(o=>o.blocked?.includes('needs a pickaxe'))).toBe(false);
  expect(ctx.options.some(o=>o.key===`operate:${quarry.id}:quarry_stone`)).toBe(true);
  expect(ctx.options.some(o=>o.kind==='gather'&&o.yields==='stone')).toBe(knowsRock);
  expect(ctx.toolWanted?.kind).toBe('hammer');
  expect(ctx.toolWanted?.required).toBe(true);
 }
});

it('a paid sawing batch still requires its lost saw even though fresh planks could be hewn',()=>{
 const f=batchRecipeScene(64),{act,restore}=selectPrerequisite(f.w,f.p,`operate:${f.yard.id}:saw_planks`);
 try{
  for(let n=0;n<500&&act.phase==='travel';n++)stepWorld(f.w);for(let n=0;n<4;n++)stepWorld(f.w);
  const job=f.yard.ops!.job!,progress=job.progress,held={...job.held};
  breakTool(f.w,toolOf(f.w,f.p,'saw')!,'staged required-tool loss');stepWorld(f.w);
  const ctx=generateOptions(f.w,f.p,true,true);
  expect(ctx.toolWanted).toEqual({kind:'saw',for:'finishing sawing planks',required:true});
  expect(ctx.options.some(o=>o.key===`operate:${f.yard.id}:hew_planks`)).toBe(false);
  expect(job.progress).toBe(progress);expect(job.held).toEqual(held);expect(conservationReport(f.w).ok).toBe(true);
 }finally{restore();}
});

it('physically gathers, crafts the required hammer, builds a cart and uses it; mid-craft continuation is exact',()=>{
 const {w,p,home,tree,rock,yard,target,stock}=toolPrecedenceScene();
 finishPrerequisite(w,p,`gather:${tree.id}`);
 expect(p.inv.wood).toBe(1);finishPrerequisite(w,p,`gather:${rock.id}`);
 const {act,restore}=selectPrerequisite(w,p,'craft:hammer');
 try{
  expect(act.goal).toBe('to begin building a handcart');
  for(let i=0;i<8;i++)stepWorld(w);const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<1500&&p.activity?.id===act.id;i++){stepWorld(w);stepWorld(copy);}
  expect(p.inv.hammer).toBe(1);expect(serializeWorld(w)).toBe(serializeWorld(copy));pin(p);
 }finally{restore();}
 finishPrerequisite(w,p,`operate:${yard.id}:build_cart`);expect(w.carts).toHaveLength(1);
 finishPrerequisite(w,p,`sleep:${home.id}`);
 if(generateOptions(w,p,true,true).options.some(o=>o.key==='drink:inv'))finishPrerequisite(w,p,'drink:inv');
 const eat=generateOptions(w,p,true,true).options.find(o=>o.kind==='eat');if(eat)finishPrerequisite(w,p,eat.key);
 const before=stock.store.items.stone??0;finishPrerequisite(w,p,`cart:${w.carts[0].id}:${target.id}`);
 expect(target.delivered.stone).toBeGreaterThan(4);expect(stock.store.items.stone??0).toBeLessThan(before);
 expect(conservationReport(w).ok&&toolReport(w).ok).toBe(true);
});

it('does not invent a tool when its inputs and remembered sources are absent',()=>{
 const f=toolPrecedenceScene();for(const id of [f.tree.id,f.rock.id,f.stock.id])delBelief(f.p,id);
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
 expect(ctx.toolWanted?.kind).toBe('hammer');expect(ctx.options.some(o=>o.key==='craft:hammer')).toBe(false);
 expect(ctx.options.some(o=>o.kind==='gather'&&o.tag==='craft')).toBe(false);
 expect(f.p.inv.hammer??0).toBe(0);expect(serializeWorld(f.w)).toBe(before);
 expect(conservationReport(f.w).ok).toBe(true);
});
