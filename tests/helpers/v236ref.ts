import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V236_SEED='river';
export const V236_TICK=3300;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:236});
/** Wells whose ground has given up water (groundwater.ts): a well with a ground record below what a new well finds. */
export const wellsOnGround=(w:World):number=>w.buildings.filter(b=>b.type==='well'&&w.groundwater?.[b.id]!==undefined).length;
/** The first multiple of 100 ticks at which a well stands on its own groundwater, or 0 (how the pin's seed and tick were chosen). */
export function firstGroundWell236(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%100===0&&wellsOnGround(w)>0)return w.tick;}
 return 0;
}
/** Rules 236 (groundwater.ts). An ordinary Normal world (arrivals on) stepped until a well stands and draws on the ground
 * beneath it (found with firstGroundWell236: river, tick 900; of four worlds tried the soonest) and a day more, saved there, then 120 ticks more. If no well stands on its own
 * groundwater at that tick the function throws rather than recording a pin that does not exercise the rule. */
export function v236Continuation(){
 const w=make(V236_SEED);
 while(w.tick<V236_TICK)stepWorld(w);
 const wells=wellsOnGround(w);
 if(wells<1)throw Error('Rules236 reference world has no well on its own groundwater');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules236 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,wellsOnGround:wells,groundHeld:Object.values(w.groundwater??{}).reduce((n,g)=>n+g.amount,0)};
}
