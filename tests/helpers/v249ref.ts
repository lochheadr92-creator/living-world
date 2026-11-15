import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V249_SEED='gen-2';
/** The first tick an ordinary gen-2 at rules 249 has a larger batch under way (found with scripts/oven_first_large.ts). */
export const V249_TICK=70900;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:249});
/** Workshops whose batch under way is a larger one (rules 249, src/sim/oven_load.ts): the reach of the rule. */
export function largeBatches249(w:World):number{
 let n=0;
 for(const b of w.buildings)if(b.ops?.job&&/_x[23]$/.test(b.ops.job.recipe))n++;
 return n;
}
/** The first tick (a multiple of 50) at which a larger batch is under way in an ordinary world, or 0 inside `maxTicks`. */
export function firstLargeBatch249(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%50===0&&largeBatches249(w)>0)return w.tick;}
 return 0;
}
/** Rules 249. An ordinary Normal gen-2 (arrivals on), run to `tick` (a larger batch under way by then), saved there and continued 120 ticks. */
export function v249Continuation(tick:number){
 const w=make(V249_SEED);
 while(w.tick<tick)stepWorld(w);
 const larger=largeBatches249(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules249 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,largerBatchesUnderWay:larger,alive:w.persons.filter(p=>p.alive).length};
}
