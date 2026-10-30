// Frozen rules-81 fixture: actual accepted watch and travel failure; explicitly staged impassable strip.
import {practicalCareScene} from './practical_care';
import {setExternalController} from '../../src/sim/external';
import {rankOptions} from '../../src/sim/decision';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {stage,addPerson,done} from './kit';
import {pin} from './kit';
import {newActivity,startActivity} from '../../src/sim/activities';
import {generateOptions} from '../../src/sim/decision';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {T} from '../../src/sim/types';

export function failedPromiseScene(version=81,supplied=false){
const f=supplied?suppliedCareScene(version):practicalCareScene(version),r=f.ask();if(r?.status!=='promised')throw new Error('No accepted watch');pin(f.child);
const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged departure after asking',goal:'staged requester departure',tx:25,ty:40,spotX:25,spotY:40,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);
for(let n=0;n<850&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);pin(f.parent);if(Math.abs(f.parent.x-25)>1)throw new Error('Parent did not walk away');
const originalTerrain=f.w.terrain.slice();
for(let y=0;y<f.w.H;y++)f.w.terrain[y*f.w.W+54]=T.DEEP;
f.helper.cooldowns.pause=0;const watch=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`watch:${f.child.id}`)?.make?.();if(!watch)throw new Error('No offered watch');startActivity(f.w,f.helper,watch);
for(let n=0;n<200&&f.helper.activity?.id===watch.id;n++)stepWorld(f.w);const failed=structuredClone(f.helper.lastResult);pin(f.helper);
const c=f.helper.commitments.find(c=>c.requestId===r.id)!;
const snapshot=()=>({tick:f.w.tick,request:r.status,commitment:structuredClone(c),distance:Math.hypot(f.parent.x-f.helper.x,f.parent.y-f.helper.y),parentAlive:f.parent.alive,helperAlive:f.helper.alive,relation:structuredClone(f.parent.relations[f.helper.id]),heard:structuredClone(f.parent.heard??[]),failure:structuredClone(f.helper.failures[f.child.id]),requesterReceipt:f.parent.socialMemory?.find(m=>m.requestId===r.id)});
const expire=()=>{let before=snapshot();for(let n=0;n<4000&&c.status==='active';n++){before=snapshot();stepWorld(f.w);}return {before,after:snapshot()};};
return {...f,request:r,commitment:c,watch,failed,expire,originalTerrain};

}

function suppliedCareScene(version:number){
 const s=stage('practical-care-watch'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const parent=addPerson(s,'Ada',40,40,{inv:{bread:4,water:2},age:34,hunger:100,thirst:100,energy:100});
 const child=addPerson(s,'Eli',64,40,{age:5,hh:parent.hhId,hunger:40,thirst:80,energy:80});
 const helper=addPerson(s,'Ben',42,40,{age:33,inv:{bread:8,water:3},hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1,diligence:1}});
 parent.injury={kind:'sprain',since:0,until:5000,how:'staged provider injury'};
 done(s);pin(helper);
 relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;
 relOf(parent,helper.id).trust=70;relOf(helper,parent.id).trust=70;
 parent.whereabouts[child.id]={x:child.x,y:child.y,tick:w.tick};
 for(const p of [parent,helper,child])perceive(w,p);
 startActivity(w,child,newActivity(w,child,{kind:'rest',label:'Resting (staged)',goal:'staged: staying at the remembered place',here:true,minCommit:1600,maxTicks:1800,amount:1600,data:{sticky:true}}));
 w.sceneLabel='TEST SCENE: injured parent asks a neighbour to watch a child at a remembered place';
 const ask=()=>{
  const o=generateOptions(w,parent,true,true).options.find(o=>o.kind==='socialize'&&o.label.includes('keep an eye on'));
  if(!o?.make)throw new Error('No actual watch request offered');
  startActivity(w,parent,o.make()!);
  for(let i=0;i<600;i++){stepWorld(w);if(w.requests.some(r=>r.kind==='watch'&&r.status!=='pending')&&!parent.convId)break;}
  return w.requests.find(r=>r.kind==='watch');
 };
 return {w,parent,child,helper,ask};
}

/** Separate reporting scene: declared initial supplies, real eating/drinking after the deadline, then a physical rendezvous. */
export function outcomeReportScene(){
 const f=failedPromiseScene(81,true);f.expire();
 for(const p of [f.parent,f.helper])p.cooldowns.pause=0;
 const restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:(_w,_p,ctx,ranked)=>{const o=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.need&&['hunger','thirst','energy'].includes(o.need)&&_p.needs[o.need]<50);return o?{kind:'pick',key:o.key}:{kind:'defer'};}});
 try{for(let n=0;n<4000;n++){stepWorld(f.w);if([f.parent,f.helper].every(p=>!p.activity&&['hunger','thirst','energy'].every(k=>p.needs[k as 'hunger'|'thirst'|'energy']>=40)))break;}}finally{restore();}
 for(const p of [f.parent,f.helper]){if(generateOptions(f.w,p,true,true).criticals.length)throw new Error('Reporting fixture still has urgent needs');pin(p);}
 const x=f.helper.x-4,y=f.helper.y;f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged rendezvous',goal:'staged meeting after failed promise',tx:x,ty:y,spotX:x,spotY:y,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);
 for(let n=0;n<850&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);if(Math.hypot(f.parent.x-x,f.parent.y-y)>1)throw new Error('Parent did not reach rendezvous '+JSON.stringify({tick:f.w.tick,parent:{x:f.parent.x,y:f.parent.y,needs:f.parent.needs,activity:f.parent.activity,result:f.parent.lastResult},helper:{x:f.helper.x,y:f.helper.y,needs:f.helper.needs}}));pin(f.parent);for(const p of [f.parent,f.helper])perceive(f.w,p);return f;
}
