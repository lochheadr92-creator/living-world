// Staged full pack and spare water. The failed offered gift is selected explicitly.
import {indoorCareScene} from './indoor_care';
import {produce} from '../../src/sim/economy';
import {carryCap} from '../../src/sim/people';
import {perceive} from '../../src/sim/perception';
import {stepWorld} from '../../src/sim/world';
import {selectPrerequisite} from './tool_prerequisite';
export function careWaterScene(version=68){
 const f=indoorCareScene(version);f.elder.needs.hunger=90;f.elder.needs.thirst=20;
 produce(f.w,f.elder.inv,carryCap(f.w,f.elder),'grain',100,'staged full recipient pack');
 produce(f.w,f.helper.inv,carryCap(f.w,f.helper),'water',2,'staged spare helper water');
 perceive(f.w,f.helper);perceive(f.w,f.elder);
 f.w.sceneLabel='STAGED full-pack injured resident; initial offered water gift selected, recovery autonomous';
 const failGift=()=>{
  const selected=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
  try{for(let n=0;n<100&&f.helper.activity?.id===selected.act.id;n++)stepWorld(f.w);}finally{selected.restore();}
  if(f.helper.lastResult?.detail!=='they had no room to carry it')throw new Error('Expected real water capacity rejection');
 };
 return {...f,failGift,key:`care_water:${f.home.id}:${f.elder.id}`};
}
