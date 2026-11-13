import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {foodUnits} from '../../src/sim/economy';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V243_SEED='aspen';
export const V243_TICK=400;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:243});
/** People carrying grain together with something else to eat: for them rules 243 (grain_kept.ts spare) changes the next meal. */
export const sparingGrain=(w:World):number=>w.persons.filter(p=>p.alive&&(p.inv.grain??0)>0&&foodUnits(p.inv)>(p.inv.grain??0)).length;
/** The first multiple of 100 ticks at which three people carry grain with other food, or 0 (how the pin's tick was chosen). */
export function firstSparing243(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%100===0&&sparingGrain(w)>=3)return w.tick;}
 return 0;
}
/** Rules 243 (grain_kept.ts). An ordinary Normal aspen (arrivals on) at a tick at which three people carry grain with other
 * food, so that the next meals are the rule's (found with firstSparing243: tick 400), saved there, then 120 ticks more. If fewer than
 * three do at that tick the function throws. The granary, the bakery and the baking come years later (day 16 to 41 in the
 * worlds measured) and are fixed by tests/grain_kept.test.ts and measured in review_evidence/growth-20261113/grain. */
export function v243Continuation(){
 const w=make(V243_SEED);
 while(w.tick<V243_TICK)stepWorld(w);
 const sparing=sparingGrain(w);
 if(sparing<3)throw Error('Rules243 reference world has fewer than three people carrying grain with other food');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules243 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,sparingGrain:sparing,grainEatenOrUsed:Math.round(w.ledger.consumed.grain??0),alive:w.persons.filter(p=>p.alive).length};
}
