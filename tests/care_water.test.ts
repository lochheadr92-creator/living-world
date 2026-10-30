import {afterEach,expect,it} from 'vitest';
import {careWaterScene} from './helpers/care_water';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {weightOf,conservationReport,produce,consume} from '../src/sim/economy';
import {CARE_WATER_FAILURE,CARE_BOTH_FAILURE,CARE_PACK_MEMORY,setCareWater,careWaterAvailable} from '../src/sim/care_capacity';
import {observeInhabitant} from '../src/agent/observe';
import {delBelief,observe} from '../src/sim/knowledge';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {abortActivity} from '../src/sim/activities';
import {parseIntervention} from '../scripts/lab/lab';
import {leaveHome,doorPoint} from '../src/sim/habitation';
afterEach(()=>setCareWater(true));
it('turns actual water capacity failure into autonomous physical home provision and later drinking',()=>{
 const f=careWaterScene(),load=weightOf(f.elder.inv);f.failGift();
 expect(generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===f.key)?.kind).toBe('deposit');
 expect(f.elder.cooldowns.fedUntil??0).toBeLessThanOrEqual(f.w.tick);
 const events:any[]=[];f.w.hooks={onActivityStart:(p,a)=>events.push({who:p.id,kind:a.kind,stored:a.data.fromStore}),onTransfer:t=>events.push({...t})};
 f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;stepWorld(f.w);
 expect(f.helper.activity?.data.careWaterStore).toBe(true);
 const copy=deserializeWorld(serializeWorld(f.w)),thirst=f.elder.needs.thirst;
 for(let n=0;n<1000&&f.elder.needs.thirst<thirst+5;n++){stepWorld(f.w);stepWorld(copy);}
 expect(events.some(e=>e.reason==='deposit'&&e.item==='water'&&e.n>0)).toBe(true);
 expect(events.some(e=>e.who===f.elder.id&&e.kind==='drink'&&e.stored)).toBe(true);
 expect(f.elder.needs.thirst).toBeGreaterThan(thirst+5);expect(f.elder.inv.water??0).toBe(0);expect(weightOf(f.elder.inv)).toBe(load);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
it('retains personal failure and pure legal AI offers through a save',()=>{
 const f=careWaterScene();expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key===f.key)).toBe(false);
 f.failGift();expect(f.helper.failures[f.elder.id]?.reason).toBe(CARE_WATER_FAILURE);
 expect(f.elder.failures[f.helper.id]).toBeUndefined();
 const saved=serializeWorld(f.w),copy=deserializeWorld(saved),p=copy.persons.find(p=>p.id===f.helper.id)!;
 const ctx=generateOptions(copy,p,true,true),obs=observeInhabitant(copy,p,ctx,rankOptions(ctx));
 expect(obs.options.some(o=>o.key===f.key&&o.selectionReason?.includes('pack was full'))).toBe(true);
 expect(serializeWorld(copy)).toBe(saved);
 delete p.failures[f.elder.id];expect(generateOptions(copy,p,true,true).options.some(o=>o.key===f.key)).toBe(false);
});
it.each(['old','disabled'] as const)('preserves actual failure without water recovery when %s',why=>{
 const undo=why==='disabled'?parseIntervention('rich-no-water-care').install!():()=>{};
 try{const f=careWaterScene(why==='old'?67:68);f.failGift();
  expect(f.helper.failures[f.elder.id]).toBeUndefined();
  expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key===f.key)).toBe(false);
 }finally{undo();}
});
it.each(['unknown','full','stocked','promised','urgent','expired'] as const)('does not provision water when %s',why=>{
 const f=careWaterScene();f.failGift();
 if(why==='unknown')delBelief(f.helper,f.home.id);
 if(why==='full'){produce(f.w,f.home.store.items,f.home.store.cap,'seeds',1000,'staged full store');observe(f.w,f.helper,f.home);}
 if(why==='stocked'){produce(f.w,f.home.store.items,f.home.store.cap,'water',1,'staged prior provision');observe(f.w,f.helper,f.home);}
 if(why==='promised')f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.elder.id,item:'water',amount:2,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});
 if(why==='urgent')f.helper.needs.thirst=20;
 if(why==='expired')f.helper.failures[f.elder.id].tick=f.w.tick-CARE_PACK_MEMORY;
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true);
 expect(ctx.options.some(o=>o.key===f.key)).toBe(false);expect(serializeWorld(f.w)).toBe(before);
 if(why==='expired')expect(ctx.options.some(o=>o.key===`give:${f.elder.id}`)).toBe(true);
 expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['full','owner','promised','interrupt','lost water'] as const)('revalidates %s during water deposit with saved continuation and no false relief',why=>{
 const f=careWaterScene();f.failGift();const selected=selectPrerequisite(f.w,f.helper,f.key);selected.restore();
 if(why==='full')produce(f.w,f.home.store.items,f.home.store.cap,'seeds',1000,'staged competing storage');
 if(why==='owner')f.home.hhId=999;
 if(why==='promised')f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.elder.id,item:'water',amount:3,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});
 if(why==='interrupt')abortActivity(f.w,f.helper,'staged interruption');
 if(why==='lost water')consume(f.w,f.helper.inv,'water',3,'staged loss');
 setCareWater(false);const copy=deserializeWorld(serializeWorld(f.w)),held=f.helper.inv.water??0,thirst=f.elder.needs.thirst;
 for(let n=0;n<300&&f.helper.activity?.id===selected.act.id;n++){stepWorld(f.w);stepWorld(copy);}
 expect(f.helper.lastResult?.outcome).toBe(why==='interrupt'?'interrupted':'failed');
 expect(f.helper.inv.water??0).toBe(held);expect(f.home.store.items.water??0).toBe(0);expect(f.elder.needs.thirst).toBeLessThanOrEqual(thirst);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
it('preserves both food and water recovery after a mixed failed hand-over and scores water only from thirst',()=>{
 const scores:number[]=[];
 for(const hunger of [20,1]){
  const f=careWaterScene();f.elder.needs.hunger=hunger;f.failGift();
  expect(f.helper.failures[f.elder.id]?.reason).toBe(CARE_BOTH_FAILURE);
  const ctx=generateOptions(f.w,f.helper,true,true);
  expect(ctx.options.some(o=>o.key===`care_store:${f.home.id}:${f.elder.id}`)).toBe(true);
  expect(ctx.options.some(o=>o.key===`give:${f.elder.id}`)).toBe(false);
  scores.push(ctx.options.find(o=>o.key===f.key)!.util);
 }
 expect(scores[0]).toBe(scores[1]);
});
it('retains a personal drink and promised water instead of promising the same supply twice',()=>{
 const f=careWaterScene();expect(careWaterAvailable(f.w,f.helper,f.elder.id)).toBe(2);
 f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.elder.id,item:'water',amount:1,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});
 expect(careWaterAvailable(f.w,f.helper,f.elder.id)).toBe(1);
});
it('does not learn recipient capacity when the donor lost the offered water',()=>{
 const f=careWaterScene(),selected=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);selected.restore();
 consume(f.w,f.helper.inv,'water',3,'staged loss');
 for(let n=0;n<100&&f.helper.activity?.id===selected.act.id;n++)stepWorld(f.w);
 expect(f.helper.failures[f.elder.id]).toBeUndefined();expect(conservationReport(f.w).ok).toBe(true);
});
it('offers water provision after a real departure using the remembered indoor contact',()=>{
 const f=careWaterScene();f.failGift();expect(leaveHome(f.w,f.helper)).toBeNull();
 // Leisure stays beside this home; exploration is a legal offered journey outwards.
 const departure=selectPrerequisite(f.w,f.helper,'explore');
 try{for(let n=0;n<100;n++)stepWorld(f.w);}finally{departure.restore();}
 abortActivity(f.w,f.helper,'staged exploration departure completed');
 const door=doorPoint(f.home);expect(Math.hypot(f.helper.x-door.x,f.helper.y-door.y)).toBeGreaterThan(3);
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true);
 expect(ctx.seenPersons.some(p=>p.id===f.elder.id)).toBe(false);
 expect(ctx.options.find(o=>o.key===f.key)?.kind).toBe('deposit');expect(serializeWorld(f.w)).toBe(before);
 const chosen=selectPrerequisite(f.w,f.helper,f.key);chosen.restore();const copy=deserializeWorld(serializeWorld(f.w));
 // Contact may suspend the trip for a conversation; follow the actual resumed delivery.
 for(let n=0;n<1000&&chosen.act.cycle<1;n++){stepWorld(f.w);stepWorld(copy);}
 expect(f.helper.lastResult?.outcome,JSON.stringify({current:f.helper.activity,result:f.helper.lastResult,chosen:chosen.act,needs:f.helper.needs})).toBe('success');expect(chosen.act.cycle).toBe(1);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
