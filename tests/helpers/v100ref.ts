// Frozen rules-100 heard household supply: ordinary river, told reserve, deferred reserve, stale take-up and complementary site material.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {reviewIntentions} from '../../src/sim/intent';
import {startActivity} from '../../src/sim/activities';
import {setExternalController} from '../../src/sim/external';
import {perceive} from '../../src/sim/perception';
import {DAY} from '../../src/sim/constants';
import {householdSupplyScene,tellReserve} from './household_supply';
import {continuityScene} from './continuity';
import type {World} from '../../src/sim/types';
export function v100Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-100 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:100});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=householdSupplyScene(100);tellReserve(f);const told=advance(f.w,60);
 if(reviewIntentions(generateOptions(f.w,f.ben,true))?.kind==='stock'||f.ben.relations[f.ada.id].workHeard?.[0]?.deferredAt===undefined)throw new Error('No deferral');const deferred=advance(f.w,200);
 f.w.tick+=DAY+1;if(reviewIntentions(generateOptions(f.w,f.ben,true))?.kind!=='stock')throw new Error('No stale take-up');const stale=advance(f.w,120);
 const g=continuityScene(100,true);g.a.cooldowns.pause=0;g.b.cooldowns.pause=0;perceive(g.w,g.a);perceive(g.w,g.b);g.b.nextThink=g.w.tick+600;
 const offered=generateOptions(g.w,g.a,true,true).options.find(o=>o.key.includes('share_work'));if(!offered)throw new Error('No shelter telling');startActivity(g.w,g.a,offered.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<300&&!g.b.relations[g.a.id]?.workHeard?.length;n++)stepWorld(g.w);}finally{release();}
 if(g.b.relations[g.a.id].workHeard?.[0]?.item!=='wood')throw new Error('No heard material');const complementary=advance(g.w,300);
 return {ordinary,told,deferred,stale,complementary};
}
