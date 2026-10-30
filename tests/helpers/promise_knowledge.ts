import {practicalCareScene} from './practical_care';
import {pin} from './kit';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,newActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {perceive} from '../../src/sim/perception';
export function remoteCompletionScene(version=80){
 const f=practicalCareScene(version),request=f.ask();if(request?.status!=='promised')throw new Error('No accepted watch');pin(f.parent);f.helper.cooldowns.pause=0;
 const watch=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`watch:${f.child.id}`)?.make?.();if(!watch)throw new Error('No offered watch');startActivity(f.w,f.helper,watch);
 let before=structuredClone(f.parent.relations[f.helper.id]);for(let n=0;n<1200&&request.status==='promised';n++){before=structuredClone(f.parent.relations[f.helper.id]);stepWorld(f.w);}if(String(request.status)!=='fulfilled')throw new Error('No physical completion');
 pin(f.helper);pin(f.child);f.w.sceneLabel='STAGED accepted childcare at a distance: actual work finishes before the parent can hear a report. No knowledge or completion is assigned.';
 return {...f,request,watch,before};
}
/** Separate staged rendezvous: the parent physically walks closer, then the helper has an ordinary offered reporting trip. */
export function completionReportScene(version=80){
 const f=remoteCompletionScene(version);f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged rendezvous approach',goal:'staged parent approach after completed work',tx:55,ty:40,spotX:55,spotY:40,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);
 for(let n=0;n<800&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);
 if(Math.hypot(f.parent.x-55,f.parent.y-40)>1)throw new Error('Parent did not physically approach');pin(f.parent);for(const p of [f.parent,f.helper])perceive(f.w,p);
 return f;
}
