// STAGED separate mornings and supplied worker. Each practice is a real, legally selected one-unit wood trip.
import {stage,addPerson,building,site,done,give} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {consume,conservationReport} from '../../src/sim/economy';
import {stepWorld} from '../../src/sim/world';
import {DAY} from '../../src/sim/constants';
import {selectPrerequisite} from './tool_prerequisite';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import type {Activity} from '../../src/sim/types';
export function dailyRoutineScene(version=70){
 const s=stage('daily-routine');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
 const p=addPerson(s,'Mara',40,40,{age:35,inv:{bread:4,water:3},hunger:100,thirst:100,energy:100,traits:{diligence:0.8,curiosity:0.2}});
 const home=building(s,'hut',36,34,p.hhId,{grain:12});s.w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const target=site(s,'storehouse',52,42,p.hhId,p.id),a=makeSource(s.w,'tree',36,40,6),b=makeSource(s.w,'tree',44,40,6);give(s.w,p,'axe');
 done(s);for(const e of [home,target,a,b])observe(s.w,p,e);
 const key=`gather:${a.id}`;
 const practice=(morning:number)=>{
  if(p.activity)throw new Error('Finish the previous activity first');
  s.w.tick=Math.max(s.w.tick,morning*DAY);p.x=40;p.y=40;p.needs.hunger=100;p.needs.thirst=100;p.needs.energy=100;p.needs.warmth=100;p.needs.safety=100;
  consume(s.w,p.inv,'wood',p.inv.wood??0,'staged use between practice mornings');
  for(const e of [home,target,a,b])observe(s.w,p,e);
  const selected=selectPrerequisite(s.w,p,key);
  try{const copy=deserializeWorld(serializeWorld(s.w));for(let n=0;n<700&&(p.activity as Activity|null)?.id===selected.act.id;n++){stepWorld(s.w);stepWorld(copy);}
   if(p.lastResult?.outcome!=='success'||selected.act.cycle<1)throw new Error('Practice did not complete: '+JSON.stringify(p.lastResult));
   if(serializeWorld(s.w)!==serializeWorld(copy)||!conservationReport(s.w).ok)throw new Error('Practice continuation or accounting failed');
  }finally{selected.restore();}
  return selected.act;
 };
 s.w.sceneLabel='STAGED supplied worker and three separate mornings; each wood trip executes through the engine';
 return {s,w:s.w,p,home,target,a,b,key,practice};
}
