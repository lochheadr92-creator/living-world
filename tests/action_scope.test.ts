import {afterEach,expect,it} from 'vitest';
import {actionScopeScene} from './helpers/action_scope';
import {setActionScope} from '../src/sim/action_scope';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {selectPrerequisite,finishPrerequisite} from './helpers/tool_prerequisite';
import {conservationReport,ledgerConsume,produce} from '../src/sim/economy';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {setExternalController} from '../src/sim/external';
import {createPlot} from '../src/sim/farming';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
afterEach(()=>setActionScope(true));
it('chooses a shorter productive workshop spell, retaining the paid batch and exact saved continuation',()=>{
 const f=actionScopeScene(71,true),duty=f.addDuty(240);const key=`operate:${f.yard!.id}:hew_planks`,o=generateOptions(f.w,f.p,true,true).options.find(o=>o.key===key);
 expect(o,JSON.stringify(generateOptions(f.w,f.p,true,true).options.map(o=>({key:o.key,estimate:o.scopeEstimate,bounds:o.bounds,reason:o.selectionReason})))).toBeDefined();
 expect(o!.selectionReason).toContain('work ticks');const chosen=selectPrerequisite(f.w,f.p,key);
 try{const limit=chosen.act.data.limit.ticks;expect(limit).toBeLessThan(o!.scopeEstimate!.work);const twin=deserializeWorld(serializeWorld(f.w));
  for(let t=0;t<700&&f.p.activity?.id===chosen.act.id;t++){stepWorld(f.w);stepWorld(twin);}
  expect(f.p.lastResult?.outcome).toBe('partial');expect(f.p.lastResult?.detail).toContain('work spell');expect(chosen.act.cycle).toBe(limit);expect(f.yard!.ops?.job).toBeDefined();expect(f.yard!.ops!.job!.progress).toBeGreaterThan(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
 }finally{chosen.restore();}
 const paidWood=f.yard!.store.items.wood;duty.status='cancelled'; // staged removal of the competing duty, not an automatic successful delivery
 finishPrerequisite(f.w,f.p,key);expect(f.yard!.ops?.job).toBeFalsy();expect(f.yard!.store.items.wood).toBe(paidWood);expect(f.yard!.store.items.planks).toBe(1);
 finishPrerequisite(f.w,f.p,`collect:${f.yard!.id}:planks`);finishPrerequisite(f.w,f.p,`haul:${f.target.id}`);finishPrerequisite(f.w,f.p,`build:${f.target.id}`);
 expect(f.target.used.planks).toBeGreaterThanOrEqual(1);expect(f.target.work).toBeGreaterThan(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('narrows a material trip for a personally accepted duty while preserving the same demand and pack',()=>{
 const f=actionScopeScene(),before=f.option()!;f.addDuty(240);const after=f.option()!;
 expect(before).toBeDefined();expect(after).toBeDefined();expect(after.bounds![0].max).toBeLessThan(before.bounds![0].max);expect(after.selectionReason).toContain('accepted duty');
 const raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);rankOptions(ctx);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));describePerson(f.w,f.p.id);expect(serializeWorld(f.w)).toBe(raw);
});
it('executes the engine-chosen amount through real collection and an intermediate save',()=>{
 const f=actionScopeScene();f.addDuty(240);const amount=f.option()!.bounds![0].max,chosen=selectPrerequisite(f.w,f.p,f.key);
 try{expect(chosen.act.amount).toBe(amount);const twin=deserializeWorld(serializeWorld(f.w));
  for(let t=0;t<700&&f.p.activity?.id===chosen.act.id;t++){stepWorld(f.w);stepWorld(twin);}
  expect(f.p.lastResult?.outcome).toBe('success');expect(chosen.act.cycle).toBe(amount);expect(f.p.inv.wood).toBe(amount);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
 }finally{chosen.restore();}
});
it('refuses a discretionary trip when even one complete unit cannot fit',()=>{
 const f=actionScopeScene();f.addDuty(60);const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.key===f.key)).toBe(false);expect(ctx.blocked.find(o=>o.key===f.key)?.blocked).toContain('estimated time');
});
it('ignores a duty whose destination has not been personally located',()=>{
 const f=actionScopeScene(),before=f.option()!.bounds;f.addDuty(240);delete f.p.whereabouts[f.recipient.id];
 expect(f.option()!.bounds).toEqual(before);
});
it('refuses an external amount above the narrowed legal offer before allocating activity or goods',()=>{
 const f=actionScopeScene();f.addDuty(240);const cap=f.option()!.bounds![0].max,events:any[]=[];let asked=false;
 const restore=setExternalController({controls:(_w,p)=>p.id===f.p.id,choose:()=>asked?{kind:'defer'}:(asked=true,{kind:'pick',key:f.key,limit:{amount:cap+1}}),notify:(_w,_p,event)=>events.push(event)});
 try{f.p.nextThink=f.w.tick;stepWorld(f.w);expect(events.some(e=>e.kind==='rejected')).toBe(true);expect(f.p.activity).toBeNull();expect(f.p.inv.wood??0).toBe(0);expect(f.tree.amount).toBe(12);}finally{restore();}
});
it('describes the estimated amount as an upper bound when external control legally narrows it further',()=>{
 const f=actionScopeScene(),cap=f.option()!.bounds![0].max;expect(cap).toBeGreaterThan(1);let asked=false;
 const restore=setExternalController({controls:(_w,p)=>p.id===f.p.id,choose:()=>asked?{kind:'defer'}:(asked=true,{kind:'pick',key:f.key,limit:{amount:1}})});
 try{f.p.nextThink=f.w.tick;stepWorld(f.w);const a=f.p.activity!;expect(a.amount).toBe(1);expect(describePerson(f.w,f.p.id)?.qa.trying).toContain(`up to ${cap}`);
  const twin=deserializeWorld(serializeWorld(f.w));for(let t=0;t<500&&f.p.activity?.id===a.id;t++){stepWorld(f.w);stepWorld(twin);}
  expect(a.cycle).toBe(1);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
 }finally{restore();}
});
it('does not use another person private commitment or live location to choose the amount',()=>{
 const f=actionScopeScene();f.addDuty(240);const before=f.option()!.bounds;
 f.recipient.x=75;f.recipient.y=75;f.recipient.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.p.id,item:'wood',amount:8,siteId:0,made:0,deadline:1,status:'active'});
 expect(f.option()!.bounds).toEqual(before);
});
it.each(['old','removed'] as const)('keeps the previous material action when %s',why=>{
 const f=actionScopeScene(why==='old'?70:71);if(why==='removed')setActionScope(false);f.addDuty(240);expect(f.option()!.bounds).toBeUndefined();expect(f.option()!.selectionReason).toBeUndefined();
});
it('cannot turn an accepted amount into goods after physical depletion',()=>{
 const f=actionScopeScene();f.addDuty(240);const chosen=selectPrerequisite(f.w,f.p,f.key);ledgerConsume(f.w,'wood',f.tree.amount,'staged loss');f.tree.amount=0;
 try{for(let t=0;t<500&&f.p.activity?.id===chosen.act.id;t++)stepWorld(f.w);expect(f.p.lastResult?.outcome).toBe('failed');expect(f.p.inv.wood??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);}finally{chosen.restore();}
});
it('allows urgent thirst to interrupt the scoped trip',()=>{
 const f=actionScopeScene();f.addDuty(240);const chosen=selectPrerequisite(f.w,f.p,f.key);chosen.restore();f.p.needs.thirst=1;f.p.nextThink=f.w.tick;
 for(let t=0;t<80&&f.p.activity?.id===chosen.act.id;t++)stepWorld(f.w);
 expect(f.p.activity?.id).not.toBe(chosen.act.id);expect(f.p.activity?.need).toBe('thirst');expect(conservationReport(f.w).ok).toBe(true);
});
it('fits water collection to the actual pack and transfers only that amount',()=>{
 const f=actionScopeScene();produce(f.w,f.p.inv,12,'stone',1,'staged carried load');produce(f.w,f.p.inv,12,'clay',2,'staged carried load');f.p.x=40;f.p.y=16;
 const plot=createPlot(f.w,44,18,f.p.hhId);plot.state='growing';observe(f.w,f.p,plot);perceive(f.w,f.p);
 const o=generateOptions(f.w,f.p,true,true).options.find(o=>o.key==='fetch_water')!;expect(o.bounds![0].max).toBe(1);
 const chosen=selectPrerequisite(f.w,f.p,o.key);
 try{const twin=deserializeWorld(serializeWorld(f.w));for(let t=0;t<600&&f.p.activity?.id===chosen.act.id;t++){stepWorld(f.w);stepWorld(twin);}
  expect(chosen.act.cycle).toBe(1);expect(f.p.inv.water).toBe(2);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
 }finally{chosen.restore();}
});
it.each(['future rules','unbounded','missing limit'] as const)('rejects malformed saved scope: %s',why=>{
 const f=actionScopeScene(),chosen=selectPrerequisite(f.w,f.p,f.key);chosen.restore();
 if(why==='future rules')f.w.settings.rulesVersion=70;
 if(why==='unbounded')chosen.act.data.workScope.value=Infinity;
 if(why==='missing limit')delete chosen.act.data.limit;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/work scope/);
});
