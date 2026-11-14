import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {errandCarries,onErrand} from '../../src/sim/errand_load';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {ItemKind,World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V247_SEED='gen-2';
export const V247_TICK=1200;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:247});
const KINDS:ItemKind[]=['wood','stone','seeds'];
/** People on an errand (a haul to a building site, or a deposit made for a promise) carrying wood, stone or seeds in it: the whole reach of rules 247 (src/sim/errand_load.ts). */
export function onErrandWithLoad247(w:World):number{
 let n=0;
 for(const p of w.persons)if(p.alive&&onErrand(w,p)&&KINDS.some(k=>errandCarries(w,p,k)))n++;
 return n;
}
/** The first tick (a multiple of 20) at which somebody is on an errand with a load of wood, stone or seeds, or 0: how the pin's tick was looked for. */
export function firstErrand247(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%20===0&&onErrandWithLoad247(w)>0)return w.tick;}
 return 0;
}
/** Rules 247 (errand_load.ts). An ordinary Normal gen-2 (arrivals on) at tick 1200, saved there and continued 120 ticks. `onErrand` counts the people on an errand with
 * a load at the saved tick: it is recorded, not required, because the rule only changes what is offered to somebody mid errand and a world may hold nobody there at one tick. */
export function v247Continuation(){
 const w=make(V247_SEED);
 while(w.tick<V247_TICK)stepWorld(w);
 const onErrand247=onErrandWithLoad247(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules247 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,onErrandWithLoad:onErrand247,alive:w.persons.filter(p=>p.alive).length};
}
