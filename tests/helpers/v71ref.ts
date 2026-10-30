// Freeze rules-71 ordinary and scoped-work behavior before its successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,ledgerConsume} from '../../src/sim/economy';
import {actionScopeScene} from './action_scope';
import {selectPrerequisite} from './tool_prerequisite';
import type {World} from '../../src/sim/types';
export function v71Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-71 reference');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:71});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=actionScopeScene(71);f.addDuty(240);const chosen=selectPrerequisite(f.w,f.p,f.key);chosen.restore();
 if(!chosen.act.data.workScope||chosen.act.amount!==1)throw new Error('Missing narrowed trip');const materialTrip=advance(f.w,600);
 const g=actionScopeScene(71,true),duty=g.addDuty(240),key=`operate:${g.yard!.id}:hew_planks`,work=selectPrerequisite(g.w,g.p,key);
 try{for(let n=0;n<700&&g.p.activity?.id===work.act.id;n++)stepWorld(g.w);}finally{work.restore();}
 if(g.p.lastResult?.outcome!=='partial'||!g.yard!.ops?.job?.progress)throw new Error('Missing retained paid work');
 const retainedWork=advance(deserializeWorld(serializeWorld(g.w)),600);
 duty.status='cancelled';const resume=selectPrerequisite(g.w,g.p,key);resume.restore();const resumed=advance(g.w,600);
 const h=actionScopeScene(71);h.addDuty(240);const lost=selectPrerequisite(h.w,h.p,h.key);lost.restore();ledgerConsume(h.w,'wood',h.tree.amount,'staged source loss');h.tree.amount=0;
 const depleted=advance(h.w,600);
 return {ordinary,materialTrip,retainedWork,resumed,depleted};
}
