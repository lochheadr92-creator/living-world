// Frozen rules-91 private appointment, actual speech, replacement and shared-food continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,newActivity} from '../../src/sim/activities';
import {cancelMeal} from '../../src/sim/meals';
import {leftoverScene} from './meal_leftovers';
import type {World} from '../../src/sim/types';
export function v91Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-91 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:91});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const f=leftoverScene(91,false);f.w.tick=f.meal.at-100;cancelMeal(f.w,f.meal,'declared distant interruption');f.guest.cooldowns.pause=0;
  const o=generateOptions(f.w,f.guest,true,true).options.find(o=>o.kind==='attend_meal');if(!o)throw new Error('Missing heard attendance offer');startActivity(f.w,f.guest,o.make!()!);
  for(let n=0;n<250&&f.guest.activity?.phase==='travel';n++)stepWorld(f.w);if(f.guest.activity?.phase!=='work'||f.meal.heard![f.guest.id].ended)throw new Error('Missing uninformed physical wait');
  const waiting=advance(f.w,750);if(f.meal.heard![f.guest.id].ended?.source!=='own timeout')throw new Error('Missing personal timeout');
  const g=leftoverScene(91,false);cancelMeal(g.w,g.meal,'I must see to my own supplies',g.host);g.host.cooldowns.pause=0;g.guest.cooldowns.pause=0;
  const act=newActivity(g.w,g.host,{kind:'socialize',label:'Staged cancellation conversation',goal:'communicate an ending',targetId:g.guest.id,targetType:'person',tx:g.guest.x,ty:g.guest.y,spotX:g.guest.x-1.35,spotY:g.guest.y,utility:100,minCommit:400,maxTicks:600,data:{purpose:'cancel_meeting',conv:{mealId:g.meal.id}}});startActivity(g.w,g.host,act);
  for(let n=0;n<300&&!g.meal.heard![g.guest.id].ended;n++)stepWorld(g.w);const update=g.meal.heard![g.host.id].updates?.[g.guest.id];if(!update||update.acknowledgedAt!==undefined)throw new Error('Missing heard-before-acknowledged boundary');
  const hearing=advance(g.w,150);if(update.acknowledgedAt===undefined)throw new Error('Missing actual acknowledgement');
  const h=leftoverScene(91,false);cancelMeal(h.w,h.meal,'I could not prepare the meal in time',h.host);h.w.tick+=120;h.host.cooldowns.pause=0;h.guest.cooldowns.pause=0;
  const offered=generateOptions(h.w,h.host,true,true).options.find(o=>o.key.includes(':reschedule:'));if(!offered)throw new Error('Missing replacement offer');startActivity(h.w,h.host,offered.make!()!);
  for(let n=0;n<350&&!h.meal.replacementId;n++)stepWorld(h.w);const replacement=h.w.meals.find(m=>m.replacesMealId===h.meal.id);if(!replacement||replacement.heard![h.guest.id].reply!=='pending')throw new Error('Missing unanswered replacement');
  const proposal=advance(h.w,180);if(!replacement.accepted.includes(h.guest.id))throw new Error('Missing voluntary answer');
  while(h.w.tick<replacement.at-80)stepWorld(h.w);
  for(const p of [h.host,h.guest]){const chosen=generateOptions(h.w,p,true,true).options.find(o=>o.kind===(p===h.host?'host_meal':'attend_meal'));if(!chosen)throw new Error('Missing shared food offer');startActivity(h.w,p,chosen.make!()!);}
  stepWorld(h.w);const food=advance(h.w,600);if(replacement.status!=='done'||replacement.ate.length!==2||h.w.ledger.consumed.bread!==2)throw new Error('Missing physical shared meal');
  return {ordinary,waiting,hearing,proposal,food};
 }finally{release();}
}
