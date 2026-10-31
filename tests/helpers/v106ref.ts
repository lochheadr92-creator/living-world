// Frozen rules-106 remembered need: ordinary river, and a staged child out of sight, seen hungry, out of sight again and cared for.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {rememberedNeedScene} from './remembered_need';
import type {World} from '../../src/sim/types';
export function v106Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-106 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:106});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=rememberedNeedScene(106);f.away();f.cal.needs.hunger=30;
 if(generateOptions(f.w,f.ada,true,true).options.some(o=>o.key.startsWith('give:')))throw new Error('Care offered on a need nobody saw');const unseen=advance(f.w,30);
 f.back();if(!f.ada.whereabouts[f.cal.id].seen?.hungry)throw new Error('Not seen hungry');const seen=advance(f.w,30);
 f.away();f.ada.cooldowns.pause=0;f.ada.nextThink=f.w.tick;stepWorld(f.w);if(f.ada.activity?.kind!=='give')throw new Error('No care set out on remembered signs');const setOut=advance(f.w,60);
 for(let n=0;n<600&&f.ada.activity?.kind==='give';n++)stepWorld(f.w);const after=advance(f.w,60);
 return {ordinary,unseen,seen,setOut,after};
}
