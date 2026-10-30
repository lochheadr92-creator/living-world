// Rules-82 frozen reporting fixture: same declared preparation protocol as the rules-81 fixture, with a real heard expectation.
import {failedPromiseScene} from './promise_outcomes';
import {setExternalController} from '../../src/sim/external';
import {generateOptions} from '../../src/sim/decision';
import {newActivity,startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {pin} from './kit';
import {perceive} from '../../src/sim/perception';
export function expectationReportScene(){
 const f=failedPromiseScene(82,true);f.expire();
 for(const p of [f.parent,f.helper])p.cooldowns.pause=0;
 const restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:(_w,_p,ctx,ranked)=>{const o=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.need&&['hunger','thirst','energy'].includes(o.need)&&_p.needs[o.need]<50);return o?{kind:'pick',key:o.key}:{kind:'defer'};}});
 try{for(let n=0;n<4000;n++){stepWorld(f.w);if([f.parent,f.helper].every(p=>!p.activity&&['hunger','thirst','energy'].every(k=>p.needs[k as 'hunger'|'thirst'|'energy']>=40)))break;}}finally{restore();}
 for(const p of [f.parent,f.helper]){if(generateOptions(f.w,p,true,true).criticals.length)throw new Error('Reporting fixture still has urgent needs');pin(p);}
 const x=f.helper.x-4,y=f.helper.y;f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged rendezvous',goal:'staged meeting after failed promise',tx:x,ty:y,spotX:x,spotY:y,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);
 for(let n=0;n<850&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);if(Math.hypot(f.parent.x-x,f.parent.y-y)>1)throw new Error('Parent did not reach rendezvous '+JSON.stringify({tick:f.w.tick,parent:{x:f.parent.x,y:f.parent.y,needs:f.parent.needs,activity:f.parent.activity,result:f.parent.lastResult},helper:{x:f.helper.x,y:f.helper.y,needs:f.helper.needs}}));pin(f.parent);for(const p of [f.parent,f.helper])perceive(f.w,p);return f;
}
