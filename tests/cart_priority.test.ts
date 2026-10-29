import {afterEach,expect,it} from 'vitest';
import {cartPrerequisiteScene,finishPrerequisite,selectPrerequisite} from './helpers/tool_prerequisite';
import {give,pin} from './helpers/kit';
import {generateOptions} from '../src/sim/decision';
import {demandsOf} from '../src/sim/production';
import {batchWanted} from '../src/sim/batch_plan';
import {reviewIntentions} from '../src/sim/intent';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {setCartFirst,orderBatchWants} from '../src/sim/cart_priority';
import {setExternalController} from '../src/sim/external';
import {parseIntervention} from '../scripts/lab/lab';
import {CART_COST} from '../src/sim/constants';
import {observe} from '../src/sim/knowledge';
import {ledgerCreate} from '../src/sim/economy';
import {wantedTool} from '../src/sim/options_work';
afterEach(()=>{setCartFirst(true);setExternalController(null);});

/** The diagnosed situation: a hammer in hand, the yard holding the cart's makings, and a known site short of planks as well as stone. */
function scene(version:number){
 const f=cartPrerequisiteScene(version);
 f.target.required.planks=6;observe(f.w,f.p,f.target);
 give(f.w,f.p,'hammer');ledgerCreate(f.w,'hammer',1,'test equipment');pin(f.p);
 // a hand tool she would otherwise take on first (the project slot is one) is staged as already held
 for(let i=0;i<8;i++){const t=wantedTool(generateOptions(f.w,f.p,true,true));if(!t)break;give(f.w,f.p,t);ledgerCreate(f.w,t,1,'test equipment');pin(f.p);}
 f.w.sceneLabel='TEST SCENE: a hammer-holder wants a cart for a site that also wants planks; the yard holds the cart\'s makings';
 return f;
}

it('takes the wanted cart on before the site planks at rules 59, and the planks at 58; the planner is pure',()=>{
 for(const version of [58,59]){
  const f=scene(version),before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
  const d=demandsOf(ctx);
  expect(d.some(x=>x.item==='cart')).toBe(true);expect(d.some(x=>x.item==='planks'&&x.tag==='site')).toBe(true);
  expect(d.find(x=>x.item==='planks')!.base).toBeGreaterThan(d.find(x=>x.item==='cart')!.base);
  const want=batchWanted(ctx);
  expect(want?.item).toBe(version>=59?'cart':'planks');
  if(version>=59)expect(want?.recipe).toBe('build_cart');
  expect(serializeWorld(f.w)).toBe(before);
 }
});

it('keeps the planks first without the hammer, and leaves a promise ahead of the site materials ahead of the cart',()=>{
 const f=cartPrerequisiteScene(59);f.target.required.planks=6;observe(f.w,f.p,f.target);pin(f.p);
 const ctx=generateOptions(f.w,f.p,true,true);
 expect(demandsOf(ctx).some(x=>x.item==='cart')).toBe(true);
 expect(batchWanted(ctx)?.item).toBe('planks');
 const wants=orderBatchWants(f.w,[{item:'planks',qty:6,have:0,base:38,why:'for the storehouse',tag:'site'},{item:'bricks',qty:2,have:0,base:50,why:'to keep my promise to bring it',tag:'promise'},{item:'cart',qty:1,have:0,base:14,why:'to haul heavy loads',tag:'craft'}]);
 expect(wants.map(w=>w.item)).toEqual(['cart','planks','bricks']);
 const ordered=orderBatchWants(f.w,[{item:'bricks',qty:2,have:0,base:50,why:'to keep my promise to bring it',tag:'promise'},{item:'planks',qty:6,have:0,base:38,why:'for the storehouse',tag:'site'},{item:'cart',qty:1,have:0,base:14,why:'to haul heavy loads',tag:'craft'}]);
 expect(ordered.map(w=>w.item)).toEqual(['bricks','cart','planks']);
});

it('adopts the cart batch, builds the handcart through the plan\'s own step and ends the plan with the cart; mid-build continuation is exact',()=>{
 const f=scene(59);
 reviewIntentions(generateOptions(f.w,f.p,true));
 const plan=f.p.intentions.find(i=>i.kind==='batch'&&i.makes==='cart');
 expect(plan,JSON.stringify(f.p.intentions)).toBeDefined();
 expect(plan!.status).toBe('active');expect(plan!.recipe).toBe('build_cart');expect(plan!.stepKey).toBe(`operate:${f.yard.id}:build_cart`);
 const {act,restore}=selectPrerequisite(f.w,f.p,plan!.stepKey!);
 for(let i=0;i<8;i++)stepWorld(f.w);
 const copy=deserializeWorld(serializeWorld(f.w));
 try{for(let i=0;i<3000&&f.p.activity?.id===act.id;i++){stepWorld(f.w);stepWorld(copy);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 }finally{restore();pin(f.p);}
 expect(f.w.carts).toHaveLength(1);expect(f.w.carts[0].ownerHh).toBe(f.p.hhId);
 for(const k of Object.keys(CART_COST) as (keyof typeof CART_COST)[])expect(f.yard.store.items[k]??0).toBe(0);
 reviewIntentions(generateOptions(f.w,f.p,true));
 const ended=f.p.intentions.find(i=>i.id===plan!.id)!;
 expect(ended.status).toBe('done');expect(ended.reason).toBe('the household has its handcart');
 expect(demandsOf(generateOptions(f.w,f.p,true,true)).some(d=>d.item==='cart')).toBe(false);
 expect(conservationReport(f.w).ok).toBe(true);
});

it('restores the rules-58 order under the lab switch and changes nothing below 59',()=>{
 const f=scene(59);
 const undo=parseIntervention('rich-no-cart-first').install!();
 try{expect(batchWanted(generateOptions(f.w,f.p,true,true))?.item).toBe('planks');}finally{undo();}
 expect(batchWanted(generateOptions(f.w,f.p,true,true))?.item).toBe('cart');
 const old=scene(58);
 expect(batchWanted(generateOptions(old.w,old.p,true,true))?.item).toBe('planks');
 reviewIntentions(generateOptions(old.w,old.p,true));
 expect(old.p.intentions.some(i=>i.makes==='cart')).toBe(false);
});

it('still makes the components first when the yard is bare, in the plan\'s own words',()=>{
 const f=scene(59);
 for(const k of Object.keys(CART_COST) as (keyof typeof CART_COST)[]){f.w.ledger.reasons['-staged away']=(f.w.ledger.reasons['-staged away']??0)+(f.yard.store.items[k]??0);delete f.yard.store.items[k];}
 observe(f.w,f.p,f.yard);pin(f.p);
 reviewIntentions(generateOptions(f.w,f.p,true));
 const plan=f.p.intentions.find(i=>i.kind==='batch'&&i.makes==='cart');
 expect(plan,JSON.stringify(f.p.intentions)).toBeDefined();
 expect(plan!.step).toMatch(/wood|planks|handles/);
 finishPrerequisite(f.w,f.p,`gather:${f.tree.id}`);
 expect(f.p.intentions.find(i=>i.id===plan!.id)!.status).toBe('active');
});
