import {afterEach,expect,it} from 'vitest';
import {cartPrerequisiteScene,finishPrerequisite,selectPrerequisite} from './helpers/tool_prerequisite';
import {generateOptions} from '../src/sim/decision';
import {reviewIntentions} from '../src/sim/intent';
import {demandsOf} from '../src/sim/production';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport,ledgerCreate} from '../src/sim/economy';
import {setWorkshopTools,workshopToolOptions} from '../src/sim/options_work';
import {parseIntervention} from '../scripts/lab/lab';
import {observe} from '../src/sim/knowledge';
import {addPerson,done,pin} from './helpers/kit';
import {setExternalController} from '../src/sim/external';
import {mintTool} from '../src/sim/tools';
import {toolReport} from '../src/sim/toolreg';
import {relOf} from '../src/sim/relations';
import {perceive} from '../src/sim/perception';
afterEach(()=>{setWorkshopTools(true);setExternalController(null);});
it('connects an actual missing workshop hammer to the existing material/tool plan, preserving rules 56',()=>{
 for(const version of [56,57]){
  const {w,p}=cartPrerequisiteScene(version),before=serializeWorld(w),ctx=generateOptions(w,p,true,true);
  expect(demandsOf(ctx).some(d=>d.item==='cart')).toBe(true);expect(ctx.toolWanted?.kind).toBe('hammer');expect(serializeWorld(w)).toBe(before);
  reviewIntentions(generateOptions(w,p,true));
  expect(p.intentions.some(i=>i.kind==='tool'&&i.makes==='hammer')).toBe(version>=57);
 }
});

it('uses real gathering, hammer crafting, cart construction and an offered useful haul; mid-craft continuation is exact',()=>{
 const {w,p,home,tree,rock,target,stock}=cartPrerequisiteScene();
 finishPrerequisite(w,p,`gather:${tree.id}`);
 // The existing site-material offer fills available room with wood. Deliver its unreserved
 // share physically before fetching stone; the tool plan keeps its own one wood in the pack.
 finishPrerequisite(w,p,`haul:${target.id}`);expect(p.inv.wood).toBe(1);
 finishPrerequisite(w,p,`gather:${rock.id}`);
 expect(p.inv.wood).toBeGreaterThanOrEqual(1);expect(p.inv.stone).toBeGreaterThanOrEqual(2);
 const {act,restore}=selectPrerequisite(w,p,'craft:hammer');for(let i=0;i<8;i++)stepWorld(w);
 const copy=deserializeWorld(serializeWorld(w));
 for(let i=0;i<1500&&p.activity?.id===act.id;i++){stepWorld(w);stepWorld(copy);}
 expect(p.inv.hammer).toBe(1);expect(serializeWorld(w)).toBe(serializeWorld(copy));pin(p);restore();
 const cart=generateOptions(w,p,true,true).options.find(o=>o.kind==='operate'&&o.label.toLowerCase().includes('handcart'));
 expect(cart).toBeDefined();finishPrerequisite(w,p,cart!.key);expect(w.carts).toHaveLength(1);
 // It is night and the maker is thirsty/tired after real gathering and construction.
 // Meet those needs through actual offered activities before expecting heavy transport.
 finishPrerequisite(w,p,'drink:inv');finishPrerequisite(w,p,`sleep:${home.id}`);
 const eat=generateOptions(w,p,true,true).options.find(o=>o.kind==='eat');if(eat)finishPrerequisite(w,p,eat.key);
 const haul=generateOptions(w,p,true,true).options.find(o=>o.key===`cart:${w.carts[0].id}:${target.id}`);
 expect(haul,JSON.stringify({tick:w.tick,needs:p.needs,carts:w.carts,known:p.beliefs[w.carts[0].id],options:generateOptions(w,p,true,true).options.map(o=>o.key),blocked:generateOptions(w,p,true,true).blocked})).toBeDefined();const before=stock.store.items.stone??0;finishPrerequisite(w,p,haul!.key);
 expect(target.delivered.stone).toBeGreaterThan(4);expect(stock.store.items.stone??0).toBeLessThan(before);
 expect(conservationReport(w).ok).toBe(true);
});

it('does not invent materials or tools and keeps the borrowing alternative when the connection is removed',()=>{
 const f=cartPrerequisiteScene();const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
 expect(ctx.options.some(o=>o.key==='craft:hammer')).toBe(false);expect(serializeWorld(f.w)).toBe(before);
 const restore=parseIntervention('rich-no-workshop-tools').install!();
 reviewIntentions(generateOptions(f.w,f.p,true));expect(f.p.intentions.some(i=>i.kind==='tool'&&i.makes==='hammer')).toBe(false);
 expect(generateOptions(f.w,f.p,true,true).toolWanted?.kind).toBe('hammer');restore();
});

it('respects stock reservations and stops offering another hammer once one is held',()=>{
 const f=cartPrerequisiteScene();f.p.inv.wood=1;f.p.inv.stone=2;ledgerCreate(f.w,'wood',1,'staged raw input');ledgerCreate(f.w,'stone',2,'staged raw input');
 f.p.intentions.push({id:f.w.nextId++,kind:'tool',goal:'make an axe',since:f.w.tick,until:f.w.tick+3000,status:'active',reason:'staged prior undertaking',setAside:0,aboutId:0,wants:{wood:2,stone:1},makes:'axe',sheltered:0,worked:0,ended:0,step:'',stepKind:'none',stepTarget:0,stepItem:null,stepKey:null,blocked:''});
 expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key==='craft:hammer')).toBe(false);
 mintTool(f.w,'hammer',0,f.p.hhId,f.p.id,f.p.inv,f.p.id,'staged owned tool');
 expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key==='craft:hammer')).toBe(false);
 expect(conservationReport(f.w).ok).toBe(true);expect(toolReport(f.w).ok).toBe(true);
});

it('crafting and an actual visible-neighbour borrowing offer remain alternatives; ablation removes only the crafting connection',()=>{
 const f=cartPrerequisiteScene();const neighbour=addPerson(f.s,'Ben',41.5,40.5,{age:32,hunger:100,thirst:100,energy:100});
 f.p.inv.wood=1;f.p.inv.stone=2;done(f.s);mintTool(f.w,'hammer',0,neighbour.hhId,neighbour.id,neighbour.inv,neighbour.id,'staged neighbour equipment');relOf(f.p,neighbour.id).trust=50;relOf(f.p,neighbour.id).affinity=50;perceive(f.w,f.p);
 const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.key==='craft:hammer')).toBe(true);expect(ctx.options.some(o=>o.label.includes('lend a hammer'))).toBe(true);
 const restore=parseIntervention('rich-no-workshop-tools').install!(),old=generateOptions(f.w,f.p,true,true);
 expect(old.options.some(o=>o.key==='craft:hammer')).toBe(false);expect(old.options.some(o=>o.label.includes('lend a hammer'))).toBe(true);restore();
 expect(conservationReport(f.w).ok).toBe(true);expect(toolReport(f.w).ok).toBe(true);
});

it('a remembered rack tool or absence of actual cart demand does not create a new prerequisite, and repeated option derivation adds no duplicate keys',()=>{
 const f=cartPrerequisiteScene();f.p.beliefs[f.yard.id].tools=['hammer'];
 expect(generateOptions(f.w,f.p,true,true).toolWanted).toBeUndefined();
 delete f.p.beliefs[f.yard.id].tools;delete f.p.beliefs[f.target.id];f.p.bykind.site=[];
 expect(demandsOf(generateOptions(f.w,f.p,true,true)).some(d=>d.item==='cart')).toBe(false);
 expect(generateOptions(f.w,f.p,true,true).toolWanted).toBeUndefined();
 observe(f.w,f.p,f.target);const ctx=generateOptions(f.w,f.p,true,true),keys=ctx.options.map(o=>o.key);workshopToolOptions(ctx);expect(ctx.options.map(o=>o.key)).toEqual(keys);
});

it('a heavily provisioned pack cannot acquire stone after filling with wood; the prerequisite never bypasses capacity',()=>{
 const f=cartPrerequisiteScene(57,true);finishPrerequisite(f.w,f.p,`gather:${f.tree.id}`);
 expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===`gather:${f.rock.id}`)).toBe(false);
 expect(f.p.inv.hammer??0).toBe(0);expect(f.p.inv.stone??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
