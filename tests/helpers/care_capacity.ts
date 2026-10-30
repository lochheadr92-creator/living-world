// STAGED full pack. The original indoor-care fixture remains frozen for historical continuations.
import {indoorCareScene} from './indoor_care';
import {produce} from '../../src/sim/economy';
import {carryCap} from '../../src/sim/people';
import {stepWorld} from '../../src/sim/world';
import {selectPrerequisite} from './tool_prerequisite';
export function careCapacityScene(version=63){
 const f=indoorCareScene(version),cap=carryCap(f.w,f.elder);
 produce(f.w,f.elder.inv,cap,'wood',100,'staged full recipient pack');
 produce(f.w,f.elder.inv,cap,'seeds',100,'staged full recipient pack');
 f.w.sceneLabel='STAGED injured resident with a full pack; recovery choices are autonomous after the first selected hand-over';
 const failGift=()=>{
  const selected=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
  try{for(let n=0;n<100&&f.helper.activity?.id===selected.act.id;n++)stepWorld(f.w);}finally{selected.restore();}
  if(f.helper.lastResult?.detail!=='they had no room to carry it')throw new Error('Expected real capacity rejection');
 };
 return {...f,failGift};
}
