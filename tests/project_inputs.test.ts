import {expect,it} from 'vitest';
import {projectInputsScene} from './helpers/project_inputs';
import {freeOf,reviewIntentions} from '../src/sim/intent';
import {generateOptions} from '../src/sim/decision';
it('retains the current hammer inputs on cart adoption instead of offering them to a different site',()=>{
 const {w,p,plan,target}=projectInputsScene();expect(plan.wants).toEqual({wood:1,stone:2});expect(freeOf(p,'stone')).toBe(0);expect(freeOf(p,'wood')).toBe(0);
 expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='haul'&&o.targetId===target.id)).toBe(false);
});
it('retains the other hand-tool input while acquiring missing stone',()=>{
 const {w,p,plan}=projectInputsScene(undefined,1);expect(plan.stepKind).toBe('get');expect(plan.stepItem).toBe('stone');reviewIntentions(generateOptions(w,p,true,true));expect(plan.wants).toEqual({wood:1,stone:2});expect(freeOf(p,'wood')).toBe(0);
});
import {afterEach} from 'vitest';
import {setProjectHandInputs} from '../src/sim/project_hand_inputs';
import {settleIntentions} from '../src/sim/intent';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {nextProjectStep} from '../src/sim/project_step';
import {addPerson,done} from './helpers/kit';
import {killPerson} from '../src/sim/lifecycle';
afterEach(()=>setProjectHandInputs(true));
it.each(['old','removed'] as const)('preserves unclaimed hand inputs under %s behaviour',mode=>{
 if(mode==='removed')setProjectHandInputs(false);const {w,p,plan,target}=projectInputsScene(mode==='old'?114:undefined);
 expect(plan.wants).toEqual({});expect(freeOf(p,'stone')).toBe(2);expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='haul'&&o.targetId===target.id)).toBe(true);
});
it('does not reserve workshop stock or future recipe inputs and inspection remains pure',()=>{
 const {w,p,plan,yard}=projectInputsScene(),before=serializeWorld(w),ctx=generateOptions(w,p,true,true);
 expect(nextProjectStep(ctx,plan.project!,plan).phase).toBe('craft');expect(plan.wants).toEqual({wood:1,stone:2});expect(plan.wants.planks).toBeUndefined();expect(plan.wants.handles).toBeUndefined();expect(yard.store.items.planks).toBe(4);expect(w.reservations.size).toBe(0);
 expect(serializeWorld(w)).toBe(before);expect(serializeWorld(deserializeWorld(before))).toBe(before);
});
it('an earlier delivery promise still makes its stone unavailable to the hand-tool step',()=>{
 const f=projectInputsScene(),{w,p,plan}=f,other=addPerson(f.s,'Ada',41,41,{age:35});done(f.s);
 p.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:other.id,item:'stone',amount:1,siteId:0,made:w.tick,deadline:w.tick+1000,status:'active',delivered:0,grace:0});
 const before=serializeWorld(w),ctx=generateOptions(w,p,true,true);expect(ctx.options.some(o=>o.key==='craft:hammer')).toBe(false);expect(nextProjectStep(ctx,plan.project!,plan).phase).not.toBe('craft');expect(serializeWorld(w)).toBe(before);
});
it('releases the allocation on the original deadline with no goods changed',()=>{
 const {w,p,plan}=projectInputsScene(),inv=JSON.stringify(p.inv),ledger=JSON.stringify(w.ledger);w.tick=plan.until+1;settleIntentions(w,p);
 expect(plan.status).toBe('dropped');expect(plan.wants).toEqual({});expect(freeOf(p,'stone')).toBe(2);expect(JSON.stringify(p.inv)).toBe(inv);expect(JSON.stringify(w.ledger)).toBe(ledger);
});
it('death ends the personal claim while its real goods remain accounted for',()=>{
 const {w,p,plan}=projectInputsScene();killPerson(w,p,'staged death');expect(plan.status).not.toBe('active');expect(plan.wants).toEqual({});expect(conservationReport(w).ok).toBe(true);
});
it('crafts through the physical handler, saves mid-work, pays inputs once and releases them for the next step',()=>{
 const {w,p,plan}=projectInputsScene(),option=generateOptions(w,p,true,true).options.find(o=>o.key==='craft:hammer');expect(option).toBeDefined();startActivity(w,p,option!.make!()!);
 for(let n=0;n<150&&!(p.activity?.kind==='craft'&&p.activity.progress>0);n++)stepWorld(w);expect(p.activity?.kind).toBe('craft');expect(p.activity!.progress).toBeGreaterThan(0);
 const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<300&&!(p.inv.hammer??0);n++){stepWorld(w);stepWorld(copy);}
 expect(p.inv.hammer).toBe(1);expect(w.ledger.reasons['-crafting: hammer']).toBe(3);expect(conservationReport(w).ok).toBe(true);expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
 reviewIntentions(generateOptions(w,p,true,true));expect(plan.wants.stone??0).toBe(0);expect(plan.wants.wood??0).toBe(0);
});

import {cartProjectScene} from './helpers/cart_project';
import {proposeProject} from '../src/sim/proposals';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
it('leaves the adoption history of non-hand workshop steps unchanged',()=>{
 const {w,p}=cartProjectScene(CURRENT_RULES_VERSION),r=proposeProject(generateOptions(w,p,true,true),{item:'planks',quantity:4,tier:0});expect(r.ok).toBe(true);if(!r.ok)throw new Error(r.reason);
 expect(r.plan.project!.history).toEqual([]);expect(r.plan.wants).toEqual({});
});
it('autonomous adoption does not create a second tool claim for the same active project prerequisite',()=>{
 const {w,p}=projectInputsScene();stepWorld(w);expect(p.intentions.filter(i=>i.status==='active'&&i.kind==='tool'&&i.makes==='hammer')).toHaveLength(0);
 for(let n=0;n<250&&!(p.inv.hammer??0);n++)stepWorld(w);expect(p.inv.hammer).toBe(1);expect(w.ledger.reasons['-crafting: hammer']).toBe(3);expect(conservationReport(w).ok).toBe(true);
});
