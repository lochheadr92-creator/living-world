import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {familyFoodOn,setFamilyFood} from '../../src/sim/family_food';
import {householdFoodPerHead} from '../../src/sim/lifecycle';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V237_SEED='river';
export const V237_TICK=9500;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:237});
/** Couples of one household with a home who hold three food a head only once their other stores (the cellar) are counted
 * (family_food.ts): the households the rule changes the answer for. The switch is put back as it was. */
export function couplesFedByCellar(w:World):number{
 let n=0;const was=familyFoodOn();
 for(const p of w.persons){
  if(!p.alive||p.sex!=='f'||p.partnerId===0)continue;
  const partner=w.persons.find(q=>q.id===p.partnerId),hh=w.households.find(h=>h.id===p.hhId);
  if(!partner||partner.hhId!==p.hhId||!hh||!hh.homeId)continue;
  setFamilyFood(true);const withCellar=householdFoodPerHead(w,p);
  setFamilyFood(false);const without=householdFoodPerHead(w,p);
  if(withCellar>=3&&without<3)n++;
 }
 setFamilyFood(was);
 return n;
}
/** The first multiple of 100 ticks at which a couple is fed only by its cellar, or 0 (how the pin's seed and tick were chosen). */
export function firstCellarCouple237(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%100===0&&couplesFedByCellar(w)>0)return w.tick;}
 return 0;
}
/** Rules 237 (family_food.ts). An ordinary Normal world (arrivals on) stepped until a couple holds three food a head only
 * with its cellar counted (found with firstCellarCouple237: river, tick 5,000; of four worlds tried the soonest), and on to tick 9,500 where a couple is so fed and the next check of conception falls within the continuation, saved there, then 120 ticks more. If no couple is
 * fed by its cellar at that tick the function throws rather than recording a pin that does not exercise the rule. */
export function v237Continuation(){
 const w=make(V237_SEED);
 while(w.tick<V237_TICK)stepWorld(w);
 const couples=couplesFedByCellar(w);
 if(couples<1)throw Error('Rules237 reference world has no couple fed by its cellar');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules237 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,couplesFedByCellar:couples,expecting:w.persons.filter(p=>p.alive&&p.pregnantUntil>0).length};
}
