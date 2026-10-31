// Frozen rules-109 ordinary, final construction, and built replacement in use.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {destroyBuilding} from '../../src/sim/buildings';
import {refreshBeliefs} from '../../src/sim/perception';
import {observedReplacementScene} from './home_replacement';
import {constructionFinishScene} from './construction_finish';
import type {World} from '../../src/sim/types';
export function v109Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-109 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:109});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const edge=constructionFinishScene(109),finishing=advance(edge.w,120);if(!edge.hh.homeId)throw new Error('Final work not completed');
 const home=observedReplacementScene(109);destroyBuilding(home.w,home.home,'collapsed in sight');refreshBeliefs(home.w,home.p);for(let n=0;n<3600;n++)stepWorld(home.w);if(!home.hh.homeId)throw new Error('Replacement not completed');const shelter=advance(home.w,600);
 if(home.p.activity?.kind!=='sleep'||home.p.activity.targetId!==home.hh.homeId)throw new Error('Replacement not used');
 return {ordinary,finishing,shelter};
}
