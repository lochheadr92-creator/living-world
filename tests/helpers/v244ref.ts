import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V244_SEED='gen-2';
export const V244_TICK=500;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:244});
/** Households working more plots than rules 243 would ever have them want (one, one for every two people, and one when short). */
export function householdsWithMoreFields(w:World):number{
 let n=0;
 for(const h of w.households){
  const members=w.persons.filter(p=>p.alive&&p.hhId===h.id).length;
  if(members<1)continue;
  if(w.plots.filter(pl=>pl.hhId===h.id).length>1+Math.floor(members/2)+1)n++;
 }
 return n;
}
/** The first multiple of 100 ticks at which a household works more plots than before, or 0 (how the pin's tick was chosen). */
export function firstMoreFields244(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%100===0&&householdsWithMoreFields(w)>0)return w.tick;}
 return 0;
}
/** Rules 244 (farm_scale.ts). An ordinary Normal gen-2 (arrivals on) at tick 500, where a household first works
 * more plots than rules 243 could have it want (found with firstMoreFields244; at rules 243 the same world has none there), saved there, then 120 ticks more. If no
 * household does at that tick the function throws rather than recording a pin that does not exercise the rule. */
export function v244Continuation(){
 const w=make(V244_SEED);
 while(w.tick<V244_TICK)stepWorld(w);
 const more=householdsWithMoreFields(w);
 if(more<1)throw Error('Rules244 reference world has no household with more fields');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules244 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,householdsWithMoreFields:more,plots:w.plots.length,alive:w.persons.filter(p=>p.alive).length};
}
