import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {isSolidHome} from '../../src/sim/constants';
import {cloneItems,conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {seesInside} from '../../src/sim/home_interior';
import {currentWorldSettings} from '../../src/sim/profiles';
import {glancedItems} from '../../src/sim/seen_stock';
import {stepWorld} from '../../src/sim/world';
import type {Building,World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V245_SEED='gen-2';
export const V245_TICK=1200;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:245});
/** Fresh sights a person holds of a building of their own household that are exact and that the glance of rules 169 would have made
 * less: the whole effect of rules 245 (src/sim/own_stores.ts). A home seen from the yard keeps its old figure (rules 184) and is left out. */
export function ownStoresKnownExactly(w:World):number{
 let n=0;
 for(const p of w.persons){
  if(!p.alive||!p.hhId)continue;
  for(const k in p.beliefs){
   const b=p.beliefs[Number(k)],e=w.byId.get(b.id) as Building|undefined;
   if(b.kind!=='building'||!e||e.ent!=='building'||e.hhId!==p.hhId||w.tick-b.seen>2)continue;
   if(isSolidHome(e.type)&&!seesInside(p,e))continue;
   const exact=JSON.stringify(cloneItems(e.store.items));
   if(JSON.stringify(b.items??{})===exact&&JSON.stringify(glancedItems(w,e.store.items,e.store.cap))!==exact)n++;
  }
 }
 return n;
}
/** The first multiple of 100 ticks at which somebody remembers a store of their own household exactly where the glance would have given less, or 0 (how the pin's tick was chosen). */
export function firstExactOwnStores245(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%100===0&&ownStoresKnownExactly(w)>0)return w.tick;}
 return 0;
}
/** Rules 245 (own_stores.ts). An ordinary Normal gen-2 (arrivals on) at tick 1200, where ten people remember the store of their own household's lean-to exactly
 * (berries 4 and fruit 2, where the glance of rules 169 gives one of each; at rules 244 the same world has none there), saved there, then 120 ticks more.
 * firstExactOwnStores245 finds the first such tick at 100, too early a world to be worth pinning, so the pin is taken later, at 1200. If nobody remembers one exactly at that tick
 * the function throws rather than recording a pin that does not exercise the rule. */
export function v245Continuation(){
 const w=make(V245_SEED);
 while(w.tick<V245_TICK)stepWorld(w);
 const exact=ownStoresKnownExactly(w);
 if(exact<1)throw Error('Rules245 reference world has no store of a household known exactly by it');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules245 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,ownStoresKnownExactly:exact,alive:w.persons.filter(p=>p.alive).length};
}
