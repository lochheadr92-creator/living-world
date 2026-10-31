// Frozen rules-95 actual care acquisition, receipt and personally informed cancellation.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {enterHome} from '../../src/sim/habitation';
import {perceive} from '../../src/sim/perception';
import {careSupplyScene} from './care_supply';
import type {World} from '../../src/sim/types';
export function v95Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-95 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:95});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const supplies=[];for(const water of [false,true]){const f=careSupplyScene(95,water),item=water?'water':'grain';for(let n=0;n<180&&(f.helper.inv[item]??0)<1;n++)stepWorld(f.w);
  if(f.helper.careJourney?.phase!=='acquire'||!f.helper.activity?.data.careSupply)throw new Error('Missing paid acquisition');
  const receipt=advance(f.w,300);if(String(f.helper.careJourney.phase)!=='delivered')throw new Error('Missing actual receipt');supplies.push({water,...receipt});
 }
 const f=careSupplyScene(95),offer=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key.startsWith('care_supply:'));if(!offer)throw new Error('Missing offered acquisition');startActivity(f.w,f.helper,offer.make!()!);
 if(enterHome(f.w,f.helper,f.home))throw new Error('Initial contact failed');f.elder.needs.hunger=100;perceive(f.w,f.helper);const cancellation=advance(f.w,4);
 if(f.helper.careJourney?.phase!=='failed'||f.helper.activity?.data.careSupply)throw new Error('Missing personal cancellation');
 return {ordinary,supplies,cancellation};
}
