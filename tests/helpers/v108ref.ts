// Frozen rules-108 ordinary, unseen loss, observed loss, and interrupted paid work.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {destroyBuilding} from '../../src/sim/buildings';
import {refreshBeliefs} from '../../src/sim/perception';
import {homeReplacementScene,observedReplacementScene} from './home_replacement';
import type {World} from '../../src/sim/types';
export function v108Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-108 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:108});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const unseen=homeReplacementScene(108);destroyBuilding(unseen.w,unseen.home,'collapsed outside sight');const remembered=advance(unseen.w,120);
 const seen=homeReplacementScene(108,false);destroyBuilding(seen.w,seen.home,'collapsed in sight');refreshBeliefs(seen.w,seen.p);const observed=advance(seen.w,300);
 const work=observedReplacementScene(108);destroyBuilding(work.w,work.home,'collapsed in sight');refreshBeliefs(work.w,work.p);for(let n=0;n<3600;n++)stepWorld(work.w);
 const site=work.w.sites.find(s=>s.hhId===work.hh.id);if(!site||site.work/site.workTotal<=0.98||site.work>=site.workTotal)throw new Error('Expected retained interrupted near-complete site');const interrupted=advance(work.w,1200);
 return {ordinary,remembered,observed,interrupted};
}
