import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V239_SEED='birch';
export const V239_TICK=29000;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:239});
/** Wolves carrying a wound (wolf_fight.ts): health below the whole. */
export const woundedWolves=(w:World):number=>w.animals.filter(a=>a.type==='wolf'&&a.health<100).length;
/** The tick at which a wolf is first wounded, or 0 (how the pin's seed and tick were chosen). */
export function firstWound239(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(woundedWolves(w)>0)return w.tick;}
 return 0;
}
/** Rules 239 (wolf_fight.ts). An ordinary Normal birch (arrivals on) stepped to the next hundred ticks after a wolf is first
 * wounded by a won stand (found with firstWound239: tick 28,975), saved there with the wound on it, then 120 ticks more. If no wolf is
 * carrying a wound at that tick the function throws rather than recording a pin that does not exercise the rule. */
export function v239Continuation(){
 const w=make(V239_SEED);
 while(w.tick<V239_TICK)stepWorld(w);
 const wounded=woundedWolves(w);
 if(wounded<1)throw Error('Rules239 reference world has no wounded wolf');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules239 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,woundedWolves:wounded,wolfHealth:w.animals.filter(a=>a.type==='wolf').map(a=>a.health).sort((a,b)=>a-b),alive:w.persons.filter(p=>p.alive).length};
}
