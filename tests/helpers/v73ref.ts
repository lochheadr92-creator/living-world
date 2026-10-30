// Immutable rules-73 ordinary, recovery and abandonment snapshots before successor learning.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {journeyRecoveryScene,failJourneySource} from './journey_recovery';
import type {World} from '../../src/sim/types';
export function v73Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-73 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:73});while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=journeyRecoveryScene(73),i=failJourneySource(f);if(i.wants.water||!i.journey?.recovery?.failures.length)throw new Error('Missing failed trip/consumed claim evidence');
 const beforeReplacement=advance(deserializeWorld(serializeWorld(f.w)),2800);
 for(let n=0;n<120&&!i.journey.recovery.changes.length;n++)stepWorld(f.w);if(i.journey.recovery.changes.length!==1)throw new Error('Missing source replacement');const replacementTravel=advance(f.w,2800);
 const g=journeyRecoveryScene(73,false),impossible=failJourneySource(g);stepWorld(g.w);stepWorld(g.w);if(impossible.status!=='dropped'||Object.keys(impossible.wants).length)throw new Error('Missing abandonment/claim release');const abandoned=advance(g.w,600);
 return {ordinary,beforeReplacement,replacementTravel,abandoned};
}
