import {expect,it} from 'vitest';
import {continuityScene} from './helpers/continuity';
import {generateOptions} from '../src/sim/decision';
import {perceive} from '../src/sim/perception';
import {startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {proposeHandover,answerHandover,reviewHandovers,handoverOffer} from '../src/sim/work_handover';
import {personalHandovers,setWorkHandover} from '../src/sim/handover_state';
import {relationshipHistory} from '../src/sim/history';
import {reviewIntentions} from '../src/sim/intent';
import {observe,delBelief} from '../src/sim/knowledge';
import type {World} from '../src/sim/types';
import {relocationFixture} from './helpers/relocation';
import {currentRelocation} from '../src/sim/relocation';
import {relOf} from '../src/sim/relations';
import {site,building} from './helpers/kit';
import {T} from '../src/sim/types';
import {initializeWater} from '../src/sim/hydrology';
import {makeSource} from '../src/sim/sources';
import {computeAccessCells,computeWaterDist} from '../src/sim/worldgen';
import {newActivity} from '../src/sim/activities';
function scene(){const f=continuityScene(94,true);for(const p of [f.a,f.b]){p.cooldowns.pause=0;perceive(f.w,p);}f.b.nextThink=600;return f;}
function injured(){const f=scene();f.a.injury={kind:'sprain' as const,since:0,until:2400,how:'declared staged incapacity'};return f;}
function advance(w:World,n:number){const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let t=0;t<n;t++)stepWorld(w);}finally{release();}}
function accepted(){const f=injured(),id=f.w.nextId++;expect(proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer')).toBeTruthy();expect(answerHandover(f.w,f.a,f.b,id,'offer',id)).toContain('I accept');return {...f,id};}
it('an injured worker can offer a distinct informed handover of their active undertaking',()=>{
 const f=scene();f.a.injury={kind:'sprain',since:0,until:2400,how:'declared staged incapacity'};
 const offers=generateOptions(f.w,f.a,true,true).options;
 expect(offers.some(o=>o.key.includes('handover_work')&&o.targetId===f.b.id)).toBe(true);
 expect(f.plan.status).toBe('active');expect(f.b.intentions.some(i=>i.succeeding)).toBe(false);
});
it('ordinary work-sharing by a healthy worker is not a handover offer or acceptance',()=>{
 const f=scene(),offers=generateOptions(f.w,f.a,true,true).options;
 expect(offers.some(o=>o.key.includes('share_work'))).toBe(true);
 expect(offers.some(o=>o.key.includes('handover_work'))).toBe(false);
});
it('actual speech, saved hearing and separate acceptance create only the helper\'s own plan',()=>{
 const f=injured(),goods=JSON.stringify([f.a.inv,f.b.inv,f.w.tools]),skills=JSON.stringify([f.a.skills,f.b.skills]),promises=JSON.stringify([f.a.commitments,f.b.commitments]);
 const offered=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('handover_work'))!;startActivity(f.w,f.a,offered.make!()!);
 for(let n=0;n<300&&!personalHandovers(f.b).length;n++)advance(f.w,1);
 expect(personalHandovers(f.b)[0]?.state).toBe('proposed');expect(f.plan.status).toBe('active');
 const twin=deserializeWorld(serializeWorld(f.w));advance(f.w,35);advance(twin,35);expect(serializeWorld(twin)).toBe(serializeWorld(f.w));
 const h=personalHandovers(f.b)[0];expect(h.state).toBe('accepted');expect(f.plan.status).toBe('dropped');expect(f.plan.wants).toEqual({});
 expect(f.b.intentions.find(i=>i.id===h.helperPlan)?.handoverId).toBe(h.id);expect(JSON.stringify([f.a.inv,f.b.inv,f.w.tools])).toBe(goods);expect(JSON.stringify([f.a.skills,f.b.skills])).toBe(skills);expect(JSON.stringify([f.a.commitments,f.b.commitments])).toBe(promises);expect(conservationReport(f.w).ok).toBe(true);
 const before=serializeWorld(f.w);expect(relationshipHistory(f.w,f.b).join(' ')).toContain('accepted');expect(serializeWorld(f.w)).toBe(before);
});
it('a helper with their own active project refuses without taking the original responsibility',()=>{
 const f=injured();f.b.intentions.push({...f.plan,id:f.w.nextId++,wants:{wood:3}});const id=f.w.nextId++;proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer');
 expect(answerHandover(f.w,f.a,f.b,id,'offer',id)).toContain('work of my own');expect(f.plan.status).toBe('active');expect(personalHandovers(f.a)[0].state).toBe('declined');
});
it('a missing known material is a refusal, not a fabricated supply or ability',()=>{
 const f=injured();for(const b of Object.values(f.b.beliefs))if(b.kind==='tree')delBelief(f.b,b.id);const id=f.w.nextId++;proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer');
 expect(answerHandover(f.w,f.a,f.b,id,'offer',id)).toContain('no known source');expect(f.plan.status).toBe('active');expect(conservationReport(f.w).ok).toBe(true);
});
it('separated or sleeping people cannot convey or accept a handover; unaccepted proposals expire',()=>{
 const f=injured(),id=f.w.nextId++;f.b.x=80;expect(proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer')).toBeNull();f.b.x=42.5;proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer');
 f.b.pose='sleep';expect(answerHandover(f.w,f.a,f.b,id,'offer',id)).toBeNull();f.b.pose='stand';f.w.tick=401;reviewHandovers(f.w,f.a);reviewHandovers(f.w,f.b);
 expect(personalHandovers(f.b)[0].state).toBe('declined');expect(f.plan.status).toBe('active');
});
it('only one successor accepts and the original does not silently adopt the same project again',()=>{
 const f=accepted();f.c.x=42.5;f.c.y=41;expect(proposeHandover(f.w,f.a,f.c,f.plan.id,f.w.nextId++,'offer')).toBeNull();
 f.w.tick=2500;delete f.a.injury;reviewIntentions(generateOptions(f.w,f.a,true));expect(f.a.intentions.filter(i=>i.status==='active'&&i.kind==='shelter')).toHaveLength(0);
});
it('recovery does not transfer responsibility until contact, fresh work communication and agreed handback',()=>{
 const f=accepted(),helper=f.b.intentions.find(i=>i.handoverId===f.id)!;helper.worked=7;delete f.a.injury;reviewHandovers(f.w,f.a);expect(personalHandovers(f.a)[0].state).toBe('accepted');
 f.a.x=80;expect(proposeHandover(f.w,f.a,f.b,0,f.w.nextId++,'return',f.id)).toBeNull();f.a.x=40.5;
 const cid=f.w.nextId++;expect(proposeHandover(f.w,f.a,f.b,0,cid,'return',f.id)).toContain('recovered');expect(answerHandover(f.w,f.a,f.b,f.id,'return',cid)).toContain('We agree');
 expect(helper.status).toBe('dropped');expect(helper.worked).toBe(7);expect(f.a.intentions.find(i=>i.status==='active'&&i.kind==='shelter')?.worked).toBe(0);expect(personalHandovers(f.b)[0].state).toBe('returned');expect(conservationReport(f.w).ok).toBe(true);expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it('a completed helper goal is reported, never restarted or silently revealed to the original',()=>{
 const f=accepted(),helper=f.b.intentions.find(i=>i.handoverId===f.id)!;helper.status='done';helper.ended=f.w.tick;helper.reason='declared completed goal';helper.wants={};reviewHandovers(f.w,f.b);
 expect(personalHandovers(f.a)[0].state).toBe('accepted');expect(personalHandovers(f.b)[0].state).toBe('finished');const cid=f.w.nextId++;proposeHandover(f.w,f.b,f.a,0,cid,'report',f.id);expect(answerHandover(f.w,f.b,f.a,f.id,'report',cid)).toContain('heard');expect(personalHandovers(f.a)[0].state).toBe('finished');
});
it('the lab removal keeps older work sharing without new handovers',()=>{
 const f=injured();setWorkHandover(false);try{expect(handoverOffer(f.w,f.a,f.b.id)).toBeNull();}finally{setWorkHandover(true);}
});
it('without nearby relief, accepted work retains its progress but can fail to reach delivery',()=>{
 const f=injured(),offered=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('handover_work'))!;
 startActivity(f.w,f.a,offered.make!()!);advance(f.w,120);const h=personalHandovers(f.b)[0];expect(h.state).toBe('accepted');
 const saved=serializeWorld(f.w),twin=deserializeWorld(saved),release=setExternalController({controls:(_w,p)=>p.id!==f.b.id,choose:()=>({kind:'defer'})});
 try{for(let n=0;n<1800&&(f.st.delivered.wood??0)<1;n++){stepWorld(f.w);stepWorld(twin);}}finally{release();}
 expect(f.st.delivered.wood??0).toBe(0);expect(f.b.inv.wood??0).toBeGreaterThan(0);expect(f.b.intentions.find(i=>i.id===h.helperPlan)).toMatchObject({status:'active',handoverId:h.id});expect(serializeWorld(twin)).toBe(serializeWorld(f.w));expect(conservationReport(f.w).ok).toBe(true);
});
it('actual accepted cover with known physical relief leads to paid delivery under the retained undertaking',()=>{
 const f=injured();expect(f.w.tick).toBe(0);f.w.terrain[38*f.w.W+40]=T.SHALLOW;
 // Declared initial geography, before any draw or time: rebuild its initial water accounting.
 delete f.w.waterBodies;initializeWater(f.w);computeWaterDist(f.w);computeAccessCells(f.w);const food=makeSource(f.w,'berry_bush',43,39,12);observe(f.w,f.b,food);perceive(f.w,f.b);snapshotInitial(f.w);
 const offered=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('handover_work'))!;startActivity(f.w,f.a,offered.make!()!);advance(f.w,120);const h=personalHandovers(f.b)[0];expect(h.state).toBe('accepted');
 const twin=deserializeWorld(serializeWorld(f.w)),release=setExternalController({controls:(_w,p)=>p.id!==f.b.id,choose:()=>({kind:'defer'})});
 try{for(let n=0;n<1800&&(f.st.delivered.wood??0)<1;n++){stepWorld(f.w);stepWorld(twin);}}finally{release();}
 expect(f.st.delivered.wood??0).toBeGreaterThan(0);expect(f.b.intentions.find(i=>i.id===h.helperPlan)).toMatchObject({status:'active',handoverId:h.id});expect(serializeWorld(twin)).toBe(serializeWorld(f.w));expect(conservationReport(f.w).ok).toBe(true);
});
it('a relocation organiser can ask a personally heard stayer to cover work before actual departure',()=>{
 const f=relocationFixture(true,false);f.w.settings.rulesVersion=94;
 try{
  f.run(f.a,':propose:');relOf(f.b!,f.a.id).trust=-40;f.run(f.a,':ask:'+f.b!.id);const r=currentRelocation(f.hh)!;expect(r.members.find(m=>m.id===f.b!.id)?.response).toBe('refused');
  f.run(f.a,':prepare:');expect(r.phase).toBe('packing');
  // Declared unfinished household work is added before this handover, with no new goods.
  const st=site({w:f.w,rng:null!},'hut',48,43,f.a.hhId,f.a.id);observe(f.w,f.a,st);observe(f.w,f.b!,st);observe(f.w,f.b!,f.tree);
  const template=continuityScene(94,true).plan,plan={...template,id:f.w.nextId++,aboutId:st.id,since:f.w.tick,until:f.w.tick+4800};f.a.intentions=[plan];f.b!.intentions=[];relOf(f.b!,f.a.id).trust=10;f.a.x=40.5;f.a.y=40.5;f.b!.x=42.5;f.b!.y=40.5;f.a.cooldowns['handover:'+f.b!.id]=0;
  expect(handoverOffer(f.w,f.a,f.b!.id)?.cause).toBe('departure');const id=f.w.nextId++;expect(proposeHandover(f.w,f.a,f.b!,plan.id,id,'offer')).toContain('agreed to leave');
  expect(answerHandover(f.w,f.a,f.b!,id,'offer',id)).toContain('I accept');expect(plan.status).toBe('dropped');expect(r.phase).toBe('packing');expect(f.a.hhId).toBe(f.b!.hhId);expect(conservationReport(f.w).ok).toBe(true);
 }finally{setExternalController(null);}
});
it('handover stops only the suspended activity explicitly attached to the transferred plan',()=>{
 for(const matching of [true,false]){const f=injured(),held=newActivity(f.w,f.a,{kind:'haul',label:'declared existing activity',goal:'existing work',targetId:f.st.id,utility:50,data:{forPlan:matching?f.plan.id:f.plan.id+100}});f.a.suspended=held;
  const id=f.w.nextId++;proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer');answerHandover(f.w,f.a,f.b,id,'offer',id);expect(f.a.suspended===null).toBe(matching);
 }
});
it('refuses altered cause or a personally known finished site before acceptance',()=>{
 for(const reason of ['recovered','site no longer known'] as const){const f=injured(),id=f.w.nextId++;proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer');if(reason==='recovered')delete f.a.injury;else delBelief(f.b,f.st.id);
  expect(answerHandover(f.w,f.a,f.b,id,'offer',id)).toContain('cannot');expect(f.plan.status).toBe('active');expect(personalHandovers(f.b)[0].state).toBe('declined');
 }
});
it('rejects malformed saved handover provenance, state and payload',()=>{
 for(const mutate of [(h:any)=>h.work.kind='invented',(h:any)=>h.work.heardAt=99,(h:any)=>h.work.worked=-1,(h:any)=>h.to=h.from,(h:any)=>h.helperPlan=-2]){const f=accepted();mutate(personalHandovers(f.a)[0]);expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/handover/);}
 const f=accepted();f.w.settings.rulesVersion=93;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/handover/);
});
it('a listener cannot accept a reserve handover by silently choosing a different known home store',()=>{
 const f=injured(),old=building({w:f.w,rng:null!},'lean_to',30,30,f.a.hhId),newHome=building({w:f.w,rng:null!},'hut',60,60,f.a.hhId);
 observe(f.w,f.a,old);observe(f.w,f.b,old);observe(f.w,f.b,newHome);snapshotInitial(f.w);
 f.plan.kind='stock';f.plan.aboutId=old.id;f.plan.goal='put food in the original home';f.plan.wants={};f.plan.reserve=8;f.plan.cue='hardship';const id=f.w.nextId++;
 proposeHandover(f.w,f.a,f.b,f.plan.id,id,'offer');expect(answerHandover(f.w,f.a,f.b,id,'offer',id)).toContain('different');expect(f.plan.status).toBe('active');expect(f.b.intentions.some(i=>i.status==='active'&&i.kind==='stock')).toBe(false);
});
