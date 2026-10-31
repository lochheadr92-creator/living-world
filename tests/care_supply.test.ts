import {afterEach,expect,it} from 'vitest';
import {careSupplyScene} from './helpers/care_supply';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,produce,ledgerCreate,ledgerSpoil} from '../src/sim/economy';
import {stepWorld} from '../src/sim/world';
import {setCareSupply} from '../src/sim/care_supply';
import {delBelief,observe} from '../src/sim/knowledge';
import {ROOM_CONTACT_MEMORY} from '../src/sim/resident_contact';
import {startActivity,abortActivity,newActivity,suspendActivity} from '../src/sim/activities';
import {makeSource} from '../src/sim/sources';
import {setExternalController} from '../src/sim/external';
import {reviewCareJourney} from '../src/sim/care_journey';
import {residentCareItems} from '../src/sim/resident_care';
import {killPerson} from '../src/sim/lifecycle';
import {enterHome} from '../src/sim/habitation';
import {perceive} from '../src/sim/perception';
afterEach(()=>setCareSupply(true));
it.each([false,true])('offers bounded care acquisition from personal contact without changing state (water %s)',water=>{
 const f=careSupplyScene(95,water),saved=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true),offers=ctx.options.filter(o=>o.key.startsWith('care_supply:'));
 expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>o.tag==='care'&&o.goal.includes('Eli'))).toBe(true);expect(offers[0].bounds?.[0].max).toBe(2);expect(serializeWorld(f.w)).toBe(saved);
});
it.each(['legacy','ablation','expired','unseen','unknown home','own urgency','incapacity','no source'] as const)('does not fabricate acquisition eligibility for %s',reason=>{
 const f=careSupplyScene(reason==='legacy'?94:95);
 if(reason==='ablation')setCareSupply(false);
 if(reason==='expired')f.helper.whereabouts[f.elder.id].tick=-ROOM_CONTACT_MEMORY-1;
 if(reason==='unseen')delete f.helper.whereabouts[f.elder.id];
 if(reason==='unknown home')delBelief(f.helper,f.home.id);
 if(reason==='own urgency')f.helper.needs.thirst=10;
 if(reason==='incapacity')f.helper.injury={kind:'sprain',since:0,until:5000,how:'declared helper injury'};
 if(reason==='no source')for(const b of Object.values(f.helper.beliefs))if(['wild_grain','berry_bush','fruit_tree','fish_spot'].includes(b.kind))delBelief(f.helper,b.id);
 const saved=serializeWorld(f.w);expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key.startsWith('care_supply:'))).toBe(false);expect(serializeWorld(f.w)).toBe(saved);
});
it.each([false,true])('actual autonomous acquisition, lawful return and consumption survive a saved continuation (water %s)',water=>{
 const f=careSupplyScene(95,water),twin=deserializeWorld(serializeWorld(f.w)),starts:string[]=[],speeches:string[]=[],received:{tick:number;n:number;contact:boolean}[]=[];
 const before=water?f.elder.needs.thirst:f.elder.needs.hunger,item=water?'water':'grain';
 f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.helper.id)starts.push(`${a.kind}:${a.goal}`);},onActivityEnd:(p,a)=>{if(p.id===f.helper.id&&a.kind==='give')speeches.push(p.speech?.text??'');},onTransfer:t=>{if(t.from===`person:${f.helper.id}`&&t.to===`person:${f.elder.id}`&&t.item===item)received.push({tick:f.w.tick,n:t.n,contact:(f.helper.indoors??0)===(f.elder.indoors??0)&&Math.hypot(f.helper.x-f.elder.x,f.helper.y-f.elder.y)<=3.2});}};
 for(let n=0;n<1200&&(water?f.elder.needs.thirst:f.elder.needs.hunger)<before+5;n++){stepWorld(f.w);stepWorld(twin);}
 expect(starts.some(s=>s.includes('obtain')&&s.includes('Eli')),JSON.stringify(starts)).toBe(true);
 expect(received.reduce((n,t)=>n+t.n,0),JSON.stringify({starts,received,inv:f.helper.inv,tick:f.w.tick,last:f.helper.lastResult})).toBeGreaterThan(0);
 expect(received.every(t=>t.contact)).toBe(true);expect(water?f.elder.needs.thirst:f.elder.needs.hunger).toBeGreaterThan(before+5);
 expect(f.helper.careJourney?.phase).toBe('delivered');expect(f.helper.inv[item]).toBeGreaterThanOrEqual(1);
 if(water){expect(speeches.some(s=>s.includes('water'))).toBe(true);expect(speeches.some(s=>s.includes('hungry'))).toBe(false);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('rejects a malformed saved supply purpose while preserving a valid in-flight action',()=>{
 const f=careSupplyScene(),offer=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'))!;startActivity(f.w,f.helper,offer.make!()!);
 const saved=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
 f.helper.activity!.data.careSupply.seen=1;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/care supply/);
});
it('a full helper pack does not create room or spend the protected personal portion',()=>{
 const f=careSupplyScene();produce(f.w,f.helper.inv,12,'wood',5,'declared carried load');produce(f.w,f.helper.inv,12,'grain',1,'declared personal portion');
 expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key.startsWith('care_supply:'))).toBe(false);expect(conservationReport(f.w).ok).toBe(true);
});
it('a saved paid partial acquisition resumes through actual receipt with observer purity',()=>{
 const f=careSupplyScene();for(let n=0;n<160&&(f.helper.inv.grain??0)<1;n++)stepWorld(f.w);
 expect(f.helper.careJourney?.phase).toBe('acquire');expect(f.helper.activity?.data.careSupply.to).toBe(f.elder.id);
 const saved=serializeWorld(f.w),twin=deserializeWorld(saved);generateOptions(f.w,f.helper,true,true);expect(serializeWorld(f.w)).toBe(saved);
 for(let n=0;n<350&&f.helper.careJourney?.phase!=='delivered';n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.helper.careJourney?.phase).toBe('delivered');expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('actual failed full-pack handoff leads to a lawful deposit without claiming consumption',()=>{
 const f=careSupplyScene();produce(f.w,f.elder.inv,12,'wood',6,'declared full recipient pack');
 const starts:string[]=[];f.w.hooks={onActivityStart:(_p,a)=>starts.push(a.kind)};
 for(let n=0;n<650&&f.helper.careJourney?.phase!=='deposited';n++)stepWorld(f.w);
 expect(f.helper.careJourney?.phase,JSON.stringify({starts,j:f.helper.careJourney,last:f.helper.lastResult,fail:f.helper.failures[f.elder.id]})).toBe('deposited');
 expect(f.home.store.items.grain).toBeGreaterThan(0);expect(f.elder.inv.grain??0).toBe(0);expect(f.helper.careJourney?.reason).toContain('consumption not yet known');expect(conservationReport(f.w).ok).toBe(true);
 const journey=f.helper.careJourney;expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key.startsWith('care_supply:'))).toBe(false);
 const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<200&&f.elder.needs.hunger<25;n++){stepWorld(f.w);stepWorld(twin);}
 expect(starts).toContain('eat_store');expect(f.elder.needs.hunger).toBeGreaterThan(25);expect(f.helper.careJourney).toBe(journey);expect(f.elder.inv.grain??0).toBe(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('two actual empty-source attempts use known alternatives then stop for that observation',()=>{
 const f=careSupplyScene(),other=makeSource(f.w,'wild_grain',48,42,12);ledgerCreate(f.w,'grain',12,'declared alternative source');observe(f.w,f.helper,other);
 // Declared initial growth ages: neither source is about to renew during the two short attempts.
 f.grain.regrowTimer=0;other.regrowTimer=0;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  for(const source of [f.grain,other]){
   const offer=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:')&&o.targetId===source.id)!;expect(offer).toBeDefined();
   startActivity(f.w,f.helper,offer.make!()!);ledgerSpoil(f.w,source.item,source.amount,'declared source loss after departure');source.amount=0;
   const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<200&&f.helper.activity;n++){stepWorld(f.w);stepWorld(twin);}
   expect(f.helper.lastResult?.outcome,JSON.stringify(f.helper.lastResult)).toBe('failed');expect(f.helper.lastResult?.detail).toBe('nothing left');expect(f.helper.inv.grain??0).toBe(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));
  }
  expect(f.helper.careJourney).toMatchObject({attempts:2,phase:'failed'});expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.key.startsWith('care_supply:'))).toBe(false);expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it('interruption preserves the private purpose and the second failed attempt closes it without claims',()=>{
 const f=careSupplyScene();for(let n=0;n<2;n++){const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'))!;startActivity(f.w,f.helper,o.make!()!);abortActivity(f.w,f.helper,'declared urgent interruption');}
 expect(f.helper.careJourney).toMatchObject({attempts:2,phase:'failed'});expect(f.helper.activity).toBeNull();expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it('a lost grain source can be replaced by actual fruit acquisition and contact receipt',()=>{
 const f=careSupplyScene(),fruit=makeSource(f.w,'fruit_tree',48,42,12);ledgerCreate(f.w,'fruit',12,'declared alternative source');observe(f.w,f.helper,fruit);f.grain.regrowTimer=0;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  let o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:')&&o.targetId===f.grain.id)!;startActivity(f.w,f.helper,o.make!()!);
  ledgerSpoil(f.w,'grain',f.grain.amount,'declared source loss after departure');f.grain.amount=0;
  for(let n=0;n<200&&f.helper.activity;n++)stepWorld(f.w);
  expect(f.helper.careJourney).toMatchObject({attempts:1,phase:'acquire',item:'grain'});
  o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:')&&o.targetId===fruit.id)!;expect(o).toBeDefined();startActivity(f.w,f.helper,o.make!()!);
  for(let n=0;n<200&&f.helper.activity;n++)stepWorld(f.w);
  expect(f.helper.careJourney).toMatchObject({attempts:2,phase:'return',item:'fruit'});expect(f.helper.inv.fruit).toBe(2);
 }finally{release();}
 const twin=deserializeWorld(serializeWorld(f.w));let received=0;f.w.hooks={onTransfer:t=>{if(t.from==='person:'+f.helper.id&&t.to==='person:'+f.elder.id&&t.item==='fruit')received+=t.n;}};
 for(let n=0;n<400&&f.helper.careJourney?.phase!=='delivered';n++){stepWorld(f.w);stepWorld(twin);}
 expect(received).toBeGreaterThan(0);expect(f.helper.careJourney?.received).toBe(received);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('a failed attempt does not credit food already reserved in the helper pack',()=>{
 const f=careSupplyScene();produce(f.w,f.helper.inv,12,'grain',1,'declared personal reserve');
 const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'))!;expect(o).toBeDefined();startActivity(f.w,f.helper,o.make!()!);abortActivity(f.w,f.helper,'interrupted before acquiring anything');
 expect(f.helper.careJourney?.phase).toBe('acquire');expect(f.helper.inv.grain).toBe(1);expect(conservationReport(f.w).ok).toBe(true);
});
it('an existing food journey does not silently switch to a water purpose',()=>{
 const f=careSupplyScene(),o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'))!;startActivity(f.w,f.helper,o.make!()!);abortActivity(f.w,f.helper,'declared interruption');
 f.helper.whereabouts[f.elder.id].room!.thirsty=true;
 const offers=generateOptions(f.w,f.helper,true,true).options.filter(o=>o.key.startsWith('care_supply:'));expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>o.kind==='gather')).toBe(true);
});
it('a new promise at contact protects the acquired food, with no invented receipt',()=>{
 const f=careSupplyScene(),o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'))!;startActivity(f.w,f.helper,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<180&&f.helper.activity;n++)stepWorld(f.w);}finally{release();}
 expect(f.helper.inv.grain).toBe(2);f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.elder.id,item:'grain',amount:2,siteId:0,made:f.w.tick,deadline:f.w.tick+600,status:'active'});
 const handoff={...o.make!()!,kind:'give' as const,targetId:f.elder.id,data:{residentCare:true,items:{grain:1},mode:'care'}};
 expect(residentCareItems(f.w,f.helper,f.elder,handoff,{grain:1})).toEqual({});expect(f.helper.careJourney?.received).toBeUndefined();expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['stale','missing','carer died'] as const)('ends a retained journey for %s and survives saving',cause=>{
 const f=careSupplyScene(),o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'))!;startActivity(f.w,f.helper,o.make!()!);
 if(cause==='stale'){abortActivity(f.w,f.helper,'declared interruption');f.w.tick=701;reviewCareJourney(f.w,f.helper);}
 if(cause==='missing'){delete f.helper.whereabouts[f.elder.id];reviewCareJourney(f.w,f.helper);}
 if(cause==='carer died')killPerson(f.w,f.helper,'declared carer loss');
 expect(f.helper.careJourney?.phase).toBe('failed');expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it.each([false,true])('later actual contact cancels only the matching acquisition (suspended %s)',suspended=>{
 const f=careSupplyScene(),o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'))!;startActivity(f.w,f.helper,o.make!()!);
 let other=0;if(suspended)suspendActivity(f.w,f.helper);
 expect(enterHome(f.w,f.helper,f.home)).toBeNull();
 if(suspended){f.helper.needs.energy=60;const rest=newActivity(f.w,f.helper,{kind:'rest',label:'Other valid rest',goal:'to rest',here:true,minCommit:100,maxTicks:200});other=rest.id;startActivity(f.w,f.helper,rest);}
 f.elder.needs.hunger=100;perceive(f.w,f.helper);
 const twin=deserializeWorld(serializeWorld(f.w));stepWorld(f.w);stepWorld(twin);
 expect(f.helper.careJourney).toMatchObject({phase:'failed',reason:'later personal contact no longer shows that need'});
 expect(f.helper.activity?.data.careSupply).toBeUndefined();expect(f.helper.suspended).toBeNull();if(suspended)expect(f.helper.activity?.id).toBe(other);
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
