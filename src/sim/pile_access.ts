// Access to physical loose holdings. Creation/provenance stay with meals.ts and estate.ts.
import {mealPileBlocker} from './meal_leftovers';
import type {Entity,Person} from './types';
export {mayTakeKnownPile} from './meal_leftovers';
export function pileAccessBlocker(p:Person,e:Entity|undefined):string|null{
 const meal=mealPileBlocker(p,e);if(meal)return meal;
 if(!e||e.ent!=='pile'||!e.estate)return null;
 if(p.indoors||Math.hypot(p.x-e.x-.5,p.y-e.y-.5)>2)return 'must reach the belongings outdoors';
 if(e.estate.hhId!==0&&e.estate.hhId!==p.hhId)return 'these belongings belong to another household';
 return null;
}
