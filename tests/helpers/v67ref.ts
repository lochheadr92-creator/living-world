// Immutable rules-67 continuation: ordinary world, stored drinking and physical return.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,produce,consume} from '../../src/sim/economy';
import {leaveHome} from '../../src/sim/habitation';
import {perceive} from '../../src/sim/perception';
import {carryCap} from '../../src/sim/people';
import {abortActivity} from '../../src/sim/activities';
import {solidChanged} from '../../src/sim/registry';
import {indoorCareScene} from './indoor_care';
import {selectPrerequisite} from './tool_prerequisite';
import type {World} from '../../src/sim/types';

export function v67Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-67 reference');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:67});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const scene=()=>{
  const f=indoorCareScene(67);f.elder.needs.hunger=90;f.elder.needs.thirst=20;
  produce(f.w,f.elder.inv,carryCap(f.w,f.elder),'grain',100,'staged full pack');
  produce(f.w,f.home.store.items,f.home.store.cap,'water',6,'staged home water');
  perceive(f.w,f.elder);abortActivity(f.w,f.elder,'staged rest ended');return f;
 };
 const f=scene();f.elder.nextThink=f.w.tick;stepWorld(f.w);
 if(!f.elder.activity?.data.fromStore)throw new Error('Missing ordinary stored-water choice');
 const drinking=advance(f.w,400);
 const g=scene();g.elder.nextThink=g.w.tick;stepWorld(g.w);
 consume(g.w,g.home.store.items,'water',6,'staged competing use');const emptied=advance(g.w,400);
 const returning=(blocked:boolean)=>{
  const h=scene(),p=h.helper;perceive(h.w,p);
  if(leaveHome(h.w,p))throw new Error('Cannot leave');
  const departure=selectPrerequisite(h.w,p,'wander');
  try{for(let n=0;n<50;n++)stepWorld(h.w);}finally{departure.restore();}
  abortActivity(h.w,p,'staged departure ended');p.needs.thirst=20;
  const choice=selectPrerequisite(h.w,p,`drink:store:${h.home.id}`);choice.restore();
  if(blocked){h.w.solid[h.home.doorY*h.w.W+h.home.doorX]=1;solidChanged(h.w);}
  return advance(h.w,500);
 };
 return {ordinary,drinking,emptied,returning:returning(false),blocked:returning(true)};
}
