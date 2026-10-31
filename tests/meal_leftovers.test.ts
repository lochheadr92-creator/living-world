import {expect,it} from 'vitest';
import {leftoverScene} from './helpers/meal_leftovers';
import {cancelMeal,inviteAsk} from '../src/sim/meals';
import {conservationReport,transfer,weightOf} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observe} from '../src/sim/knowledge';
import {startActivity,newActivity,endActivity,stepActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {observeInhabitant} from '../src/agent/observe';
import {makeHousePile} from '../src/sim/buildings';
import {addPerson} from './helpers/kit';
import {killPerson} from '../src/sim/lifecycle';
import {parseIntervention} from '../scripts/lab/lab';
import {mealPileBlocker} from '../src/sim/meal_leftovers';
function offer(f:ReturnType<typeof leftoverScene>){
 f.host.cooldowns.pause=0;const ctx=generateOptions(f.w,f.host,true,true);
 return ctx.options.find(o=>o.kind==='withdraw'&&o.tag==='meal');
}
function pending(f:ReturnType<typeof leftoverScene>){
 cancelMeal(f.w,f.meal,'declared interruption');
 const pile=f.w.piles.find(p=>p.mealFood?.mealId===f.meal.id)!;observe(f.w,f.host,pile);return pile;
}
it('leaves ended table food at its actual site instead of returning it to a distant host',()=>{
 const f=leftoverScene();f.host.x=10;f.host.y=10;
 cancelMeal(f.w,f.meal,'declared host departure');
 expect(f.host.inv.bread).toBe(2);expect(f.meal.table).toEqual({});
 const pile=f.w.piles.find(p=>p.mealFood?.mealId===f.meal.id)!;
 expect(pile).toBeTruthy();expect(pile.items.bread).toBe(4);
 expect(pile.mealFood).toMatchObject({hostId:f.host.id,hhId:f.host.hhId});
 expect(Math.hypot(pile.x-f.meal.x,pile.y-f.meal.y)).toBeLessThan(5);
 expect(conservationReport(f.w).ok).toBe(true);
});
it('does not fill or overfill even a present host; collecting leftovers requires an actual action',()=>{
 const f=leftoverScene();transfer(f.w,f.hall.store.items,f.host.inv,12,'stone',3,'building:'+f.hall.id,'person:'+f.host.id,'declared staged load');
 expect(weightOf(f.host.inv)).toBe(11);cancelMeal(f.w,f.meal,'declared interruption');
 expect(weightOf(f.host.inv)).toBe(11);expect(f.host.inv.bread).toBe(2);
 expect(conservationReport(f.w).ok).toBe(true);
});
it('preserves the historical rules-89 table return exactly',()=>{
 const f=leftoverScene(89);f.host.x=10;cancelMeal(f.w,f.meal,'declared interruption');
 expect(f.host.inv.bread).toBe(6);expect(f.w.piles).toHaveLength(0);
 expect(conservationReport(f.w).ok).toBe(true);
});
it('offers only remembered owned food and physically collects it after travel and paid handling, with exact saved continuation',()=>{
 const f=leftoverScene();cancelMeal(f.w,f.meal,'declared interruption');const pile=f.w.piles[0];
 expect(offer(f)).toBeUndefined();observe(f.w,f.host,pile);f.host.x=35.5;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const o=offer(f)!;expect(o).toBeTruthy();const a=o.make!()!;startActivity(f.w,f.host,a);
  stepWorld(f.w);expect(a.phase).toBe('travel');expect(f.host.inv.bread).toBe(2);
  let twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<500&&a.phase==='travel';n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(a.phase).toBe('work');
  expect(a.duration).toBe(9);expect(f.host.inv.bread).toBe(2);
  twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<100&&f.host.activity;n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(a.cycle).toBe(4);expect(f.host.inv.bread).toBe(6);
  expect(pile.items.bread??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
  f.host.needs.hunger=10;const eat=generateOptions(f.w,f.host,true,true).options.find(o=>o.kind==='eat')!;
  expect(eat).toBeTruthy();startActivity(f.w,f.host,eat.make!()!);
  for(let n=0;n<100&&f.host.activity;n++)stepWorld(f.w);
  expect(f.host.needs.hunger).toBeGreaterThan(80);expect(f.w.ledger.consumed.bread).toBeGreaterThan(2);
  expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it('lays a real table through the offered host action, serves both diners and retains the uneaten extra once',()=>{
 const f=leftoverScene(90,false);f.w.tick=f.meal.at-40;f.host.cooldowns.pause=0;f.guest.cooldowns.pause=0;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  for(const p of [f.host,f.guest]){const ctx=generateOptions(f.w,p,true,true),o=ctx.options.find(o=>o.key===`${p===f.host?'host_meal':'attend_meal'}:${f.meal.id}`);expect(o).toBeTruthy();startActivity(f.w,p,o!.make!()!);}
  let laid=false;for(let n=0;n<1600&&f.meal.status!=='done'&&f.meal.status!=='cancelled';n++){stepWorld(f.w);if((f.meal.table.bread??0)>0)laid=true;}
  expect(laid).toBe(true);expect(f.meal.status).toBe('done');expect(f.meal.ate).toEqual(expect.arrayContaining([f.host.id,f.guest.id]));
  expect(f.w.piles.filter(p=>p.mealFood?.mealId===f.meal.id)).toHaveLength(1);
  expect(f.w.piles.find(p=>p.mealFood?.mealId===f.meal.id)!.items.bread).toBe(1);expect(f.host.inv.bread).toBe(3);
  cancelMeal(f.w,f.meal,'must not repeat');expect(f.w.piles.filter(p=>p.mealFood?.mealId===f.meal.id)).toHaveLength(1);
  expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it('limits a nearly full pack to one leftover and leaves the remaining food owned at the site',()=>{
 const f=leftoverScene();const pile=pending(f);
 transfer(f.w,f.hall.store.items,f.host.inv,12,'stone',3,'building:'+f.hall.id,'person:'+f.host.id,'declared staged load');
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{const a=offer(f)!.make!()!;expect(a.data.items).toEqual({bread:1});startActivity(f.w,f.host,a);
  for(let n=0;n<200&&f.host.activity;n++)stepWorld(f.w);
  expect(weightOf(f.host.inv)).toBe(12);expect(pile.items.bread).toBe(3);expect(a.cycle).toBe(1);
  expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it.each(['new household','food gone','interrupted'] as const)('revalidates a chosen collection after departure: %s',cause=>{
 const f=leftoverScene(),pile=pending(f);f.host.x=35.5;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{const a=offer(f)!.make!()!;startActivity(f.w,f.host,a);stepWorld(f.w);
  if(cause==='new household')f.host.hhId=f.guest.hhId;
  if(cause==='food gone')transfer(f.w,pile.items,f.guest.inv,12,'bread',4,'pile:'+pile.id,'person:'+f.guest.id,'declared staged prior removal');
  if(cause==='interrupted')endActivity(f.w,f.host,'interrupted','declared need break');
  for(let n=0;n<300&&f.host.activity;n++)stepWorld(f.w);
  expect(a.cycle).toBe(0);expect(f.host.inv.bread).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it('protects ownership in known food options and forced execution, including full-pack eating at the pile',()=>{
 const f=leftoverScene(),pile=pending(f);f.guest.needs.hunger=30;observe(f.w,f.guest,pile);f.guest.cooldowns.pause=0;
 expect(generateOptions(f.w,f.guest,true,true).options.some(o=>o.targetId===pile.id)).toBe(false);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{for(const kind of ['withdraw','eat_store'] as const){
   const a=newActivity(f.w,f.guest,{kind,label:'declared forbidden attempt',goal:'test execution boundary',targetId:pile.id,targetType:'pile',tx:pile.x+.5,ty:pile.y+.5,spotX:pile.x+.5,spotY:pile.y+.5,utility:100,data:{items:{bread:4},table:true,food:'bread'}});
   startActivity(f.w,f.guest,a);for(let n=0;n<200&&f.guest.activity;n++)stepWorld(f.w);
   expect(a.cycle).toBe(0);expect(pile.items.bread).toBe(4);
  }
  expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it.each(['withdraw','eat_store'] as const)('refuses a forged nearby-work %s target when the owner is physically distant or in a different interior',kind=>{
 const f=leftoverScene(),pile=pending(f);f.host.x=10;f.host.y=10;
 const remembered=JSON.stringify(f.host.beliefs[pile.id]);f.w.tick+=10;
 const a=newActivity(f.w,f.host,{kind,label:'declared remote attempt',goal:'test actual contact',targetId:pile.id,targetType:'pile',tx:pile.x+.5,ty:pile.y+.5,spotX:10,spotY:10,utility:100,data:{items:{bread:4},...(kind==='eat_store'?{table:true,food:'bread'}:{})}});
 startActivity(f.w,f.host,a);stepActivity(f.w,f.host);expect(f.host.activity).toBeNull();expect(f.host.inv.bread).toBe(2);
 expect(JSON.stringify(f.host.beliefs[pile.id])).toBe(remembered);
 f.host.x=pile.x+.5;f.host.y=pile.y+.5;f.host.indoors=f.hall.id;
 expect(mealPileBlocker(f.host,pile)).toMatch(/outdoors/);delete f.host.indoors;
 expect(conservationReport(f.w).ok).toBe(true);
});
it('rechecks ownership before each bite eaten from the actual pile with a full pack',()=>{
 const f=leftoverScene(),pile=pending(f);
 transfer(f.w,f.hall.store.items,f.host.inv,12,'stone',3,'building:'+f.hall.id,'person:'+f.host.id,'declared staged load');
 transfer(f.w,pile.items,f.host.inv,12,'bread',1,'pile:'+pile.id,'person:'+f.host.id,'declared local portion');
 expect(weightOf(f.host.inv)).toBe(12);f.host.needs.hunger=10;f.host.cooldowns.pause=0;observe(f.w,f.host,pile);
 const o=generateOptions(f.w,f.host,true,true).options.find(o=>o.kind==='eat_store'&&o.targetId===pile.id)!;expect(o).toBeTruthy();
 const a=o.make!()!;startActivity(f.w,f.host,a);for(let n=0;n<100&&a.phase==='travel';n++)stepActivity(f.w,f.host);
 expect(a.data.table).toBe(true);expect(pile.items.bread).toBe(3);
 f.host.hhId=f.guest.hhId;stepActivity(f.w,f.host);
 expect(f.host.activity).toBeNull();expect(pile.items.bread).toBe(3);expect(conservationReport(f.w).ok).toBe(true);
});
it('keeps household custody after the host dies and never merges meals or unowned salvage into it',()=>{
 const f=leftoverScene();const heir=addPerson(f,'Heir',46,45,{hh:f.host.hhId});
 killPerson(f.w,f.host,'declared staged loss');cancelMeal(f.w,f.meal,'the host died');
 const pile=f.w.piles.find(p=>p.mealFood?.mealId===f.meal.id)!;
 expect(pile.mealFood?.hhId).toBe(heir.hhId);expect(pile.items.bread).toBe(4);
 const publicPile=makeHousePile(f.w,pile.x,pile.y,{stone:1},'declared separate public salvage')!;
 publicPile.items={};transfer(f.w,f.hall.store.items,publicPile.items,99,'stone',1,'building:'+f.hall.id,'pile:'+publicPile.id,'declared separate salvage transfer');
 expect(publicPile.id).not.toBe(pile.id);expect(pile.items.stone).toBeUndefined();
 observe(f.w,heir,pile);expect(heir.beliefs[pile.id].hh).toBe(heir.hhId);
 expect(conservationReport(f.w).ok).toBe(true);
});
it('does not evict live table inventory when the bounded meal history is full',()=>{
 const f=leftoverScene();for(let n=1;n<60;n++)f.w.meals.push({...f.meal,id:f.w.nextId++,table:{}});
 const plan={placeId:f.hall.id,placeName:'the communal hall',x:43.5,y:45.4};
 expect(inviteAsk(f.w,f.host,f.guest,{mealPlan:plan})).toBe(0);expect(f.w.meals).toHaveLength(60);
 expect(f.w.meals[0].table.bread).toBe(4);expect(conservationReport(f.w).ok).toBe(true);
 f.w.meals[5].status='done';expect(inviteAsk(f.w,f.host,f.guest,{mealPlan:plan})).toBeGreaterThan(0);
 expect(f.w.meals).toHaveLength(60);expect(f.w.meals[0].table.bread).toBe(4);
});
it('keeps saved ownership and observer/AI purity, rejects invalid provenance and supports the isolated lab removal',()=>{
 const f=leftoverScene(),pile=pending(f),before=serializeWorld(f.w);
 describeEntity(f.w,pile.id);describePerson(f.w,f.host.id);const ctx=generateOptions(f.w,f.host,true,true);observeInhabitant(f.w,f.host,ctx,rankOptions(ctx));
 expect(serializeWorld(f.w)).toBe(before);expect(deserializeWorld(before).piles[0].mealFood).toEqual(pile.mealFood);
 pile.mealFood!.hhId=-1;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/leftover ownership/);
 const undo=parseIntervention('rich-no-meal-leftovers').install!();
 try{const old=leftoverScene();cancelMeal(old.w,old.meal,'declared interruption');expect(old.host.inv.bread).toBe(6);expect(old.w.piles).toHaveLength(0);}finally{undo();}
});
