import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V242_SEED='aspen';
export const V242_TICK=2400;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:242});
/** Loaves in the world, in packs and in stores (bread_feeds.ts: from rules 242 a loaf is worth 60 and keeps). */
export const loaves=(w:World):number=>Math.round(w.persons.reduce((n,p)=>n+(p.alive?p.inv.bread??0:0),0)+w.buildings.reduce((n,b)=>n+(b.store.items.bread??0),0));
/** The tick at which the world first holds a loaf, or 0. */
export function firstBread242(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%20===0&&loaves(w)>0)return w.tick;}
 return 0;
}
/** Rules 242 (bread_feeds.ts). An ordinary Normal aspen (arrivals on) at the end of its first day, saved there, then 120 ticks
 * more. This pin fixes the version's ordinary continuation and does NOT exercise the rule: no ordinary world at rules 242 holds
 * a loaf in its first years (firstBread242: six worlds to 70,000 ticks and four to 140,000, none), because nothing is baked
 * until rules 243. What a loaf is worth and how it keeps are fixed by tests/bread_feeds.test.ts. */
export function v242Continuation(){
 const w=make(V242_SEED);
 while(w.tick<V242_TICK)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules242 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,loaves:loaves(w),alive:w.persons.filter(p=>p.alive).length};
}
