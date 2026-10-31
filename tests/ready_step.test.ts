import {afterEach,expect,it} from 'vitest';
import {cartProjectScene} from './helpers/cart_project';
import {READY_STEP_BONUS,setReadyStep} from '../src/sim/ready_step';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {nextProjectStep} from '../src/sim/project_step';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,consume,ledgerSpoil} from '../src/sim/economy';
import {toolReport} from '../src/sim/toolreg';
import type {World} from '../src/sim/types';
afterEach(()=>setReadyStep(true));
const READY='everything for it is already at the timber yard';
type Scene=ReturnType<typeof cartProjectScene>;
function record(f:Scene){const events:{tick:number;kind:string;recipe?:string;outcome?:string;detail?:string;goal?:string}[]=[];f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.p.id)events.push({tick:f.w.tick,kind:a.kind,recipe:a.data.recipe as string|undefined,goal:a.goal});},onActivityEnd:(p,a,outcome,detail)=>{if(p.id===f.p.id)events.push({tick:f.w.tick,kind:a.kind,recipe:a.data.recipe as string|undefined,outcome,detail});}};return events;}
const plan=(f:Scene)=>f.p.intentions.find(i=>i.kind==='batch'&&i.makes==='cart');
const stepReason=(f:Scene)=>plan(f)?.project?.history.at(-1)?.reason??'';
const valid=(w:World)=>serializeWorld(deserializeWorld(serializeWorld(w)))===serializeWorld(w);
it('adopts, prepares, assembles and then actually uses a cart with ordinary decisions only; the continuation is exact',()=>{
 const f=cartProjectScene(),events=record(f);
 for(let n=0;n<80&&!plan(f);n++)stepWorld(f.w);expect(plan(f)?.makes).toBe('cart');
 const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<3*2400&&!f.w.carts.length;n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.w.carts,JSON.stringify({events:events.slice(-12),plan:plan(f),activity:f.p.activity})).toHaveLength(1);expect(f.w.carts[0].ownerHh).toBe(f.p.hhId);
 expect(events.filter(e=>e.recipe==='saw_planks'&&e.outcome==='success')).toHaveLength(2);expect(events.some(e=>e.recipe==='build_cart'&&e.outcome==='success')).toBe(true);
 expect(events.some(e=>e.outcome==='interrupted'&&e.recipe==='build_cart')).toBe(false);for(let n=0;n<200&&plan(f)?.status!=='done';n++){stepWorld(f.w);stepWorld(twin);}expect(plan(f)).toMatchObject({status:'done',reason:'the household has its handcart'});
 const before=f.target.delivered.stone??0;
 for(let n=0;n<1500&&!((f.target.delivered.stone??0)>before+4);n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.target.delivered.stone??0,JSON.stringify(events.slice(-8))).toBeGreaterThan(before+4);expect(events.some(e=>e.kind==='cart_haul'&&e.outcome==='success')).toBe(true);
 expect(f.w.ledger.consumed.planks).toBe(4);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(valid(f.w)).toBe(true);expect(conservationReport(f.w).ok&&toolReport(f.w).ok).toBe(true);
});
it('names the prepared step, ranks it first and leaves the full state untouched when observed',()=>{
 const f=cartProjectScene();for(let n=0;n<700&&!/operate: cart/.test(stepReason(f));n++)stepWorld(f.w);expect(stepReason(f)).toBe('operate: cart');
 expect(f.p.beliefs[f.yard.id]?.items).toMatchObject({planks:4,handles:2,wood:2});
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true),o=ctx.options.find(o=>o.key===`operate:${f.yard.id}:build_cart`)!;
 expect(o).toBeDefined();expect(o.parts).toContainEqual([READY,READY_STEP_BONUS]);expect(rankOptions(ctx)[0]?.key).toBe(o.key);expect(serializeWorld(f.w)).toBe(before);
});
it.each(['legacy','ablation'])('keeps the unprepared reading and the same-workshop collect step under %s',mode=>{
 if(mode==='ablation')setReadyStep(false);const f=cartProjectScene(mode==='legacy'?98:99);
 for(let n=0;n<700&&!/collect: planks/.test(stepReason(f));n++)stepWorld(f.w);expect(stepReason(f)).toBe('collect: planks');
 const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.parts.some(p=>p[0]===READY))).toBe(false);
 for(let n=0;n<2400;n++)stepWorld(f.w);expect(f.w.carts).toHaveLength(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('a same-workshop output already on the shelf is stock: the remaining quantity is made, never collected and redeposited',()=>{
 const f=cartProjectScene(),events=record(f);for(let n=0;n<700&&!f.w.carts.length;n++)stepWorld(f.w);
 expect(plan(f)?.project?.history.map(h=>h.reason)).toEqual(['operate: planks','operate: cart']);
 expect(events.some(e=>e.kind==='withdraw'||e.kind==='deposit')).toBe(false);
});
it('components lost after the step was prepared yield no cart; the shelf is re-read and nothing is invented',()=>{
 const f=cartProjectScene();for(let n=0;n<700&&(f.yard.store.items.planks??0)<4;n++)stepWorld(f.w);expect(f.yard.store.items.planks).toBe(4);expect(f.p.activity?.data.recipe).not.toBe('build_cart');
 const ctx0=generateOptions(f.w,f.p,true,true);expect(ctx0.options.find(o=>o.key===`operate:${f.yard.id}:build_cart`)?.parts).toContainEqual([READY,READY_STEP_BONUS]);
 consume(f.w,f.yard.store.items,'planks',4,'declared loss of the sawn planks');ledgerSpoil(f.w,'wood',f.tree.amount,'declared loss of the known tree');f.tree.amount=0;f.tree.regrowTimer=0;
 for(let n=0;n<900;n++)stepWorld(f.w);
 // at most one more real batch is possible (two shelf wood plus one carried); never four planks, never a cart
 expect(f.w.carts).toHaveLength(0);expect(f.w.ledger.created.planks).toBeLessThanOrEqual(6);expect(f.yard.store.items.planks??0).toBeLessThan(4);
 expect(f.p.beliefs[f.yard.id]?.items?.planks??0).toBe(f.yard.store.items.planks??0);expect(f.p.beliefs[f.yard.id]!.seen).toBeGreaterThan(0);
 const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.find(o=>o.key===`operate:${f.yard.id}:build_cart`)?.parts.some(p=>p[0]===READY)??false).toBe(false);
 expect(conservationReport(f.w).ok).toBe(true);
});
it('an assembly under way survives a save and finishes in both continuations',()=>{
 const f=cartProjectScene();for(let n=0;n<900&&!(f.p.activity?.data.recipe==='build_cart'&&f.p.activity.phase==='work'&&f.p.activity.progress>20);n++)stepWorld(f.w);
 expect(f.p.activity?.data.recipe).toBe('build_cart');const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<400&&!f.w.carts.length;n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.w.carts).toHaveLength(1);expect(twin.carts).toHaveLength(1);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
