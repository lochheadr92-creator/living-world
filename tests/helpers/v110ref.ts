// Frozen rules-110 ordinary and urgent water search/discovery/drinking.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {waterSearchScene} from './water_search';
import type {World} from '../../src/sim/types';
export function v110Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-110 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:110});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=waterSearchScene(true,true,110);stepWorld(f.w);if(f.p.activity?.kind!=='explore'||f.p.activity.need!=='thirst')throw new Error('Water search not begun');const searching=advance(f.w,220);
 if(f.p.needs.thirst<60||!Object.values(f.p.beliefs).some(b=>b.kind==='water'))throw new Error('Water not found and drunk');const supplied=advance(f.w,120);
 return {ordinary,searching,supplied};
}
