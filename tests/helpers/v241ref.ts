import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {skinsHung} from '../../src/sim/wolf_skin';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V241_SEED='fern';
export const V241_TICK=17400;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:241});
/** The tick at which a wolf's skin is first hung at a shared building, or 0 (how the pin's seed and tick were chosen). */
export function firstSkinHung241(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(skinsHung(w)>0)return w.tick;}
 return 0;
}
/** Rules 241 (wolf_skin.ts). An ordinary Normal fern (arrivals on) stepped to the next hundred ticks after a wolf's skin is
 * first hung (tick 17,329, at the camp fire: the wolf was killed at tick 16,787 and its skin cut at 17,066; found with
 * scripts/wolf_probe.ts and firstSkinHung241), saved there, then 120 ticks more. If no skin hangs at that tick the function
 * throws rather than recording a pin that does not exercise the rule. */
export function v241Continuation(){
 const w=make(V241_SEED);
 while(w.tick<V241_TICK)stepWorld(w);
 const hung=skinsHung(w);
 if(hung<1)throw Error('Rules241 reference world has no wolf skin hung');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules241 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,skinsHung:hung,places:w.buildings.filter(b=>b.wolfSkins).map(b=>b.type+' '+b.wolfSkins),wolves:w.animals.filter(a=>a.type==='wolf').length,alive:w.persons.filter(p=>p.alive).length};
}
