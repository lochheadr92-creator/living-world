import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V232_SEED='aspen';
export const V232_TICK=2400;
const make=():World=>createWorld({...currentWorldSettings('normal',V232_SEED,{immigration:true}),rulesVersion:232});
/** People who have stopped building at a site for want of materials and still carry the note of which (builder_fetches.ts). */
export const ranOut=(w:World):number=>w.persons.filter(p=>p.alive&&p.cooldowns.ranoutSite!==undefined).length;
/** The first multiple of 100 ticks at which somebody carries that note, or 0 (how the pin's tick was chosen). */
export function firstRanOut232(maxTicks:number):number{
 const w=make();
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%100===0&&ranOut(w)>0)return w.tick;}
 return 0;
}
/** Rules 232 (builder_fetches.ts). Ordinary Normal aspen (arrivals on) stepped to the tick by which a builder has stopped for
 * want of materials and carries the note of the site (found with firstRanOut232: by tick 300; the pin runs one day), then 120 more after a save and load. If
 * nobody carries the note the function throws rather than recording a pin that does not exercise the rule. */
export function v232Continuation(){
 const w=make();
 while(w.tick<V232_TICK)stepWorld(w);
 if(ranOut(w)<1)throw Error('Rules232 reference world has no builder who stopped for want of materials');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules232 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,buildersWhoRanOut:ranOut(w)};
}
