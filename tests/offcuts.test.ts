import {expect,it} from 'vitest';
import {offcutScene,selectOffcutOption} from './helpers/offcuts';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {observe} from '../src/sim/knowledge';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {observeInhabitant} from '../src/agent/observe';
import {consume,produce} from '../src/sim/economy';
import {destroyBuilding} from '../src/sim/buildings';
import {endActivity,suspendActivity,resumeSuspended} from '../src/sim/activities';
import {parseIntervention} from '../scripts/lab/lab';
import {mintTool} from '../src/sim/tools';
import {startJob,workJob,finishJob,usableUnits} from '../src/sim/facilities';
import {RECIPE_BY_ID} from '../src/sim/recipes';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {addPerson} from './helpers/kit';
function finish(f:ReturnType<typeof offcutScene>){
 expect(startJob(f.w,f.yard,f.p,RECIPE_BY_ID.hew_planks,f.p.id,'planks for a real home')).toBeNull();
 for(let i=0;i<400&&f.yard.ops?.job;i++)workJob(f.w,f.yard,f.p);
 expect(f.yard.ops?.job).toBeNull();
}
it('turns only newly paid recoverable wood into owned fuel once, with an explicit remaining sink',()=>{
 const f=offcutScene();finish(f);
 expect(f.yard.store.items).toMatchObject({planks:1,offcuts:2});
 expect(f.yard.ops!.wasted['chips and bark hewn away']).toBe(1);
 expect(usableUnits(f.w,f.yard,f.p,'offcuts')).toBe(2);
 const other=addPerson(f,'Other',30,40);expect(usableUnits(f.w,f.yard,other,'offcuts')).toBe(0);
 expect(finishJob(f.w,f.yard)).toBe(false);expect(f.yard.store.items.offcuts).toBe(2);
 expect(conservationReport(f.w).ok).toBe(true);
 expect(deserializeWorld(serializeWorld(f.w)).buildings.find(b=>b.id===f.yard.id)!.store.items.offcuts).toBe(2);
});
it('retains paid inputs if the product and recoverable fuel cannot both fit',()=>{
 const f=offcutScene();expect(startJob(f.w,f.yard,f.p,RECIPE_BY_ID.hew_planks,f.p.id,'planks')).toBeNull();
 f.yard.store.cap=3;
  for(let i=0;i<400&&f.yard.ops!.job?.phase==='work';i++)workJob(f.w,f.yard,f.p);
 expect(f.yard.ops!.job).toMatchObject({phase:'ready',held:{wood:3}});
 expect(f.yard.store.items.offcuts??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
 f.yard.store.cap=4;expect(finishJob(f.w,f.yard)).toBe(true);
 expect(f.yard.store.items.offcuts).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
});
it('does not resurrect old waste or change the rules-88 timber outcome',()=>{
 const f=offcutScene(88);finish(f);expect(f.yard.store.items.offcuts).toBeUndefined();
 expect(f.yard.ops!.wasted['chips and bark hewn away']).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
});
it('physically makes, collects and burns offered offcuts, preserving mid-work/travel saves and later warmth',()=>{
 const f=offcutScene(),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const a=selectOffcutOption(f,`operate:${f.yard.id}:hew_planks`);
  for(let n=0;n<800&&a.phase==='travel';n++)stepWorld(f.w);
  for(let n=0;n<5;n++)stepWorld(f.w);
  expect(f.yard.ops!.job!.held.wood).toBe(3);
  let twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<500&&f.p.activity;n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(f.yard.store.items.offcuts).toBe(2);
  observe(f.w,f.p,f.yard);observe(f.w,f.p,f.fire);
  const take=selectOffcutOption(f,`collect:${f.yard.id}:offcuts`);stepWorld(f.w);
  twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<500&&f.p.activity;n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(take.cycle).toBe(2);expect(f.p.inv.offcuts).toBe(2);
  const before=serializeWorld(f.w);describeEntity(f.w,f.yard.id);describePerson(f.w,f.p.id);const ctx=generateOptions(f.w,f.p,true,true);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));
  expect(serializeWorld(f.w)).toBe(before);
  const fuel=selectOffcutOption(f,`fuel:${f.fire.id}`);expect(fuel.data.fuelItem).toBe('offcuts');
  for(let n=0;n<500&&f.p.activity;n++)stepWorld(f.w);
  expect(fuel.cycle).toBe(2);expect(f.p.inv.offcuts??0).toBe(0);expect(f.fire.fuel).toBeGreaterThan(300);
  expect(f.w.ledger.consumed.offcuts).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
  f.p.needs.warmth=30;observe(f.w,f.p,f.fire);
  const warm=generateOptions(f.w,f.p,true,true).options.find(o=>o.kind==='warm'&&o.targetId===f.fire.id);
  expect(warm).toBeTruthy();
  selectOffcutOption(f,warm!.key);const start=f.p.needs.warmth;
  for(let n=0;n<40;n++)stepWorld(f.w);expect(f.p.needs.warmth).toBeGreaterThan(start);
 }finally{release();}
});
it.each(['lost stock','changed owner','full pack','interrupted'] as const)('rechecks physical collection: %s',cause=>{
 const f=offcutScene();finish(f);observe(f.w,f.p,f.yard);f.p.x=34.5;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const a=selectOffcutOption(f,`collect:${f.yard.id}:offcuts`);stepWorld(f.w);
  if(cause==='lost stock')consume(f.w,f.yard.store.items,'offcuts',2,'staged local stock loss after departure');
  if(cause==='changed owner'){const q=addPerson(f,'New owner',10,20);f.yard.hhId=q.hhId;}
  if(cause==='full pack')produce(f.w,f.p.inv,12,'stone',4,'declared staged pack fill after departure');
  if(cause==='interrupted'){endActivity(f.w,f.p,'interrupted','staged interruption before collection');}
  for(let n=0;n<500&&f.p.activity;n++)stepWorld(f.w);
  expect(f.p.inv.offcuts??0).toBe(0);expect(a.cycle).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
  expect(deserializeWorld(serializeWorld(f.w)).persons.find(p=>p.id===f.p.id)!.inv.offcuts??0).toBe(0);
 }finally{release();}
});
it('resumes interrupted paid work without paying or recovering twice, then preserves real goods through collapse',()=>{
 const f=offcutScene(),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const a=selectOffcutOption(f,`operate:${f.yard.id}:hew_planks`);
  for(let n=0;n<500&&a.phase==='travel';n++)stepWorld(f.w);stepWorld(f.w);
  const progress=f.yard.ops!.job!.progress;suspendActivity(f.w,f.p);
  const twin=deserializeWorld(serializeWorld(f.w));expect(resumeSuspended(f.w,f.p)).toBe(true);expect(resumeSuspended(twin,twin.persons.find(p=>p.id===f.p.id)!)).toBe(true);
  expect(f.yard.ops!.job!.progress).toBe(progress);
  for(let n=0;n<500&&f.p.activity;n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(f.yard.ops!.batches).toBe(1);
  destroyBuilding(f.w,f.yard,'staged collapse after actual production');
  expect(f.w.piles.reduce((n,p)=>n+(p.items.offcuts??0),0)).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
  expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
 }finally{release();}
});
it('validates new material provenance and preserves the isolated legacy-waste removal',()=>{
 const f=offcutScene();finish(f);const data=serializeWorld(f.w);
 f.w.settings.rulesVersion=88;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/offcut/i);
 const g=deserializeWorld(data);g.persons[0].inv.offcuts=-1;expect(()=>deserializeWorld(serializeWorld(g))).toThrow(/offcut/i);
 const undo=parseIntervention('rich-no-offcuts').install!();try{const old=offcutScene();finish(old);expect(old.yard.store.items.offcuts).toBeUndefined();expect(old.yard.ops!.wasted['chips and bark hewn away']).toBe(2);}finally{undo();}
});
it('sawing recovers one lighter fuel bundle and keeps half a wood unit irrecoverably spent',()=>{
 const f=offcutScene();mintTool(f.w,'saw',0,f.p.hhId,f.p.id,f.p.inv,f.p.id,'declared staged saw');
 expect(startJob(f.w,f.yard,f.p,RECIPE_BY_ID.saw_planks,f.p.id,'paid sawn boards')).toBeNull();
 for(let i=0;i<400&&f.yard.ops?.job;i++)workJob(f.w,f.yard,f.p);
 expect(f.yard.store.items).toMatchObject({planks:2,offcuts:1});expect(f.yard.ops!.wasted['sawdust and offcuts']).toBe(0.5);expect(conservationReport(f.w).ok).toBe(true);
});
it('does not offer an unseen by-product and retains unburned bundles after a partial saved fire action',()=>{
 const f=offcutScene();finish(f);
 expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===`collect:${f.yard.id}:offcuts`)).toBe(false);
 observe(f.w,f.p,f.yard);const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  selectOffcutOption(f,`collect:${f.yard.id}:offcuts`);for(let n=0;n<500&&f.p.activity;n++)stepWorld(f.w);
  const a=selectOffcutOption(f,`fuel:${f.fire.id}`);for(let n=0;n<500&&a.cycle<1;n++)stepWorld(f.w);
  expect(f.p.inv.offcuts).toBe(1);expect(f.w.ledger.consumed.offcuts).toBe(1);
  const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<20;n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(f.w.ledger.consumed.offcuts).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
