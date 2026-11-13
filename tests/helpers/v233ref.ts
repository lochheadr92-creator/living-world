import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V233_SEED='aspen';
export const V233_TICK=134;
const make=():World=>createWorld({...currentWorldSettings('normal',V233_SEED,{immigration:true}),rulesVersion:233});
/** Work on hold through talk that carries its count (picked_up.ts): the held activities with a kept record. */
export const heldWithCount=(w:World):number=>w.persons.filter(p=>p.alive&&p.suspended?.data.kept!==undefined).length;
/** The first tick at which some held work carries its count, or 0 (how the pin's tick was chosen). */
export function firstHeld233(maxTicks:number):number{
 const w=make();
 while(w.tick<maxTicks){stepWorld(w);if(heldWithCount(w)>0)return w.tick;}
 return 0;
}
/** Rules 233 (picked_up.ts). Ordinary Normal aspen (arrivals on) stepped to the tick at which somebody's work, put on hold by
 * talk, carries its count (found with firstHeld233: tick 134), saved there, then 120 more ticks, through the picking up. If no held work
 * carries a count at that tick the function throws rather than recording a pin that does not exercise the rule. */
export function v233Continuation(){
 const w=make();
 while(w.tick<V233_TICK)stepWorld(w);
 const held=heldWithCount(w);
 if(held<1)throw Error('Rules233 reference world has no held work carrying its count');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules233 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,heldWithCount:held};
}
