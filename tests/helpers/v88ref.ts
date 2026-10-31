// Frozen rules-88 ordinary, after-departure flood, retreat and recovery continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {beginFlood,observeFlood} from '../../src/sim/flood';
import {newActivity,startActivity} from '../../src/sim/activities';
import {floodScene,startFloodJourney} from './flood';
import type {World} from '../../src/sim/types';
export function v88Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-88 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:88});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const trip=floodScene(88);trip.w.weather.storm=0;const a=startFloodJourney(trip);for(let n=0;n<15;n++)stepWorld(trip.w);trip.w.weather.storm=1;if(!beginFlood(trip.w))throw new Error('Missing staged onset');const traveller=advance(trip.w,350);if(a.cycle<1)throw new Error('Missing physical gathered food');
  const caught=floodScene(88);caught.p.x=40.5;beginFlood(caught.w);startFloodJourney(caught);for(let n=0;n<3;n++)stepWorld(caught.w);if(!caught.p.activity?.data.floodRetreat)throw new Error('Missing real retreat');const retreat=advance(caught.w,100);
  const late=floodScene(88);late.p.needs.hunger=100;beginFlood(late.w);while(late.w.tick<late.w.flood!.activeUntil-80)stepWorld(late.w);late.p.x=39.5;late.p.cooldowns.pause=0;observeFlood(late.w,late.p);
  const wait=newActivity(late.w,late.p,{kind:'wander',label:'Staged shore visit',goal:'visit the shore',tx:41.5,ty:40.5,spotX:41.5,spotY:40.5});startActivity(late.w,late.p,wait);for(let n=0;n<20;n++)stepWorld(late.w);if(wait.data.floodWaitSince===undefined)throw new Error('Missing saved flood wait '+JSON.stringify({tick:late.w.tick,needs:late.p.needs,activity:late.p.activity,lastResult:late.p.lastResult,data:wait.data}));const recovery=advance(late.w,180);
  return {ordinary,traveller,retreat,recovery};
 }finally{release();}
}
