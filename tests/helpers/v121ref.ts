// Rules-121 reference (resumed gathering credit; ordinary meadow continuation with childhood exercised): record once, never update for successor behaviour.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import type {World} from '../../src/sim/types';
export function v121Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:true}),rulesVersion:121});
 for(let n=0;n<3000;n++)stepWorld(w);
 const experiences=w.persons.flatMap(p=>Object.values(p.relations).flatMap(r=>r.childhood??[]));
 if(!experiences.some(e=>e.kind==='family_time')||!experiences.some(e=>e.kind==='play_together')||!experiences.some(e=>e.kind==='learn_foraging'))throw new Error('Reference did not exercise childhood');
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-121 continuation');
 return {experiences:experiences.length,saved,uninterrupted,continued};
}
