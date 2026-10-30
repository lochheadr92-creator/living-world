// Rules-80 baseline: real accepted childcare, real parent departure, staged impassable terrain, actual failed journey and natural deadline.
import {practicalCareScene} from '../tests/helpers/practical_care';
import {pin} from '../tests/helpers/kit';
import {newActivity,startActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {T} from '../src/sim/types';
const f=practicalCareScene(80),r=f.ask();if(r?.status!=='promised')throw new Error('No accepted watch');pin(f.child);
const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged departure after asking',goal:'staged requester departure',tx:25,ty:40,spotX:25,spotY:40,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);
for(let n=0;n<850&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);pin(f.parent);if(Math.abs(f.parent.x-25)>1)throw new Error('Parent did not walk away');
for(let y=0;y<f.w.H;y++)f.w.terrain[y*f.w.W+54]=T.DEEP;
f.helper.cooldowns.pause=0;const watch=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`watch:${f.child.id}`)?.make?.();if(!watch)throw new Error('No offered watch');startActivity(f.w,f.helper,watch);
for(let n=0;n<200&&f.helper.activity?.id===watch.id;n++)stepWorld(f.w);const failed=structuredClone(f.helper.lastResult);pin(f.helper);
const c=f.helper.commitments.find(c=>c.requestId===r.id)!;
const snapshot=()=>({tick:f.w.tick,request:r.status,commitment:structuredClone(c),distance:Math.hypot(f.parent.x-f.helper.x,f.parent.y-f.helper.y),parentAlive:f.parent.alive,helperAlive:f.helper.alive,relation:structuredClone(f.parent.relations[f.helper.id]),heard:structuredClone(f.parent.heard??[]),failure:structuredClone(f.helper.failures[f.child.id]),requesterReceipt:f.parent.socialMemory?.find(m=>m.requestId===r.id)});
let before=snapshot();for(let n=0;n<4000&&c.status==='active';n++){before=snapshot();stepWorld(f.w);}
console.log(JSON.stringify({rules:80,staged:true,failedJourney:failed,before,after:snapshot(),conserved:conservationReport(f.w).ok},null,2));
