import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V238_SEED='birch';
export const V238_TICK=5100;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:238});
/** Animals other than wolves standing in the world: the ones that barred a traveller's way before rules 238 (arrival_way.ts). */
export const otherAnimals=(w:World):number=>w.animals.filter(a=>a.type!=='wolf').length;
/** The tick at which the first group of travellers arrives, or 0 (how the pin's seed and tick were chosen). */
export function firstArrival238(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if((w.stats.arrivals??0)>0)return w.tick;}
 return 0;
}
/** Rules 238 (arrival_way.ts). An ordinary Normal birch (arrivals on), a world that received no newcomer in twenty years at
 * rules 236, stepped to the next hundred ticks after its first travellers arrive (found with firstArrival238: tick 5,012), saved there,
 * then 120 ticks more. If nobody has arrived by that tick, or no animal other than a wolf stands in the world,
 * the function throws rather than recording a pin that does not exercise the rule. */
export function v238Continuation(){
 const w=make(V238_SEED);
 while(w.tick<V238_TICK)stepWorld(w);
 const arrivals=w.stats.arrivals??0,others=otherAnimals(w);
 if(arrivals<1||others<1)throw Error('Rules238 reference world has had no travellers, or has no deer or sheep');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules238 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,arrivals,deerAndSheep:others,alive:w.persons.filter(p=>p.alive).length};
}
