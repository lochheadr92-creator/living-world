// Explicit rules-84 diagnostic: an actual failed watch approach while the accepted promise remains active.
import {failedPromiseScene} from '../tests/helpers/promise_outcomes';
import {newActivity,startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {perceive} from '../src/sim/perception';
import {pin} from '../tests/helpers/kit';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=failedPromiseScene(84,true),before={tick:f.w.tick,attempt:structuredClone(f.commitment.attempt),status:f.commitment.status,deadline:f.commitment.deadline};
const x=f.helper.x-4,y=f.helper.y;f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged return to delayed helper',goal:'staged delay rendezvous',tx:x,ty:y,spotX:x,spotY:y,minCommit:700,maxTicks:1000,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);
const restore=setExternalController({controls:(_w,p)=>p.id===f.parent.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);}finally{restore();}if(Math.hypot(f.parent.x-x,f.parent.y-y)>1)throw new Error('No physical rendezvous');pin(f.parent);for(const p of [f.parent,f.helper])perceive(f.w,p);
const raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true),ranked=rankOptions(ctx);console.log(JSON.stringify({rules:84,staged:true,before,after:{tick:f.w.tick,status:f.commitment.status,attempt:f.commitment.attempt,requester:f.parent.socialMemory?.find(m=>m.requestId===f.request.id),helperNeeds:f.helper.needs,critical:ctx.criticals,childAlive:f.child.alive,options:ranked.slice(0,12).map(o=>({key:o.key,label:o.label,util:o.util})),communication:ctx.options.filter(o=>o.tag==='report'||o.key.includes('delay')).map(o=>o.key)},observerPure:serializeWorld(f.w)===raw,saveEqual:serializeWorld(deserializeWorld(raw))===raw,conserved:conservationReport(f.w).ok},null,2));
