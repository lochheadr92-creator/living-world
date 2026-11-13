import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V240_SEED='birch';
export const V240_TICK=900;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:240});
/** Spears in the world (wooden_spear.ts: from rules 240 made of wood alone, by people who have met no wolf). */
export const spearsMade=(w:World):number=>w.tools.filter(t=>t.kind==='spear').length;
/** The tick at which the world holds its third spear, or 0 (how the pin's seed and tick were chosen). */
export function thirdSpear240(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(spearsMade(w)>=3)return w.tick;}
 return 0;
}
/** Rules 240 (wooden_spear.ts). An ordinary Normal birch (arrivals on) stepped to the next hundred ticks after its third
 * spear is made (found with thirdSpear240: tick 877, inside the first day), saved there, then 120 ticks more. If the world holds fewer than three spears at
 * that tick the function throws rather than recording a pin that does not exercise the rule. */
export function v240Continuation(){
 const w=make(V240_SEED);
 while(w.tick<V240_TICK)stepWorld(w);
 const spears=spearsMade(w);
 if(spears<3)throw Error('Rules240 reference world has fewer than three spears');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules240 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,spears,stoneUsedForTools:Math.round(w.ledger.consumed.stone??0),alive:w.persons.filter(p=>p.alive).length};
}
