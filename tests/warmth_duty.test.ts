import {afterEach,expect,it} from 'vitest';
import {warmthDutyScene,requestWarmth} from './helpers/warmth_duty';
import {setWarmthDuty} from '../src/sim/warmth_duty';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport,produce,ledgerSpoil} from '../src/sim/economy';
import {fireWarmth} from '../src/sim/needs';
import {observe} from '../src/sim/knowledge';
import {startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {destroyBuilding} from '../src/sim/buildings';
import {building} from './helpers/kit';
import {createRequest,evaluateRequest} from '../src/sim/social';
import {DAY,FIRE_MAX_FUEL} from '../src/sim/constants';
afterEach(()=>setWarmthDuty(true));
it('actual acceptance communicates the dated fire and motivates acquisition without observer mutation',()=>{
 const f=warmthDutyScene(),observed=f.asker.beliefs[f.fire.id].seen;expect(requestWarmth(f).status).toBe('promised');
 expect(f.helper.beliefs[f.fire.id]).toMatchObject({seen:observed,src:'told',from:f.asker.id,btype:'fire'});
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true);expect(ctx.options.some(o=>o.kind==='gather'&&o.goal.includes('promised'))).toBe(true);expect(serializeWorld(f.w)).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['legacy','ablation'])('preserves the prior fire-duty path under %s',mode=>{
 const f=warmthDutyScene(mode==='legacy'?95:96);if(mode==='ablation')setWarmthDuty(false);expect(requestWarmth(f).status).toBe('promised');expect(f.helper.beliefs[f.fire.id]).toBeUndefined();
});
it('autonomous fuel acquisition and physical burning fulfil the duty once and provide actual warmth',()=>{
 const f=warmthDutyScene();requestWarmth(f);const twin=deserializeWorld(serializeWorld(f.w)),starts:string[]=[],burns:{tick:number;n:number}[]=[];let warmth=0;
 f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.helper.id)starts.push(a.kind+':'+a.goal);},onActivityEnd:(p,a)=>{if(p.id===f.helper.id&&a.kind==='fuel_fire'&&a.cycle>0)burns.push({tick:f.w.tick,n:a.cycle});}};
 for(let n=0;n<1600&&!burns.length;n++){stepWorld(f.w);stepWorld(twin);warmth=Math.max(warmth,fireWarmth(f.w,f.helper.x,f.helper.y));}
 expect(burns.length,JSON.stringify({starts,last:f.helper.lastResult,inv:f.helper.inv,c:f.helper.commitments,tick:f.w.tick})).toBeGreaterThan(0);
 expect(starts.some(s=>s.startsWith('gather:')&&s.includes('promised'))).toBe(true);expect(warmth).toBeGreaterThan(0);
 expect(f.helper.commitments.find(c=>c.milestone==='fire kept')).toMatchObject({status:'done',contrib:40});
 for(let n=0;n<60;n++){stepWorld(f.w);stepWorld(twin);}expect(f.helper.commitments.find(c=>c.milestone==='fire kept')).toMatchObject({status:'done',contrib:40});
 expect(starts.filter(s=>s.startsWith('gather:')&&s.includes('promised'))).toHaveLength(1);
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('an actual conversation refuses a duty with no held or personally known fuel',()=>{
 const f=warmthDutyScene();ledgerSpoil(f.w,'wood',f.tree.amount,'declared unavailable initial source');f.tree.amount=0;f.tree.regrowTimer=0;observe(f.w,f.helper,f.tree);expect(requestWarmth(f)).toMatchObject({status:'declined',note:'no item'});expect(f.helper.commitments.some(c=>c.milestone==='fire kept')).toBe(false);expect(conservationReport(f.w).ok).toBe(true);
});
it('a fresher personal fire observation survives an older requester account',()=>{
 const f=warmthDutyScene();f.w.tick=1;observe(f.w,f.helper,f.fire);const own={...f.helper.beliefs[f.fire.id]};expect(requestWarmth(f).status).toBe('promised');expect(f.helper.beliefs[f.fire.id]).toEqual(own);
});
it('paid partial acquisition saves and continues to actual fire consumption',()=>{
 const f=warmthDutyScene();requestWarmth(f);
 for(let n=0;n<400&&!(f.helper.activity?.kind==='gather'&&f.helper.activity.progress>4);n++)stepWorld(f.w);
 expect(f.helper.activity?.kind).toBe('gather');expect(f.helper.activity!.progress).toBeGreaterThan(4);
 const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<1400&&f.helper.commitments.some(c=>c.milestone==='fire kept'&&c.status==='active');n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.helper.commitments.find(c=>c.milestone==='fire kept')?.status).toBe('done');expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('lost source after departure fails physically without completing the fire duty',()=>{
 const f=warmthDutyScene();requestWarmth(f);const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='gather'&&o.goal.includes('promised'))!;startActivity(f.w,f.helper,o.make!()!);
 f.tree.regrowTimer=0;ledgerSpoil(f.w,'wood',f.tree.amount,'declared source loss after departure');f.tree.amount=0;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<600&&f.helper.activity;n++)stepWorld(f.w);}finally{release();}
 expect(f.helper.lastResult?.outcome).toBe('failed');expect(f.helper.inv.wood??0).toBe(0);expect(f.helper.commitments.find(c=>c.milestone==='fire kept')?.status).toBe('active');expect(conservationReport(f.w).ok).toBe(true);
});
it('fuel newly promised during work is not burnt or credited as a kept fire duty',()=>{
 const f=warmthDutyScene();requestWarmth(f);produce(f.w,f.helper.inv,12,'wood',1,'declared carried fuel');
 const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='fuel_fire')!;startActivity(f.w,f.helper,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{
  for(let n=0;n<500&&f.helper.activity?.phase!=='work';n++)stepWorld(f.w);expect(f.helper.activity?.phase).toBe('work');
  f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',item:'wood',amount:1,to:f.asker.id,siteId:0,made:f.w.tick,deadline:f.w.tick+600,status:'active'});
  const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<30&&f.helper.activity;n++){stepWorld(f.w);stepWorld(twin);}expect(serializeWorld(f.w)).toBe(serializeWorld(twin));
 }finally{release();}
 expect(f.helper.lastResult?.detail).toContain('reserved');expect(f.helper.inv.wood).toBe(1);expect(f.helper.commitments.find(c=>c.milestone==='fire kept')?.status).toBe('active');expect(conservationReport(f.w).ok).toBe(true);
});
it('fire loss after departure preserves held fuel and is learned on arrival',()=>{
 const f=warmthDutyScene();requestWarmth(f);produce(f.w,f.helper.inv,12,'wood',1,'declared carried fuel');
 const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='fuel_fire')!;startActivity(f.w,f.helper,o.make!()!);destroyBuilding(f.w,f.fire,'declared target loss after departure');
 expect(f.helper.beliefs[f.fire.id]).toBeDefined();const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<500&&f.helper.activity;n++)stepWorld(f.w);}finally{release();}
 expect(f.helper.lastResult?.outcome).toBe('interrupted');expect(f.helper.lastResult?.detail).toContain('I saw that the promised building was no longer there');expect(f.helper.inv.wood).toBe(1);expect(f.helper.beliefs[f.fire.id]).toBeUndefined();expect(f.helper.commitments.find(c=>c.milestone==='fire kept')).toMatchObject({status:'moot',targetEvidence:{source:'observed absence'}});expect(conservationReport(f.w).ok).toBe(true);
});
it('a heard fire duty can collect lawful stored offcuts and burn the actual recovered fuel',()=>{
 const f=warmthDutyScene(),store=building(f.s,'storehouse',43,44,0);produce(f.w,store.store.items,999,'offcuts',2,'declared existing physical offcut stock');observe(f.w,f.helper,store);requestWarmth(f);
 const offer=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='withdraw'&&o.goal.includes('promised')&&o.key.includes('offcuts'));expect(offer).toBeDefined();startActivity(f.w,f.helper,offer!.make!()!);
 const twin=deserializeWorld(serializeWorld(f.w));let burnt=0;f.w.hooks={onActivityEnd:(p,a)=>{if(p.id===f.helper.id&&a.kind==='fuel_fire'&&a.data.fuelItem==='offcuts')burnt+=a.cycle;}};
 for(let n=0;n<1200&&!burnt;n++){stepWorld(f.w);stepWorld(twin);}expect(burnt).toBeGreaterThan(0);expect(f.w.ledger.consumed.offcuts).toBe(burnt);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('a full pack cannot invent carrying space for duty fuel',()=>{
 const f=warmthDutyScene();requestWarmth(f);produce(f.w,f.helper.inv,12,'stone',20,'declared full carried load');const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true);
 expect(ctx.options.some(o=>o.kind==='gather'&&o.goal.includes('promised'))).toBe(false);expect(serializeWorld(f.w)).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
});
it('already held spare fuel prevents another acquisition for that duty',()=>{
 const f=warmthDutyScene(),store=building(f.s,'storehouse',43,44,0);produce(f.w,store.store.items,999,'offcuts',2,'declared stored fuel');observe(f.w,f.helper,store);requestWarmth(f);produce(f.w,f.helper.inv,12,'offcuts',1,'declared held fuel');
 const offers=generateOptions(f.w,f.helper,true,true).options.filter(o=>o.goal.includes('promised'));expect(offers.some(o=>o.kind==='fuel_fire')).toBe(true);expect(offers.some(o=>o.kind==='gather'||o.kind==='withdraw')).toBe(false);
});
it('an obsolete fire account is not accepted as a fresh known destination',()=>{
 const f=warmthDutyScene();f.w.tick=DAY+1;const req=createRequest(f.w,f.asker,f.helper,{kind:'fire',destId:f.fire.id,destKind:'building'}),before=serializeWorld(f.w);expect(evaluateRequest(f.w,f.helper,f.asker,req)).toMatchObject({kind:'decline',reason:'no_place'});expect(serializeWorld(f.w)).toBe(before);
});
it('a fire filled while work is underway is rechecked before any fuel is consumed',()=>{
 const f=warmthDutyScene();requestWarmth(f);produce(f.w,f.helper.inv,12,'wood',1,'declared carried fuel');const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='fuel_fire')!;startActivity(f.w,f.helper,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{
  for(let n=0;n<500&&f.helper.activity?.phase!=='work';n++)stepWorld(f.w);expect(f.helper.activity?.phase).toBe('work');
  // Declared changed target condition; this test does not claim another worker performed the refill.
  f.fire.fuel=FIRE_MAX_FUEL;for(let n=0;n<30&&f.helper.activity;n++)stepWorld(f.w);
 }finally{release();}
 expect(f.helper.lastResult).toMatchObject({outcome:'failed',detail:'it is burning well already'});expect(f.helper.inv.wood).toBe(1);expect(f.helper.commitments.find(c=>c.milestone==='fire kept')?.status).toBe('active');expect(conservationReport(f.w).ok).toBe(true);
});
