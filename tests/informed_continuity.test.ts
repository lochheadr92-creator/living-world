import {expect,it} from 'vitest';
import {continuityScene} from './helpers/continuity';
import {generateOptions} from '../src/sim/decision';
import {successionWanted,successionBlocker,takeUp,cancelUnfinished} from '../src/sim/succession';
import {killPerson} from '../src/sim/lifecycle';
import {cancelSite} from '../src/sim/buildings';
import {observe} from '../src/sim/knowledge';
import {transfer,conservationReport} from '../src/sim/economy';
import {hearUndertaking,acknowledgeUndertaking,setContinuityKnowledge} from '../src/sim/continuity_knowledge';
import {startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {reviewIntentions} from '../src/sim/intent';
import {perceive} from '../src/sim/perception';
import {describePerson} from '../src/sim/inspect';
import {relationshipHistory} from '../src/sim/history';
import {building} from './helpers/kit';
function talk(f:ReturnType<typeof continuityScene>){
 f.a.cooldowns.pause=0;f.b.cooldowns.pause=0;perceive(f.w,f.a);perceive(f.w,f.b);
 // Declared listener awaiting this conversation, not independently starting another project first.
 f.b.nextThink=f.w.tick+600;
 const offered=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('share_work'));expect(offered).toBeDefined();startActivity(f.w,f.a,offered!.make!()!);
}
it('death knowledge alone does not disclose an uncommunicated private undertaking',()=>{
 const f=continuityScene();killPerson(f.w,f.a,'declared staged loss');expect(f.b.relations[f.a.id].deathKnown).toBeDefined();
 expect(successionWanted(generateOptions(f.w,f.b,true,true))).toBeNull();
});
it('remote tools and remote site removal do not update a survivor\'s knowledge',()=>{
 const f=continuityScene();killPerson(f.w,f.a,'declared staged loss');const u=f.w.households.find(h=>h.id===f.b.hhId)!.unfinished![0];
 expect(successionBlocker(generateOptions(f.w,f.b,true,true),{...u,kind:'tool',makes:'axe',aboutId:0})).toBe('');
 cancelSite(f.w,f.st,'declared remote cancellation');expect(successionBlocker(generateOptions(f.w,f.b,true,true),u)).toBe('');
});
it('a past death witness does not refresh remote belongings when taking up work',()=>{
 const f=continuityScene();killPerson(f.w,f.a,'declared staged loss');const u=f.w.households.find(h=>h.id===f.b.hhId)!.unfinished![0],pile=f.w.piles.find(p=>p.id===u.pileId)!;
 observe(f.w,f.b,pile);const remembered=JSON.stringify(f.b.beliefs[pile.id]);f.b.x=10;f.b.y=10;
 transfer(f.w,pile.items,f.c.inv,12,'wood',3,'pile:'+pile.id,'person:'+f.c.id,'declared prior removal');f.w.tick=100;
 takeUp(f.w,f.b,u,{...f.plan,id:f.w.nextId++});expect(JSON.stringify(f.b.beliefs[pile.id])).toBe(remembered);expect(conservationReport(f.w).ok).toBe(true);
});
it('one person\'s missing knowledge cannot erase another successor\'s opportunity',()=>{
 const f=continuityScene();killPerson(f.w,f.a,'declared staged loss');const hh=f.w.households.find(h=>h.id===f.b.hhId)!,u=hh.unfinished![0];
 cancelUnfinished(f.w,f.c,u,'does not know of the site');expect(hh.unfinished?.some(x=>x.id===u.id)).toBe(true);
});
it('actual speech, separate acknowledgement and saved continuation inform one voluntary successor and preserve real site delivery',()=>{
 const f=continuityScene(92,true),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  talk(f);for(let n=0;n<300&&!f.b.relations[f.a.id]?.workHeard?.length;n++)stepWorld(f.w);
  const heard=f.b.relations[f.a.id].workHeard![0];expect(heard.planId).toBe(f.plan.id);expect(heard.conversationId).toBe(f.a.convId);expect(f.a.relations[f.b.id].workTold![0].acknowledgedAt).toBeUndefined();
  const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<30;n++){stepWorld(f.w);stepWorld(twin);}expect(serializeWorld(twin)).toBe(serializeWorld(f.w));expect(f.a.relations[f.b.id].workTold![0].acknowledgedAt).toBeGreaterThan(heard.heardAt);
  expect(f.b.commitments).toHaveLength(0);expect(f.b.intentions.some(i=>i.succeeding)).toBe(false);
  const before=serializeWorld(f.w);describePerson(f.w,f.b.id);relationshipHistory(f.w,f.b);generateOptions(f.w,f.b,true,true);expect(serializeWorld(f.w)).toBe(before);
  f.plan.worked=37;killPerson(f.w,f.a,'declared staged loss after communication');
  const known=successionWanted(generateOptions(f.w,f.b,true,true));expect(known,JSON.stringify({plans:f.b.intentions,death:f.b.relations[f.a.id].deathKnown,heard:f.b.relations[f.a.id].workHeard,unfinished:f.w.households.find(h=>h.id===f.b.hhId)!.unfinished})).not.toBeNull();expect(known?.worked).toBe(0);expect(known?.carried).toEqual({});expect(known?.pileId).toBe(0);
  reviewIntentions(generateOptions(f.w,f.b,true));expect(f.b.intentions.find(i=>i.status==='active'&&i.succeeding)?.succeeding?.from).toBe(f.a.id);
  expect(f.w.households.find(h=>h.id===f.b.hhId)!.unfinished).toBeUndefined();expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
 // Actual ordinary gathering/hauling from the visible death pile, no copied inventory.
 for(let n=0;n<3000&&(f.st.delivered.wood??0)<1;n++)stepWorld(f.w);
 expect(f.st.delivered.wood??0).toBeGreaterThan(0);expect(f.b.intentions.find(i=>i.succeeding)?.status).toBe('active');expect(conservationReport(f.w).ok).toBe(true);
});
it('wall separation, sleeping and leaving contact prevent work information or acknowledgement',()=>{
 const f=continuityScene();const hall=building({w:f.w,rng:null!},'hut',38,38,f.a.hhId);f.b.indoors=hall.id;
 const before=serializeWorld(f.w);expect(hearUndertaking(f.w,f.a,f.b,f.plan.id,99)).toBeNull();expect(acknowledgeUndertaking(f.w,f.a,f.b,f.plan.id,99)).toBe(false);expect(serializeWorld(f.w)).toBe(before);
 delete f.b.indoors;f.b.pose='sleep';expect(hearUndertaking(f.w,f.a,f.b,f.plan.id,99)).toBeNull();
 f.b.pose='stand';expect(hearUndertaking(f.w,f.a,f.b,f.plan.id,99)).toBeTruthy();f.b.x=60;expect(acknowledgeUndertaking(f.w,f.a,f.b,f.plan.id,99)).toBe(false);
});
it.each([false,true])('interrupted actual speech preserves only what was heard (heard %s)',heard=>{
 const f=continuityScene(),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{
  talk(f);for(let n=0;n<300;n++){stepWorld(f.w);if(heard?!!f.b.relations[f.a.id]?.workHeard?.length:!!f.a.convId)break;}
  f.b.x=65;for(let n=0;n<6;n++)stepWorld(f.w);expect(!!f.b.relations[f.a.id]?.workHeard?.length).toBe(heard);
  expect(f.a.relations[f.b.id]?.workTold?.[0].acknowledgedAt).toBeUndefined();expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
 }finally{release();}
});
it('two informed survivors cannot both inherit the one undertaking, and a stale snapshot cannot disclose later progress',()=>{
 const f=continuityScene();expect(hearUndertaking(f.w,f.a,f.b,f.plan.id,99)).toBeTruthy();f.c.x=41.5;f.c.y=41.5;expect(hearUndertaking(f.w,f.a,f.c,f.plan.id,100)).toBeTruthy();
 killPerson(f.w,f.a,'declared staged loss');reviewIntentions(generateOptions(f.w,f.b,true));reviewIntentions(generateOptions(f.w,f.c,true));
 expect([f.b,f.c].flatMap(p=>p.intentions.filter(i=>i.succeeding))).toHaveLength(1);
});
it('hearing is bounded, does not transfer skills or possessions, hashes provenance and rejects malformed saves',()=>{
 const f=continuityScene(),skills=JSON.stringify(f.b.skills),inv=JSON.stringify(f.b.inv);
 for(let n=0;n<3;n++){const i={...f.plan,id:f.w.nextId++};f.a.intentions=[i];expect(hearUndertaking(f.w,f.a,f.b,i.id,100+n)).toBeTruthy();}
 expect(f.b.relations[f.a.id].workHeard).toHaveLength(2);expect(JSON.stringify(f.b.skills)).toBe(skills);expect(JSON.stringify(f.b.inv)).toBe(inv);
 const before=hashWorld(f.w);f.b.relations[f.a.id].workHeard![0].conversationId++;expect(hashWorld(f.w)).not.toBe(before);
 f.b.relations[f.a.id].workHeard![0].from=f.c.id;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/undertaking/);
});
it('the isolated removal restores historical succession knowledge without changing rules 91',()=>{
 const f=continuityScene();setContinuityKnowledge(false);try{killPerson(f.w,f.a,'declared staged loss');expect(successionWanted(generateOptions(f.w,f.b,true,true))).not.toBeNull();}finally{setContinuityKnowledge(true);}
});
it('one\'s own active project remains a reason not to inherit another of the same kind',()=>{
 const f=continuityScene();hearUndertaking(f.w,f.a,f.b,f.plan.id,99);f.b.intentions.push({...f.plan,id:f.w.nextId++});killPerson(f.w,f.a,'declared staged loss');
 expect(successionWanted(generateOptions(f.w,f.b,true,true))).toBeNull();expect(f.w.households.find(h=>h.id===f.b.hhId)!.unfinished).toHaveLength(1);
});
it('the communicated site remains dated, never reveals remote removal, and cannot overwrite newer personal knowledge',()=>{
 const f=continuityScene();delete f.b.beliefs[f.st.id];cancelSite(f.w,f.st,'declared remote cancellation');f.w.tick=100;
 hearUndertaking(f.w,f.a,f.b,f.plan.id,99);expect(f.b.beliefs[f.st.id]).toMatchObject({src:'told',from:f.a.id,seen:0,learned:100});
 f.b.beliefs[f.st.id].seen=100;f.b.beliefs[f.st.id].src='seen';hearUndertaking(f.w,f.a,f.b,f.plan.id,100);expect(f.b.beliefs[f.st.id].src).toBe('seen');
});
it('a listener with urgent needs can refuse the actual conversation without learning the plan',()=>{
 const f=continuityScene(),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{
  f.b.needs.thirst=10;talk(f);for(let n=0;n<100;n++)stepWorld(f.w);
  expect(f.b.relations[f.a.id]?.workHeard).toBeUndefined();expect(f.a.log.some(l=>l.text.includes('pressing needs'))).toBe(true);
 }finally{release();}
});
