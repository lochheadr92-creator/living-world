// Freeze current rules-66 ordinary behavior and resident care before any successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,produce} from '../../src/sim/economy';
import {leaveHome} from '../../src/sim/habitation';
import {perceive} from '../../src/sim/perception';
import {carryCap} from '../../src/sim/people';
import {killPerson} from '../../src/sim/lifecycle';
import {generateOptions} from '../../src/sim/decision';
import {residentCareScene} from './resident_care';
import {indoorCareScene} from './indoor_care';
import {selectPrerequisite} from './tool_prerequisite';
import type {World} from '../../src/sim/types';

export function v66Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-66 reference: save or resource mismatch');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:66});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=residentCareScene(66);
 for(let n=0;n<50&&!f.helper.activity?.data.residentCare;n++)stepWorld(f.w);
 if(!f.helper.activity?.data.residentCare||f.helper.activity.phase!=='travel')throw new Error('Missing actual return journey');
 const returningResident=advance(f.w,800);
 const g=residentCareScene(66);
 for(let n=0;n<300&&!(g.helper.activity?.data.residentCare&&g.helper.activity.phase==='work');n++)stepWorld(g.w);
 if(!g.helper.activity?.data.residentCare||g.helper.activity.phase!=='work')throw new Error('Missing actual hand-over');
 const indoorHandOver=advance(g.w,800);
 const water=indoorCareScene(66);water.elder.needs.hunger=90;water.elder.needs.thirst=20;
 produce(water.w,water.helper.inv,carryCap(water.w,water.helper),'water',2,'staged spare water');
 produce(water.w,water.elder.inv,carryCap(water.w,water.elder),'grain',100,'staged full recipient pack');
 produce(water.w,water.home.store.items,water.home.store.cap,'water',2,'staged home water');
 perceive(water.w,water.helper);leaveHome(water.w,water.helper);perceive(water.w,water.helper);
 const chosen=selectPrerequisite(water.w,water.helper,`give:${water.elder.id}:home`);chosen.restore();
 const fullWaterPack=advance(water.w,400);
 const missing=residentCareScene(66);killPerson(missing.w,missing.elder,'staged unseen death');
 if(!generateOptions(missing.w,missing.helper,true,true).options.some(o=>o.key===`give:${missing.elder.id}:home`))throw new Error('Hidden death changed the remembered care option');
 const unseenDeath=advance(missing.w,600);
 return {ordinary,returningResident,indoorHandOver,fullWaterPack,unseenDeath};
}
