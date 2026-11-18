import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V256_SEED='gen-4';
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:256});
/** Tick 6000, well after the first tick this ordinary gen-4 differs from the same world at the previous rules version (scripts/keyed_first_diff.ts). */
export const V256_TICK=6000;
/** Rules 256. An ordinary Normal gen-4 (arrivals on), run to `tick`, saved there and continued 120 ticks. */
export function v256Continuation(tick:number){
 const w=make(V256_SEED);
 while(w.tick<tick)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules256 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,arrivals:w.stats.arrivals??0,alive:w.persons.filter(p=>p.alive).length};
}
