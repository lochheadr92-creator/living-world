// Frozen rules-65 continuations before a successor: ordinary population, real journeys and resident care.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {leaveHome} from '../../src/sim/habitation';
import {sourceJourney,storeJourney,waterJourney,walkFor} from './kept_target';
import {indoorCareScene} from './indoor_care';
import type {World} from '../../src/sim/types';

export function v65Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-65 reference: save or resource mismatch');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:65});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const source=sourceJourney(65);walkFor(source.w,source.p,source.key);const travellingSource=advance(source.w,800);
 const stock=storeJourney(65,'planks');walkFor(stock.w,stock.p,stock.key);const travellingStock=advance(stock.w,800);
 const water=waterJourney(65);walkFor(water.w,water.p,water.key,210);const travellingWater=advance(water.w,800);
 const f=indoorCareScene(65);leaveHome(f.w,f.helper);f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;
 const outsideResident=advance(f.w,800);
 return {ordinary,travellingSource,travellingStock,travellingWater,outsideResident};
}
