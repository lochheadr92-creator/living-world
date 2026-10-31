import {afterEach,expect,it} from 'vitest';
import {repairDutyScene,requestRepair} from './helpers/repair_duty';
import {setRepairDuty} from '../src/sim/repair_duty';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport,produce,ledgerSpoil} from '../src/sim/economy';
import {observe} from '../src/sim/knowledge';
import {createRequest,evaluateRequest} from '../src/sim/social';
import {DAY} from '../src/sim/constants';
import {startActivity,suspendActivity,resumeSuspended} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {destroyBuilding} from '../src/sim/buildings';
import {shelterAt} from '../src/sim/needs';
import {stage,addPerson,building,done} from './helpers/kit';
import type {Intention} from '../src/sim/types';
afterEach(()=>setRepairDuty(true));
it('acceptance conveys the dated home and a real fallback patch is acquired and worked autonomously',()=>{
 const f=repairDutyScene();expect(f.helper.beliefs[f.home.id]).toBeUndefined();const r=requestRepair(f);expect(r.status).toBe('promised');expect(r.note).toContain('patch');expect(f.helper.beliefs[f.home.id]).toMatchObject({src:'told',from:f.parent.id,seen:0});
 const before=serializeWorld(f.w),o=generateOptions(f.w,f.helper,true,true).options;expect(o.some(o=>o.kind==='gather'&&o.goal.includes('patch'))).toBe(true);expect(serializeWorld(f.w)).toBe(before);const twin=deserializeWorld(before);
 for(let n=0;n<2000&&r.status==='promised';n++){stepWorld(f.w);stepWorld(twin);}
 expect(r.status,JSON.stringify({r,c:f.helper.commitments,last:f.helper.lastResult,activity:f.helper.activity,condition:f.home.condition,log:f.helper.log.slice(-8)})).toBe('fulfilled');expect(f.home.condition).toBeGreaterThan(62);expect(f.w.ledger.reasons['-repairs']).toBeGreaterThan(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it.each(['legacy','ablation'])('preserves the unheard destination under %s',mode=>{
 if(mode==='ablation')setRepairDuty(false);const f=repairDutyScene(mode==='legacy'?97:98,'hut',{wood:2}),r=requestRepair(f);expect(r.status).toBe('promised');expect(f.helper.beliefs[f.home.id]).toBeUndefined();expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.kind==='repair'&&o.targetId===f.home.id)).toBe(false);
});
it('a newer personal home observation is not overwritten by the old spoken account',()=>{
 const f=repairDutyScene();f.w.tick=1;observe(f.w,f.helper,f.home);const own={...f.helper.beliefs[f.home.id]};expect(requestRepair(f).status).toBe('promised');expect(f.helper.beliefs[f.home.id]).toEqual(own);
});
it('a stale unconfirmed destination is refused without consulting the current remote home',()=>{
 const f=repairDutyScene();f.w.tick=DAY+1;const r=createRequest(f.w,f.parent,f.helper,{kind:'repair',item:'wood',destKind:'building',destId:f.home.id}),before=serializeWorld(f.w);expect(evaluateRequest(f.w,f.helper,f.parent,r)).toMatchObject({kind:'decline',reason:'no_place'});expect(serializeWorld(f.w)).toBe(before);
});
it('no held or personally known repair supplies produces a real refusal',()=>{
 const f=repairDutyScene();ledgerSpoil(f.w,'wood',f.tree.amount,'declared exhausted source');f.tree.amount=0;f.tree.regrowTimer=0;observe(f.w,f.helper,f.tree);expect(requestRepair(f)).toMatchObject({status:'declined',note:'no item'});expect(f.helper.commitments).toHaveLength(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('proper material already held avoids fallback acquisition and is physically preferred',()=>{
 const f=repairDutyScene(98,'house',{planks:2,wood:1,bread:1,water:1});requestRepair(f);const offers=generateOptions(f.w,f.helper,true,true).options;expect(offers.some(o=>o.kind==='repair'&&o.goal.includes('promised'))).toBe(true);expect(offers.some(o=>o.goal.includes('wood patch'))).toBe(false);
 const wood=f.helper.inv.wood;for(let n=0;n<1500&&!(f.w.ledger.reasons['-repairs']);n++)stepWorld(f.w);expect(f.w.ledger.consumed.planks).toBeGreaterThan(0);expect(f.helper.inv.wood).toBe(wood);expect(conservationReport(f.w).ok).toBe(true);
});
it('a full pack cannot invent space for the accepted patch',()=>{
 const f=repairDutyScene();requestRepair(f);produce(f.w,f.helper.inv,12,'stone',20,'declared full carried load');const before=serializeWorld(f.w);expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.goal.includes('wood patch'))).toBe(false);expect(serializeWorld(f.w)).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
});
it('a tree lost after departure yields no material or fictitious roof completion',()=>{
 const f=repairDutyScene(),r=requestRepair(f),o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.goal.includes('wood patch'))!;startActivity(f.w,f.helper,o.make!()!);ledgerSpoil(f.w,'wood',f.tree.amount,'declared source loss');f.tree.amount=0;f.tree.regrowTimer=0;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<600&&f.helper.activity;n++)stepWorld(f.w);}finally{release();}expect(f.helper.lastResult?.outcome).toBe('failed');expect(f.helper.inv.wood??0).toBe(0);expect(r.status).toBe('promised');expect(f.w.ledger.reasons['-repairs']??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('home loss after departure is learned at arrival, retaining the held patch',()=>{
 const f=repairDutyScene(98,'hut',{wood:2,bread:1,water:1});requestRepair(f);const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair')!;startActivity(f.w,f.helper,o.make!()!);destroyBuilding(f.w,f.home,'declared collapse after departure');expect(f.helper.beliefs[f.home.id]).toBeDefined();
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<800&&f.helper.activity;n++)stepWorld(f.w);}finally{release();}expect(f.helper.commitments.find(c=>c.milestone==='sound again')).toMatchObject({status:'moot',targetEvidence:{source:'observed absence'}});expect(f.helper.inv.wood).toBe(2);expect(f.w.ledger.reasons['-repairs']??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('materials reserved during paid work cannot be spent on the roof',()=>{
 const f=repairDutyScene(98,'hut',{wood:1,bread:1,water:1});requestRepair(f);const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair')!;startActivity(f.w,f.helper,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<800&&f.helper.activity?.phase!=='work';n++)stepWorld(f.w);expect(f.helper.activity?.phase).toBe('work');f.helper.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',item:'wood',amount:1,to:f.parent.id,siteId:0,made:f.w.tick,deadline:f.w.tick+600,status:'active'});const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<150&&f.helper.activity;n++){stepWorld(f.w);stepWorld(twin);}expect(serializeWorld(f.w)).toBe(serializeWorld(twin));}finally{release();}
 expect(f.helper.lastResult?.detail).toContain('reserved');expect(f.helper.inv.wood).toBe(1);expect(f.w.ledger.reasons['-repairs']??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('condition changed during work is checked before spending another material',()=>{
 const f=repairDutyScene(98,'hut',{wood:1,bread:1,water:1});requestRepair(f);const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair')!;startActivity(f.w,f.helper,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<800&&f.helper.activity?.phase!=='work';n++)stepWorld(f.w);expect(f.helper.activity?.phase).toBe('work');f.home.condition=100;for(let n=0;n<100&&f.helper.activity;n++)stepWorld(f.w);}finally{release();}
 expect(f.helper.inv.wood).toBe(1);expect(f.w.ledger.reasons['-repairs']??0).toBe(0);expect(f.helper.commitments.find(c=>c.milestone==='sound again')?.contrib??0).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('interrupted paid repair preserves consumed material and resumes through saved continuation',()=>{
 const f=repairDutyScene(98,'house',{wood:3,bread:1,water:1});requestRepair(f);const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair')!;startActivity(f.w,f.helper,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&!(f.helper.activity?.cycle);n++)stepWorld(f.w);expect(f.helper.activity?.cycle).toBe(1);suspendActivity(f.w,f.helper);const paid=f.w.ledger.reasons['-repairs'],twin=deserializeWorld(serializeWorld(f.w)),p=twin.persons.find(p=>p.id===f.helper.id)!;expect(resumeSuspended(f.w,f.helper)).toBe(true);expect(resumeSuspended(twin,p)).toBe(true);for(let n=0;n<300&&f.helper.activity;n++){stepWorld(f.w);stepWorld(twin);}expect(f.w.ledger.reasons['-repairs']).toBeGreaterThan(paid);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));}finally{release();}expect(conservationReport(f.w).ok).toBe(true);
});
it('a repaired initially leaking home is later physically entered and used for sleep',()=>{
 const f=repairDutyScene(98,'house',undefined,20),r=requestRepair(f);for(let n=0;n<2000&&r.status==='promised';n++)stepWorld(f.w);expect(r.status).toBe('fulfilled');const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<1000&&f.parent.indoors!==f.home.id;n++){stepWorld(f.w);stepWorld(twin);}expect(f.parent.indoors).toBe(f.home.id);expect(f.parent.activity?.kind).toBe('sleep');expect(shelterAt(f.w,f.parent.x,f.parent.y,f.parent)).toMatchObject({cover:1,bonus:14});const energy=f.parent.needs.energy;for(let n=0;n<50;n++){stepWorld(f.w);stepWorld(twin);}expect(f.parent.needs.energy).toBeGreaterThan(energy);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('an own-roof plan can spend its share while another promised wood remains protected',()=>{
 const s=stage('repair-own-reserves'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=98;const p=addPerson(s,'Ada',40,40,{inv:{wood:3,bread:1,water:1},hunger:100,thirst:100,energy:100}),home=building(s,'hut',43,40,p.hhId);const neighbour=addPerson(s,'Ben',38,40,{hunger:100,thirst:100,energy:100});home.condition=20;w.households.find(h=>h.id===p.hhId)!.homeId=home.id;done(s);observe(w,p,home);
 const plan:Intention={id:w.nextId++,kind:'repair',goal:'mend my home',since:0,until:2400,status:'active',reason:'declared existing own-roof plan',setAside:0,aboutId:home.id,wants:{wood:2},makes:'',sheltered:0,worked:0,ended:0,step:'',stepKind:'none',stepTarget:0,stepItem:null,stepKey:null,blocked:''};p.intentions.push(plan);p.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',item:'wood',amount:1,to:neighbour.id,siteId:0,made:0,deadline:2400,status:'active'});
 const o=generateOptions(w,p,true,true).options.find(o=>o.kind==='repair'&&o.targetId===home.id);expect(o).toBeDefined();startActivity(w,p,o!.make!()!);const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<400&&p.activity;n++)stepWorld(w);}finally{release();}
 expect(w.ledger.reasons['-repairs']).toBe(2);expect(p.inv.wood).toBe(1);expect(plan.worked).toBeGreaterThan(0);expect(p.lastResult?.detail).toContain('reserved');expect(conservationReport(w).ok).toBe(true);
});
it('a stale roof refusal is spoken about the home, not a fire',()=>{
 const f=repairDutyScene();f.w.tick=DAY+1;const ask=generateOptions(f.w,f.parent,true,true).options.find(o=>o.key.endsWith(':repair'));expect(ask).toBeDefined();startActivity(f.w,f.parent,ask!.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});let spoken='';try{for(let n=0;n<200&&!spoken;n++){stepWorld(f.w);const r=f.w.requests.find(r=>r.kind==='repair');if(r?.status==='declined')spoken=f.helper.speech?.text??'';}}finally{release();}
 expect(f.w.requests.find(r=>r.kind==='repair')).toMatchObject({status:'declined',note:'no place'});expect(spoken).toContain('home');expect(spoken).not.toContain('fire');expect(f.helper.commitments).toHaveLength(0);expect(f.helper.beliefs[f.home.id]).toBeUndefined();
});
