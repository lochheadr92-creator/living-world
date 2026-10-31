// Frozen rules-113 ordinary world and physical grain-to-seed input boundaries.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {stepActivity} from '../../src/sim/activities';
import {conservationReport} from '../../src/sim/economy';
import {wildSeedScene,finishWildHarvest} from './wild_seed';
import type {Items,World} from '../../src/sim/types';
export function v113Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const check=(w:World,copy:World)=>{const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-113 continuation');return {uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:113});for(let n=0;n<600;n++)stepWorld(w);const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}const ordinary={saved,...check(w,copy)};
 const harvest=(inv:Items,expectPaid:number)=>{const f=wildSeedScene(113,inv);f.w.tick++;stepActivity(f.w,f.p);const saved=digest(f.w),other=deserializeWorld(serializeWorld(f.w));finishWildHarvest(f.w,f.p,f.a.id);finishWildHarvest(other,other.persons.find(p=>p.id===f.p.id)!,f.a.id);if((f.w.ledger.reasons['-saved as seed']??0)!==expectPaid||(f.w.ledger.created.seeds??0)!==expectPaid)throw new Error('Wrong seed payment');return {saved,...check(f.w,other)};};
 return {ordinary,eatenAtSource:harvest({wood:5,seeds:6},0),retainedHarvest:harvest({wood:1},1),separateCarriedGrain:harvest({wood:5,grain:1,seeds:2},1)};
}
