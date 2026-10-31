// Frozen rules-103 decision ledger: ordinary river and a staged covered-site decision, with the ledger inside the saved state.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {promisedSupplyScene,askWood} from './promised_supply';
import type {World} from '../../src/sim/types';
export function v103Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-103 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:103});for(let n=0;n<600;n++)stepWorld(w);if(!w.persons.some(p=>p.decisions?.some(e=>e.outcome)))throw new Error('No closed ledger entry');const ordinary=advance(w,120);
 const f=promisedSupplyScene(103,3,[70,12]);askWood(f);f.ada.cooldowns.pause=0;f.ben.cooldowns.pause=0;const staged=advance(f.w,400);if(!f.ada.decisions?.some(e=>e.setAside.some(s=>/promised 3 wood/.test(s.reason))))throw new Error('No recorded set-aside');
 return {ordinary,staged};
}
