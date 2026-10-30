// Frozen rules-64 cases before a successor: ordinary world, care, competing tools and actual travel.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {observe} from '../../src/sim/knowledge';
import {conservationReport} from '../../src/sim/economy';
import {makeSource} from '../../src/sim/sources';
import {careCapacityScene} from './care_capacity';
import {cartPrerequisiteScene,selectPrerequisite} from './tool_prerequisite';
import {stage,addPerson,site,done,pin} from './kit';
import type {World} from '../../src/sim/types';
export function v64Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-64 reference: save or resource mismatch');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:64});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=careCapacityScene(64);f.failGift();f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;stepWorld(f.w);
 const care=advance(f.w,800);
 const t=cartPrerequisiteScene(64);t.target.required.planks=8;observe(t.w,t.p,t.target);t.p.cooldowns.pause=0;t.p.nextThink=t.w.tick;stepWorld(t.w);
 const competingTools=advance(t.w,1200);
 const s=stage('kept-target'),v=s.w;v.settings.dynamics='rich';v.settings.rulesVersion=64;v.tick=1000;
 const p=addPerson(s,'Hana',40.5,40.5,{age:30,hunger:100,thirst:100,energy:100,traits:{diligence:.9}});
 const target=site(s,'hut',44,34,p.hhId,p.id);target.required.wood=12;
 const far=makeSource(v,'tree',40,58,8);makeSource(v,'tree',41,53,8);makeSource(v,'tree',42,52,8);
 done(s);observe(v,p,target);observe(v,p,far);pin(p);p.cooldowns.trade=1e12;
 const selected=selectPrerequisite(v,p,`gather:${far.id}`);
 try{for(let i=0;i<85;i++)stepWorld(v);}finally{selected.restore();}
 if(p.y<50||p.activity?.id!==selected.act.id)throw new Error('Reference must retain actual travel before ordinary review');
 return {ordinary,care,competingTools,travellingSource:advance(v,800)};
}
