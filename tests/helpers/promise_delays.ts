import {stage,addPerson,site,done} from './kit';
import {observe} from '../../src/sim/knowledge';
import {relOf} from '../../src/sim/relations';
// Staged obstruction and physical rendezvous around real accepted obligations and failed approaches.
import {targetPromiseScene} from './promise_targets';
import {failedPromiseScene} from './promise_outcomes';
import {newActivity,startActivity} from '../../src/sim/activities';
import {generateOptions} from '../../src/sim/decision';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import {perceive} from '../../src/sim/perception';
import {pin} from './kit';
import {T,type World,type Person} from '../../src/sim/types';
function rendezvous(w:World,parent:Person,helper:Person){
 const x=helper.x-4,y=helper.y;parent.cooldowns.pause=0;const walk=newActivity(w,parent,{kind:'wander',label:'Staged return to delayed helper',goal:'staged delay rendezvous',tx:x,ty:y,spotX:x,spotY:y,minCommit:700,maxTicks:1000,duration:1,data:{sticky:true}});startActivity(w,parent,walk);
 const restore=setExternalController({controls:(_w,p)=>[parent.id,helper.id].includes(p.id),choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&parent.activity?.id===walk.id;n++)stepWorld(w);for(let n=0;n<400;n++)stepWorld(w);}finally{restore();}
 if(Math.hypot(parent.x-x,parent.y-y)>1)throw new Error('No physical rendezvous');for(const p of [parent,helper]){pin(p);perceive(w,p);}
}
export function repairDelayScene(version=85){
 const f=targetPromiseScene(version),originalTerrain=f.w.terrain.slice();for(let y=0;y<f.w.H;y++)f.w.terrain[y*f.w.W+54]=T.DEEP;
 f.helper.cooldowns.pause=0;const repair=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair'&&o.targetId===f.hut.id);if(!repair)throw new Error('No actual repair option');startActivity(f.w,f.helper,repair.make!()!);const id=f.helper.activity?.id;
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<200&&f.helper.activity?.id===id;n++)stepWorld(f.w);}finally{restore();}pin(f.helper);
 if(!f.c.attempt||f.c.status!=='active')throw new Error('Missing actual failed repair approach');rendezvous(f.w,f.parent,f.helper);return {...f,originalTerrain};
}
export function watchDelayScene(version=85){const f=failedPromiseScene(version,true);rendezvous(f.w,f.parent,f.helper);return {...f,c:f.commitment};}


export function contributedBuildScene(version=85){
 const s=stage('promised-building-share'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const parent=addPerson(s,'Ada',40,40,{age:34,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ben',42,40,{age:34,inv:{fruit:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),target=site(s,'hut',60,40,parent.hhId,parent.id,{wood:2,stone:1});done(s);
 for(const p of [parent,helper]){observe(w,p,target);perceive(w,p);}relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;pin(helper);
 const ask=generateOptions(w,parent,true,true).options.find(o=>o.tag==='recruit');if(!ask)throw new Error('Missing actual recruitment');startActivity(w,parent,ask.make!()!);for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='help_build'&&r.status!=='pending')&&!parent.convId)break;}
 const request=w.requests.find(r=>r.kind==='help_build')!,c=helper.commitments.find(c=>c.requestId===request.id)!;if(request.status!=='promised'||!c)throw new Error('No accepted building share');pin(parent);
 helper.cooldowns.pause=0;const build=generateOptions(w,helper,true,true).options.find(o=>o.kind==='build'&&o.targetId===target.id);if(!build)throw new Error('Missing actual building work');startActivity(w,helper,build.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===helper.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<600&&c.status==='active';n++)stepWorld(w);}finally{restore();}pin(helper);return {w,parent,helper,target,request,c};
}
