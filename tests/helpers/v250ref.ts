import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V250_SEED='gen-4';
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:250});
/** The first tick (a multiple of 50) an ordinary gen-4 at rules 250 differs from the same world at 249 (scripts/ring_first_diff.ts), plus 50. */
export const V250_TICK=41200;
/** Workshops laid out or standing: the rules-250 world has more of them than the rules-249 one once the ordinary ring is full. */
export function workshops250(w:World):number{
 return [...w.buildings,...w.sites].filter(e=>['granary','bakery','kiln','smithy','mill','hall','brewery'].includes(e.type)).length;
}
/** Rules 250. An ordinary Normal gen-4 (arrivals on), run to `tick`, saved there and continued 120 ticks. */
export function v250Continuation(tick:number){
 const w=make(V250_SEED);
 while(w.tick<tick)stepWorld(w);
 const workshops=workshops250(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules250 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,workshops,alive:w.persons.filter(p=>p.alive).length};
}
