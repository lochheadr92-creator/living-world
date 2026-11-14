import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V248_SEED='gen-2';
export const V248_TICK=1200;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:248});
/** People whose last decision held a shared proposal (`plan_shared:<type>`) among the options it recorded: the reach of rules 248 (src/sim/shared_offer.ts). */
export function sharedOffered248(w:World):number{
 let n=0;
 for(const p of w.persons){const d=p.lastDecision;if(p.alive&&d&&[...(d.alternatives??[]),...(d.chosen?[d.chosen]:[])].some(o=>String(o.label??'').startsWith('Propose a shared')))n++;}
 return n;
}
/** The first tick (a multiple of 50) at which a recorded decision holds a shared proposal, or 0. */
export function firstSharedOffer248(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%50===0&&sharedOffered248(w)>0)return w.tick;}
 return 0;
}
/** Rules 248 (shared_offer.ts). An ordinary Normal gen-2 (arrivals on) at tick 1200, saved there and continued 120 ticks. `sharedOffered` is recorded, not required: the offer
 * needs a generous person with company in sight who is already planning a workshop, which an early ordinary world may not hold. */
export function v248Continuation(){
 const w=make(V248_SEED);
 while(w.tick<V248_TICK)stepWorld(w);
 const sharedOffered=sharedOffered248(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules248 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,sharedOffered,alive:w.persons.filter(p=>p.alive).length};
}
