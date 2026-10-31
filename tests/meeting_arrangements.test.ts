import {expect,it} from 'vitest';
import {leftoverScene} from './helpers/meal_leftovers';
import {cancelMeal,mealOf} from '../src/sim/meals';
import {generateOptions} from '../src/sim/decision';
import {inviteAsk,inviteRespond} from '../src/sim/meals';
import {newActivity,startActivity,endActivity,stepActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {setExternalController} from '../src/sim/external';
import {conservationReport,foodUnits} from '../src/sim/economy';
import {receiveMeetingCancellation,acknowledgeMeetingCancellation,updateMeetingKnowledge,canForgetMeeting} from '../src/sim/meeting_knowledge';
import {addPerson} from './helpers/kit';
import {describePerson} from '../src/sim/inspect';
import type {World,Person} from '../src/sim/types';
import {killPerson} from '../src/sim/lifecycle';
import {destroyBuilding} from '../src/sim/buildings';
function talk(w:World,a:Person,b:Person,purpose:'invite'|'cancel_meeting',conv:Record<string,unknown>){
 a.cooldowns.pause=0;b.cooldowns.pause=0;
 const act=newActivity(w,a,{kind:'socialize',label:'Staged actual conversation',goal:'exercise communicated arrangement',targetId:b.id,targetType:'person',tx:b.x,ty:b.y,spotX:b.x-1.35,spotY:b.y,utility:100,minCommit:400,maxTicks:600,data:{purpose,conv}});startActivity(w,a,act);return act;
}
function freeze(){return setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});}
it('does not tell a distant accepted guest that a meal was cancelled or remove their heard appointment',()=>{
 const f=leftoverScene(91,false);f.guest.x=10;f.guest.y=10;
 const before=JSON.stringify(f.guest.log);cancelMeal(f.w,f.meal,'the host died');
 expect(JSON.stringify(f.guest.log)).toBe(before);expect(mealOf(f.w,f.guest)?.id).toBe(f.meal.id);
 f.w.tick=f.meal.at-20;expect(generateOptions(f.w,f.guest,true,true).options.some(o=>o.kind==='attend_meal')).toBe(true);
});
it('waits physically at an unknowingly cancelled place through a saved early arrival, then times out without inventing a cause',()=>{
 const f=leftoverScene(91,false);cancelMeal(f.w,f.meal,'the host died');f.guest.cooldowns.pause=0;f.w.tick=f.meal.at-120;
 const undo=freeze();try{
  const o=generateOptions(f.w,f.guest,true,true).options.find(o=>o.kind==='attend_meal')!;expect(o).toBeTruthy();startActivity(f.w,f.guest,o.make!()!);
  for(let n=0;n<200&&f.guest.activity?.phase==='travel';n++)stepWorld(f.w);
  expect(f.guest.activity?.phase).toBe('work');expect(f.meal.heard![f.guest.id].ended).toBeUndefined();
  const twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<750;n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(f.meal.heard![f.guest.id].ended?.source).toBe('own timeout');
  expect(f.meal.heard![f.guest.id].ended?.reason).not.toContain('died');expect(f.guest.activity).toBeNull();expect(conservationReport(f.w).ok).toBe(true);
 }finally{undo();}
});
it('keeps a guest in another interior uninformed and rejects remote cancellation or acknowledgement speech',()=>{
 const f=leftoverScene(91,false);f.guest.indoors=f.hall.id;cancelMeal(f.w,f.meal,'I must leave',f.host);
 expect(f.meal.heard![f.guest.id].ended).toBeUndefined();const before=serializeWorld(f.w);
 expect(receiveMeetingCancellation(f.w,f.host,f.guest,f.meal.id,99)).toBeNull();expect(acknowledgeMeetingCancellation(f.w,f.host,f.guest,f.meal.id)).toBe(false);
 expect(serializeWorld(f.w)).toBe(before);
});
it('actually conveys a cancellation and separate acknowledgement through the conversation engine with a save between phases',()=>{
 const f=leftoverScene(91,false);cancelMeal(f.w,f.meal,'I need to attend to my own supplies',f.host);const undo=freeze();
 try{talk(f.w,f.host,f.guest,'cancel_meeting',{mealId:f.meal.id});
  for(let n=0;n<300&&!f.meal.heard![f.guest.id].ended;n++)stepWorld(f.w);
  const k=f.meal.heard![f.host.id];expect(f.meal.heard![f.guest.id].ended?.source).toBe('host statement');expect(k.updates![f.guest.id].acknowledgedAt).toBeUndefined();
  const twin=deserializeWorld(serializeWorld(f.w));for(let n=0;n<200;n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(k.updates![f.guest.id].acknowledgedAt).toBeTypeOf('number');expect(mealOf(f.w,f.guest)).toBeNull();
 }finally{undo();}
});
it.each([false,true])('interruption preserves whether cancellation was actually heard (heard %s)',heard=>{
 const f=leftoverScene(91,false);cancelMeal(f.w,f.meal,'I need to leave',f.host);const undo=freeze();
 try{talk(f.w,f.host,f.guest,'cancel_meeting',{mealId:f.meal.id});
  for(let n=0;n<300;n++){stepWorld(f.w);if(heard?!!f.meal.heard![f.guest.id].ended:!!f.host.convId)break;}
  f.guest.x=10;f.guest.y=10;stepWorld(f.w);
  expect(!!f.meal.heard![f.guest.id].ended).toBe(heard);expect(f.meal.heard![f.host.id].updates?.[f.guest.id]?.acknowledgedAt).toBeUndefined();
 }finally{undo();}
});
it('physically serves an agreed meal, records experienced food and keeps current observer views pure',()=>{
 const f=leftoverScene(91,false);f.w.tick=f.meal.at-80;const undo=freeze();
 try{for(const p of [f.host,f.guest]){p.cooldowns.pause=0;const o=generateOptions(f.w,p,true,true).options.find(o=>o.kind===(p===f.host?'host_meal':'attend_meal'))!;expect(o).toBeTruthy();startActivity(f.w,p,o.make!()!);}
  for(let n=0;n<1300&&f.meal.status!=='done';n++)stepWorld(f.w);
  expect(f.meal.status).toBe('done');expect(f.meal.ate).toEqual(expect.arrayContaining([f.host.id,f.guest.id]));expect(f.guest.relations[f.host.id].meeting?.outcome).toBe('ate');
  expect(mealOf(f.w,f.host)).toBeNull();expect(generateOptions(f.w,f.host,true,true).options.some(o=>o.kind==='host_meal')).toBe(false);
  const saved=serializeWorld(f.w);describePerson(f.w,f.host.id);describePerson(f.w,f.guest.id);generateOptions(f.w,f.host,true,true);expect(serializeWorld(f.w)).toBe(saved);expect(conservationReport(f.w).ok).toBe(true);
 }finally{undo();}
});
it('agrees one replacement time through actual conversation without changing an uninformed guest or moving old food',()=>{
 const f=leftoverScene(91,false),other=addPerson(f,'Other',46,46,{hunger:60,traits:{sociability:1}});
 other.relations[f.host.id]={...f.guest.relations[f.host.id],history:[]};inviteAsk(f.w,f.host,other,{mealId:f.meal.id});inviteRespond(f.w,f.host,other,f.meal.id);
 expect(f.meal.accepted).toContain(other.id);const oldAt=f.meal.at;cancelMeal(f.w,f.meal,'I could not get the table ready in time',f.host);f.w.tick+=120;
 const undo=freeze();try{
  f.host.cooldowns.pause=0;f.guest.cooldowns.pause=0;const option=generateOptions(f.w,f.host,true,true).options.find(o=>o.key.includes(':reschedule:'))!;expect(option).toBeTruthy();startActivity(f.w,f.host,option.make!()!);
  for(let n=0;n<500&&!f.meal.replacementId;n++)stepWorld(f.w);for(let n=0;n<150;n++)stepWorld(f.w);
  const replacement=f.w.meals.find(m=>m.replacesMealId===f.meal.id)!;expect(replacement).toBeTruthy();expect(replacement.accepted).toContain(f.guest.id);expect(replacement.at-replacement.created).toBe(760);
  expect(f.meal.heard![other.id].ended).toBeUndefined();expect(f.meal.heard![other.id].at).toBe(oldAt);expect(f.meal.table).toEqual({});expect(foodUnits(f.host.inv)).toBe(6);expect(conservationReport(f.w).ok).toBe(true);
  cancelMeal(f.w,replacement,'second interruption',f.host);f.w.tick+=120;expect(generateOptions(f.w,f.host,true,true).options.some(o=>o.key.includes(':reschedule:'))).toBe(false);
 }finally{undo();}
});
it('preserves a refusal of the new arrangement rather than moving the original promise to a new time',()=>{
 const f=leftoverScene(91,false);cancelMeal(f.w,f.meal,'I had to leave',f.host);
 const undo=freeze();try{talk(f.w,f.host,f.guest,'invite',{replacesMealId:f.meal.id,mealPlan:{placeId:f.hall.id,placeName:'the communal hall',x:43.5,y:45.4}});
  for(let n=0;n<250&&!f.meal.replacementId;n++)stepWorld(f.w);f.guest.needs.thirst=20;for(let n=0;n<100;n++)stepWorld(f.w);const replacement=f.w.meals.find(m=>m.replacesMealId===f.meal.id)!;
  expect(replacement).toBeTruthy();expect(replacement.accepted).toHaveLength(0);expect(replacement.heard![f.guest.id].reply).toBe('refused');expect(mealOf(f.w,f.guest)).toBeNull();
 }finally{undo();}
});
it('does not lay food for a guest whose refusal the host actually heard',()=>{
 const f=leftoverScene(91,false);f.w.meals=[];f.guest.needs.thirst=10;
 const id=inviteAsk(f.w,f.host,f.guest,{mealPlan:{placeId:f.hall.id,placeName:'the communal hall',x:43.5,y:45.4}});
 inviteRespond(f.w,f.host,f.guest,id);const m=f.w.meals.find(m=>m.id===id)!;expect(m.accepted).toHaveLength(0);
 f.w.tick=m.at-160;expect(generateOptions(f.w,f.host,true,true).options.some(o=>o.kind==='host_meal')).toBe(false);
});
it.each(['death','place loss'] as const)('keeps distant %s separate from the guest\'s appointment',cause=>{
 const f=leftoverScene(91,false);f.guest.x=10;f.guest.y=10;f.host.x=60;f.host.y=60;
 if(cause==='death')killPerson(f.w,f.host,'declared distant loss');else destroyBuilding(f.w,f.hall,'declared distant loss');
 const undo=freeze();try{for(let n=0;n<10;n++)stepWorld(f.w);expect(f.meal.status).toBe('cancelled');expect(f.meal.heard![f.guest.id].ended).toBeUndefined();expect(mealOf(f.w,f.guest)?.id).toBe(f.meal.id);}finally{undo();}
});
it('retains unheard appointments through operational pruning and expires unanswered invitations without filling history forever',()=>{
 const f=leftoverScene(91,false);cancelMeal(f.w,f.meal,'distant cancellation');expect(canForgetMeeting(f.w,f.meal)).toBe(false);
 f.w.tick=f.meal.at+1101;updateMeetingKnowledge(f.w,f.meal);expect(canForgetMeeting(f.w,f.meal)).toBe(true);
 const id=inviteAsk(f.w,f.host,f.guest,{mealPlan:{placeId:f.hall.id,placeName:'the communal hall',x:43.5,y:45.4}}),m=f.w.meals.find(m=>m.id===id)!;
 expect(m.heard![f.guest.id].reply).toBe('pending');f.w.tick=m.at+1101;updateMeetingKnowledge(f.w,m);expect(m.heard![f.guest.id].ended?.reason).toMatch(/without my acceptance/);
});
it('retains the original timeout but revises unknown cause when a later explanation is actually heard, once',()=>{
 const f=leftoverScene(91,false);cancelMeal(f.w,f.meal,'I did not have enough food',f.host);f.w.tick=f.meal.at+501;updateMeetingKnowledge(f.w,f.meal);
 expect(f.guest.relations[f.host.id].meeting?.confidence).toBe('cause unknown');const timeout={...f.meal.heard![f.guest.id].ended!};
 expect(receiveMeetingCancellation(f.w,f.host,f.guest,f.meal.id,999)).toBeTruthy();expect(acknowledgeMeetingCancellation(f.w,f.host,f.guest,f.meal.id)).toBe(true);
 expect(f.meal.heard![f.guest.id].ended).toEqual(timeout);expect(f.guest.relations[f.host.id].meeting?.confidence).toBe('reported');const before=serializeWorld(f.w);
 receiveMeetingCancellation(f.w,f.host,f.guest,f.meal.id,999);acknowledgeMeetingCancellation(f.w,f.host,f.guest,f.meal.id);expect(serializeWorld(f.w)).toBe(before);expect(()=>deserializeWorld(before)).not.toThrow();
});
it('retains a relevant outcome beyond the operational meal and uses it for more preparation in a later invitation',()=>{
 const f=leftoverScene(91,false);cancelMeal(f.w,f.meal,'I ran out of preparation time',f.host);f.w.meals=[];
 const id=inviteAsk(f.w,f.host,f.guest,{mealPlan:{placeId:f.hall.id,placeName:'the communal hall',x:43.5,y:45.4}}),m=f.w.meals.find(m=>m.id===id)!;
 expect(m.at-m.created).toBe(760);expect(f.host.relations[f.guest.id].meeting?.mealId).toBe(f.meal.id);
 expect(f.host.relations[f.guest.id].trust).toBe(10);expect(()=>deserializeWorld(serializeWorld(f.w))).not.toThrow();
});
it('rejects malformed heard provenance and does not accept repeated replies twice',()=>{
 const f=leftoverScene(91,false);inviteRespond(f.w,f.host,f.guest,f.meal.id);expect(f.meal.accepted).toEqual([f.guest.id]);
 f.meal.heard![f.guest.id].from=f.guest.id;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/heard meeting/);
});
it('connects a real invitation conversation to saved travel, a physical table and useful shared food',()=>{
 const f=leftoverScene(91,false);f.w.meals=[];const undo=freeze();
 try{talk(f.w,f.host,f.guest,'invite',{mealPlan:{placeId:f.hall.id,placeName:'the communal hall',x:43.5,y:45.4}});
  for(let n=0;n<350;n++)stepWorld(f.w);const meal=f.w.meals[0];expect(meal.accepted).toContain(f.guest.id);expect(meal.heard![f.guest.id].conversationId).toBeGreaterThan(0);
  for(let n=0;n<700&&f.w.tick<meal.at-80;n++)stepWorld(f.w);
  for(const p of [f.host,f.guest]){const o=generateOptions(f.w,p,true,true).options.find(o=>o.kind===(p===f.host?'host_meal':'attend_meal'))!;expect(o).toBeTruthy();startActivity(f.w,p,o.make!()!);}
  stepWorld(f.w);const twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<1400&&meal.status!=='done';n++){stepWorld(f.w);stepWorld(twin);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(meal.status).toBe('done');expect(meal.ate).toHaveLength(2);expect(f.w.ledger.consumed.bread).toBe(2);expect(conservationReport(f.w).ok).toBe(true);
 }finally{undo();}
});
