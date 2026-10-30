// Rules 59 (production.ts noteToolWanted): the tool the planner says is lacking is the one without which the wanted thing cannot be
// made at all, not merely the first one found. Staged from the rules-57 cart scene with a site that also wants planks: sawing
// planks lacks a saw (a convenience: hewing needs no tool), building the cart lacks a hammer (required: no other recipe).
import {afterEach,expect,it} from 'vitest';
import {cartPrerequisiteScene} from './helpers/tool_prerequisite';
import {generateOptions} from '../src/sim/decision';
import {demandsOf,setToolPrecedence} from '../src/sim/production';
import {serializeWorld} from '../src/app/save';
import {observe} from '../src/sim/knowledge';
import {addPerson,done} from './helpers/kit';
import {mintTool} from '../src/sim/tools';
import {toolReport} from '../src/sim/toolreg';
import {conservationReport} from '../src/sim/economy';
import {relOf} from '../src/sim/relations';
import {perceive} from '../src/sim/perception';
import {parseIntervention} from '../scripts/lab/lab';
afterEach(()=>setToolPrecedence(true));
/** the rules-57 scene plus a site short of planks, so that sawing (a saw) is planned before the cart (a hammer) */
function plankAndCartScene(version:number){const f=cartPrerequisiteScene(version);f.target.required.planks=8;observe(f.w,f.p,f.target);return f;}

it('names the required hammer over the convenience saw at rules 59, and the first tool found below it',()=>{
 for(const version of [58,59]){
  const f=plankAndCartScene(version),before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
  const demands=demandsOf(ctx);expect(demands.some(d=>d.item==='planks')).toBe(true);expect(demands.some(d=>d.item==='cart')).toBe(true);
  expect(ctx.blocked.some(b=>b.label==='Sawing planks'&&/needs a saw/.test(b.blocked??''))).toBe(true);
  expect(ctx.blocked.some(b=>b.label==='Building a handcart'&&/needs a hammer/.test(b.blocked??''))).toBe(true);
  expect(ctx.blocked.some(b=>b.label==='Hewing planks'&&/needs a/.test(b.blocked??''))).toBe(false); // planks have a way without any tool (its wood is fetched first)
  if(version===59)expect(ctx.toolWanted).toEqual({kind:'hammer',for:'building a handcart',required:true});
  else expect(ctx.toolWanted).toEqual({kind:'saw',for:'sawing planks'});
  expect(serializeWorld(f.w)).toBe(before);
 }
});

it('a convenience is still recorded when nothing required is lacking, and nothing is recorded with the hammer on the rack',()=>{
 const f=plankAndCartScene(59);
 mintTool(f.w,'hammer',0,f.p.hhId,f.p.id,f.p.inv,f.p.id,'staged owned tool');
 expect(generateOptions(f.w,f.p,true,true).toolWanted).toEqual({kind:'saw',for:'sawing planks',required:false});
 delete f.p.inv.hammer;f.w.tools.length=0;f.p.beliefs[f.yard.id].tools=['hammer'];
 expect(generateOptions(f.w,f.p,true,true).toolWanted).toEqual({kind:'saw',for:'sawing planks',required:false});
});

it('the rules-57 crafting pass and the borrowing ask follow the required tool',()=>{
 const f=plankAndCartScene(59);const neighbour=addPerson(f.s,'Ben',41.5,40.5,{age:32,hunger:100,thirst:100,energy:100});
 f.p.inv.wood=1;f.p.inv.stone=2;done(f.s);
 mintTool(f.w,'hammer',0,neighbour.hhId,neighbour.id,neighbour.inv,neighbour.id,'staged neighbour equipment');
 mintTool(f.w,'saw',0,neighbour.hhId,neighbour.id,neighbour.inv,neighbour.id,'staged neighbour equipment');
 relOf(f.p,neighbour.id).trust=50;relOf(f.p,neighbour.id).affinity=50;perceive(f.w,f.p);
 const ctx=generateOptions(f.w,f.p,true,true);
 expect(ctx.options.some(o=>o.key==='craft:hammer')).toBe(true);expect(ctx.options.some(o=>o.key==='craft:saw')).toBe(false);
 expect(ctx.options.some(o=>o.label==='Ask Ben to lend a hammer')).toBe(true);expect(ctx.options.some(o=>o.label==='Ask Ben to lend a saw')).toBe(false);
 expect(conservationReport(f.w).ok).toBe(true);expect(toolReport(f.w).ok).toBe(true);
});

it('the lab switch restores the first tool found at rules 59 and changes nothing below it',()=>{
 const restore=parseIntervention('rich-no-tool-precedence').install!();
 try{
  expect(generateOptions(plankAndCartScene(59).w,plankAndCartScene(59).p,true,true).toolWanted).toEqual({kind:'saw',for:'sawing planks'});
  const f=plankAndCartScene(59);expect(generateOptions(f.w,f.p,true,true).toolWanted).toEqual({kind:'saw',for:'sawing planks'});
  const g=plankAndCartScene(58);expect(generateOptions(g.w,g.p,true,true).toolWanted).toEqual({kind:'saw',for:'sawing planks'});
 }finally{restore();}
 const h=plankAndCartScene(58);expect(generateOptions(h.w,h.p,true,true).toolWanted).toEqual({kind:'saw',for:'sawing planks'});
});

it('a raw material never makes its quarry tool required: stone can be gathered by hand',()=>{
 const f=cartPrerequisiteScene(59);
 // the site wants 40 stone; a known quarry would plan cutting it with a pick, but rocks are known and breakable by hand
 const ctx=generateOptions(f.w,f.p,true,true);
 expect(ctx.options.some(o=>o.key===`gather:${f.rock.id}`)).toBe(true);
 expect(ctx.toolWanted?.kind).toBe('hammer');
});
