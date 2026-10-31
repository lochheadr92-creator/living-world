// Frozen rules-114 ordinary and physically accepted hungry-harvest continuation.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {hungryHarvestScene} from './hungry_harvest';
import type {World} from '../../src/sim/types';
export function v114Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const check=(w:World,copy:World)=>{const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-114 continuation');return {uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:114});for(let n=0;n<600;n++)stepWorld(w);const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}const ordinary={saved,...check(w,copy)};
 const f=hungryHarvestScene(114);for(let n=0;n<180&&!(f.p.activity?.kind==='harvest'&&f.p.activity.progress>0);n++)stepWorld(f.w);
 if(f.p.activity?.kind!=='harvest'||f.p.activity.progress<=0)throw new Error('Hungry person did not physically begin harvest');
 const harvestSaved=digest(f.w),other=deserializeWorld(serializeWorld(f.w));for(let n=0;n<400;n++){stepWorld(f.w);stepWorld(other);}
 if((f.w.ledger.consumed.grain??0)<1||f.plot.stock>=4||f.p.needs.hunger<=10)throw new Error('No physical harvest/eating');
 return {ordinary,hungryHarvest:{saved:harvestSaved,...check(f.w,other)}};
}
