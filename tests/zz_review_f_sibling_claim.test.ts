// REVIEW (agent F): a sibling plan's claim on the same raw kind makes a batch plan read its own carried hand-tool inputs as gone.
//
// project_step.ts projectAvailable = inv - reservedFor + ownWants, and reserved_goods.ts reservedFor sums EVERY active plan's wants
// (plannedFor) without the adoption order that intent.ts shareOf gives the pack. Rules 50 lets a hand-tool plan be adopted beside a
// batch, and every hand tool wants wood (and usually stone), so a cart plan at its hammer step (wants wood 1, stone 2) plus a later
// basket/axe/pick/saw/spear/repair plan wanting wood sees wood: 1 - (1 + 3) + 1 = -2 -> 0. The hammer's 'present' wood node then
// answers "the supplies previously counted on are no longer available", the graph is reconsidered, and the person goes to acquire
// wood they are holding. The staged rules-115 contracts never adopt a second plan beside the batch, so they do not meet this.
import {expect,it} from 'vitest';
import {projectInputsScene} from './helpers/project_inputs';
import {generateOptions} from '../src/sim/decision';
import {nextProjectStep} from '../src/sim/project_step';
import {reviewIntentions} from '../src/sim/intent';
import {serializeWorld} from '../src/app/save';
import type {Intention} from '../src/sim/types';

function withSibling(wants:Intention['wants']){
 const f=projectInputsScene(),{w,p,plan}=f;
 const before=nextProjectStep(generateOptions(w,p,true,true),plan.project!,plan);
 // a younger tool plan (adopted after the batch, so by shareOf it has only what the batch leaves), as adoptProject would make it
 const sibling:Intention={id:w.nextId++,kind:'tool',goal:'make a basket',since:w.tick,until:w.tick+4800,status:'active',reason:'it would make the work easier, and the makings are short',setAside:0,aboutId:0,wants,makes:'basket',sheltered:0,worked:0,ended:0,step:'get 2 more wood for the basket',stepKind:'get',stepTarget:0,stepItem:'wood',stepKey:null,blocked:''};
 p.intentions.push(sibling);
 const snapshot=serializeWorld(w),ctx=generateOptions(w,p,true,true),after=nextProjectStep(ctx,plan.project!,plan);
 expect(serializeWorld(w)).toBe(snapshot);
 return {w,p,plan,sibling,before:`${before.phase}:${before.node.item}`,after:`${after.phase}:${after.node.item}`,reason:after.reason,inv:{...p.inv},wants:{...plan.wants}};
}
it('baseline: with the hammer inputs in hand the batch step is craft',()=>{
 const f=projectInputsScene(),s=nextProjectStep(generateOptions(f.w,f.p,true,true),f.plan.project!,f.plan);
 expect(`${s.phase}:${s.node.item}`).toBe('craft:hammer');expect(f.plan.wants).toEqual({wood:1,stone:2});expect(f.p.inv.wood).toBe(1);expect(f.p.inv.stone).toBe(2);
});
it('DOCUMENTED DEFECT at HEAD: a younger tool plan wanting wood turns the ready hammer step into "supplies no longer available" although the wood is still in the pack',()=>{
 const r=withSibling({wood:3});
 expect(r.before).toBe('craft:hammer');
 expect(r.inv.wood).toBe(1);expect(r.wants).toEqual({wood:1,stone:2});
 expect(r.after,JSON.stringify(r)).toBe('blocked:wood');
 expect(r.reason).toBe('the supplies previously counted on are no longer available');
});
it('DOCUMENTED DEFECT at HEAD: the review then reconsiders the graph and sends her to acquire wood she is holding',()=>{
 const {w,p,plan}=withSibling({wood:3});
 reviewIntentions(generateOptions(w,p,true,true));
 expect(plan.project!.history.map(h=>h.reason),JSON.stringify(plan.project!.history)).toContain('Replanned after the supplies previously counted on are no longer available');
 expect(plan.step).toBe('acquire wood for cart');expect(p.inv.wood).toBe(1);
});
it('a sibling plan wanting only stone the batch does not hold leaves the hammer step alone (the collision is per raw kind)',()=>{
 const r=withSibling({stone:0,wood:0});
 expect(r.after).toBe('craft:hammer');
});
it.fails('CONTRACT (flip to `it` once projectAvailable honours adoption order, e.g. shareOf, instead of netting every plan): the older batch keeps first call on its carried wood',()=>{
 const r=withSibling({wood:3});
 expect(r.after).toBe('craft:hammer');
});
