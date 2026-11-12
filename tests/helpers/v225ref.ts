import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const make=(seed:string,rules:number):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:rules});
/** What stands and who lives: sites, buildings and the living. Two worlds that differ here have physically parted. */
export const shape225=(w:World):string=>JSON.stringify([w.sites.map(s=>[s.type,s.x,s.y]),w.buildings.map(b=>[b.type,b.x,b.y]),w.persons.filter(p=>p.alive).length]);
/** The first multiple of 100 ticks at which an ordinary world at rules 225 differs in shape from the same world at rules 220, or 0. */
export function firstParting225(seed:string,maxTicks:number):number{
 const w=make(seed,225),old=make(seed,220);
 while(w.tick<maxTicks){stepWorld(w);stepWorld(old);if(w.tick%100===0&&shape225(w)!==shape225(old))return w.tick;}
 return 0;
}
export const V225_SEED='river';
export const V225_TICK=800;
/** Rules 225 (growth_room.ts). Ordinary Normal world (arrivals on) stepped beside its rules-220 twin to the tick at which the two
 * first differ in what stands and who lives (found with firstParting225: the only difference between them is the lifted limits),
 * then 120 more after a save and load. If the two have not parted there the function throws rather than recording a pin that
 * does not exercise the rule. */
export function v225Continuation(){
 const w=make(V225_SEED,225),old=make(V225_SEED,220);
 while(w.tick<V225_TICK){stepWorld(w);stepWorld(old);}
 if(shape225(w)===shape225(old))throw Error('Rules225 reference world has not parted from its rules-220 twin');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules225 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,sites:w.sites.length,sitesAt220:old.sites.length};
}
