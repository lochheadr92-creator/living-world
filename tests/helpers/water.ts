import {stage,addPerson,done,pin} from './kit';
import {T} from '../../src/sim/types';
import type {World,Person} from '../../src/sim/types';
import {initializeWater,waterBodyAt} from '../../src/sim/hydrology';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {setExternalController} from '../../src/sim/external';

/** STAGED geography and initial personal needs. Actions use engine offers and physical execution. */
export function waterScene(version=87){
  const s=stage('bounded-water'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
  w.terrain[40*w.W+42]=T.SHALLOW;
  w.terrain[40*w.W+54]=T.SHALLOW;w.terrain[40*w.W+55]=T.DEEP;
  const p=addPerson(s,'Ada',40.5,40.5,{hunger:100,thirst:35,energy:100});
  initializeWater(w);done(s);pin(p);w.sceneLabel='STAGED · A small source dries; a remembered alternative remains';
  return {w,p,s,small:waterBodyAt(w,42,40)!,large:waterBodyAt(w,54,40)!};
}
export function startWaterOption(w:World,p:Person,key:string){
  p.cooldowns.pause=0;const o=generateOptions(w,p,true,true).options.find(o=>o.key===key),a=o?.make?.();
  if(!a)throw new Error('No offered water activity '+key);startActivity(w,p,a);return a;
}
export function finishWaterOption(w:World,p:Person,key:string){
  const a=startWaterOption(w,p,key),release=setExternalController({controls:(_w,q)=>q.id===p.id,choose:()=>({kind:'defer'})});
  try{for(let n=0;n<1000&&p.activity?.id===a.id;n++)stepWorld(w);if(p.activity?.id===a.id)throw new Error('Water activity timed out');}finally{release();}
  pin(p);return a;
}
