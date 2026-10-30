// Staged real acceptance, requester inspection and return; no injected promise/cancellation.
import {targetPromiseScene} from './promise_targets';
import {destroyBuilding} from '../../src/sim/buildings';
import {newActivity,startActivity} from '../../src/sim/activities';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import {perceive} from '../../src/sim/perception';
import {pin} from './kit';
export function requesterCancellationScene(version=84){
 const f=targetPromiseScene(version);destroyBuilding(f.w,f.hut,'collapsed in a staged requester discovery');f.parent.cooldowns.pause=0;
 const inspect=newActivity(f.w,f.parent,{kind:'wander',label:'Staged return to own damaged home',goal:'staged requester inspection',tx:60,ty:41,spotX:60,spotY:41,minCommit:700,maxTicks:1000,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,inspect);if(!f.parent.activity)throw new Error('Actual inspection trip did not start');
 const restore=setExternalController({controls:(_w,p)=>p.id===f.parent.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&f.parent.activity?.id===inspect.id;n++)stepWorld(f.w);}finally{restore();}
 if(f.parent.beliefs[f.hut.id])throw new Error('Requester did not discover the absent target');pin(f.parent);return f;
}
export function cancellationContactScene(){
 const f=requesterCancellationScene(),x=f.helper.x+4,y=f.helper.y;f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged return to known helper',goal:'staged cancellation rendezvous',tx:x,ty:y,spotX:x,spotY:y,minCommit:700,maxTicks:1000,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.parent.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);}finally{restore();}
 if(Math.hypot(f.parent.x-x,f.parent.y-y)>1)throw new Error('Requester did not reach the rendezvous');pin(f.parent);for(const p of [f.parent,f.helper])perceive(f.w,p);return f;
}
