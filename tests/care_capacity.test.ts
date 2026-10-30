import {afterEach,expect,it} from 'vitest';
import {careCapacityScene} from './helpers/care_capacity';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,weightOf,produce,consume} from '../src/sim/economy';
import {CARE_PACK_FAILURE,CARE_PACK_MEMORY,setCareCapacity} from '../src/sim/care_capacity';
import {parseIntervention} from '../scripts/lab/lab';
import {delBelief,observe} from '../src/sim/knowledge';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {describePerson} from '../src/sim/inspect';
import {abortActivity} from '../src/sim/activities';
import {observeInhabitant} from '../src/agent/observe';
afterEach(()=>setCareCapacity(true));

it('learns a real full-pack failure, chooses a known home deposit and lets the elder eat without adding carrying space',()=>{
 const f=careCapacityScene(),load=weightOf(f.elder.inv);f.failGift();
 const ctx=generateOptions(f.w,f.helper,true,true),o=ctx.options.find(o=>o.key===`care_store:${f.home.id}:${f.elder.id}`);
 expect(o?.kind).toBe('deposit');
 expect(ctx.options.some(o=>o.key===`give:${f.elder.id}`)).toBe(false);
 const events:any[]=[];f.w.hooks={onActivityStart:(p,a)=>events.push({tick:f.w.tick,person:p.id,kind:a.kind,careStore:!!a.data.careStore}),onTransfer:t=>events.push({...t,tick:f.w.tick})};
 f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;stepWorld(f.w);
 expect(f.helper.activity?.data.careStore).toBe(true);
 const copy=deserializeWorld(serializeWorld(f.w)),hunger=f.elder.needs.hunger;
 for(let n=0;n<800&&f.elder.needs.hunger<hunger+5;n++){stepWorld(f.w);stepWorld(copy);}
 expect(events.some(e=>e.reason==='deposit'&&e.item==='bread'&&e.n>0)).toBe(true);
 expect(events.some(e=>e.person===f.elder.id&&e.kind==='eat_store')).toBe(true);
 expect(f.elder.needs.hunger).toBeGreaterThan(hunger+5);
 expect(weightOf(f.elder.inv)).toBe(load);
 expect(f.elder.inv.bread??0).toBe(0);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});

it('capacity is learned from a real failed hand-over, remains personal and causes a different pure later option',()=>{
 const f=careCapacityScene();
 expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key.startsWith('care_store:'))).toBe(false);
 const control=careCapacityScene(62);control.failGift();f.failGift();
 expect(f.helper.failures[f.elder.id]?.reason).toBe(CARE_PACK_FAILURE);
 expect(f.elder.failures[f.helper.id]).toBeUndefined();expect(f.helper.relations).toEqual(control.helper.relations);
 const saved=serializeWorld(f.w),copy=deserializeWorld(saved),p=copy.persons.find(p=>p.id===f.helper.id)!;
 const ctx=generateOptions(copy,p,true,true),ranked=rankOptions(ctx);
 expect(ranked.some(o=>o.key.startsWith('care_store:'))).toBe(true);
 const obs=observeInhabitant(copy,p,ctx,ranked);
 expect(obs.options.some(o=>o.key.startsWith('care_store:')&&o.selectionReason?.includes('pack was full'))).toBe(true);
 describePerson(copy,p.id);expect(serializeWorld(copy)).toBe(saved);
 delete p.failures[f.elder.id];
 expect(generateOptions(copy,p,true,true).options.some(o=>o.key.startsWith('care_store:'))).toBe(false);
});

it('old rules and the isolated removal retain the full-pack failure without new memory or storage offers',()=>{
 for(const version of [62,63]){
  const undo=version===63?parseIntervention('rich-no-care-capacity').install!():()=>{};
  try{const f=careCapacityScene(version);f.failGift();expect(f.helper.failures[f.elder.id]).toBeUndefined();
   expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key.startsWith('care_store:'))).toBe(false);
  }finally{undo();}
 }
});

it.each(['unknown','full','already stocked','promised','urgent','expired'] as const)('does not create a care store opportunity when %s',why=>{
 const f=careCapacityScene();f.failGift();
 if(why==='unknown')delBelief(f.helper,f.home.id);
 if(why==='full'){produce(f.w,f.home.store.items,f.home.store.cap,'seeds',1000,'staged full store');observe(f.w,f.helper,f.home);}
 if(why==='already stocked'){produce(f.w,f.home.store.items,f.home.store.cap,'bread',1,'staged existing meal');observe(f.w,f.helper,f.home);}
 if(why==='promised')f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.elder.id,item:'bread',amount:3,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});
 if(why==='urgent')f.helper.needs.hunger=20;
 if(why==='expired')f.helper.failures[f.elder.id].tick=f.w.tick-CARE_PACK_MEMORY;
 const saved=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true);
 expect(ctx.options.some(o=>o.key.startsWith('care_store:'))).toBe(false);expect(serializeWorld(f.w)).toBe(saved);
 if(why==='expired')expect(ctx.options.some(o=>o.key===`give:${f.elder.id}`)).toBe(true);
 expect(conservationReport(f.w).ok).toBe(true);
});

it.each(['full','owner','promised','interrupt'] as const)('revalidates a %s change during the physical deposit without spending the food',change=>{
 const f=careCapacityScene();f.failGift();const before=f.helper.inv.bread!;
 const selected=selectPrerequisite(f.w,f.helper,`care_store:${f.home.id}:${f.elder.id}`);
 try{
  if(change==='full')produce(f.w,f.home.store.items,f.home.store.cap,'seeds',1000,'staged competing storage');
  if(change==='owner')f.home.hhId=99999;
  if(change==='promised'){f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.elder.id,item:'bread',amount:before,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});setCareCapacity(false);}
  if(change==='interrupt')abortActivity(f.w,f.helper,'staged interruption');
  const copy=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<300&&f.helper.activity?.id===selected.act.id;n++){stepWorld(f.w);stepWorld(copy);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 }finally{selected.restore();}
 expect(f.helper.inv.bread).toBe(before);expect(f.home.store.items.bread??0).toBe(0);
 expect(f.helper.lastResult?.outcome).toBe(change==='interrupt'?'interrupted':'failed');expect(conservationReport(f.w).ok).toBe(true);
});

it('does not misremember recipient capacity when the donor has lost the offered food',()=>{
 const f=careCapacityScene(),selected=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
 try{consume(f.w,f.helper.inv,'bread',3,'staged food loss');for(let n=0;n<100&&f.helper.activity?.id===selected.act.id;n++)stepWorld(f.w);}finally{selected.restore();}
 expect(f.helper.failures[f.elder.id]).toBeUndefined();expect(conservationReport(f.w).ok).toBe(true);
});
