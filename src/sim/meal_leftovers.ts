// Physical custody after a shared meal. Personal arrangements remain owned by meals.ts.
import {runsRulesVersion} from './rulesversion';
import {NUTRITION} from './constants';
import type {Belief,Entity,FoodKind,Person,World} from './types';
let enabled=true;
export const mealLeftoversOn=()=>enabled;
export function setMealLeftovers(on:boolean):void{enabled=on;}
export const hasMealLeftovers=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,90);
/** A meal is shared while it runs; uneaten food still belongs to the supplying household.
 * This persists after the host dies. It is not a claim on future or distant inventory.
 * Ordinary outdoor spoilage and actual removal end the physical holding. */
export function mayTakePile(p:Person,e:Entity|undefined):boolean{
 return !e||e.ent!=='pile'||!e.mealFood||e.mealFood.hhId===p.hhId;
}
export function mealPileBlocker(p:Person,e:Entity|undefined):string|null{
 if(!e||e.ent!=='pile'||!e.mealFood)return null;
 if(p.indoors||Math.hypot(p.x-e.x-.5,p.y-e.y-.5)>2)return 'must reach the leftover food outdoors';
 if(!mayTakePile(p,e))return 'this leftover food belongs to another household';
 return null;
}
export function mayTakeKnownPile(p:Person,b:Belief):boolean{
 return b.kind!=='pile'||b.hh===undefined||b.hh===0||b.hh===p.hhId;
}
export function validateMealLeftovers(w:World):void{
 const eligible=w.settings.dynamics==='rich'&&runsRulesVersion(w,90);
 const id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
 for(const m of w.meals){
  if(m.tableOwnerHh!==undefined&&(!eligible||!id(m.tableOwnerHh)))throw new Error('Invalid meal food owner');
 }
 const seen=new Set<number>();
 for(const pile of w.piles){const c=pile.mealFood;if(c===undefined)continue;
  if(!eligible||!c||!id(c.mealId)||!id(c.hostId)||!id(c.hhId)||seen.has(c.mealId))throw new Error('Invalid meal leftover ownership');
  if(Object.entries(pile.items).some(([k,n])=>!NUTRITION[k as FoodKind]||!Number.isSafeInteger(n)||n<0))throw new Error('Invalid meal leftover food');
  seen.add(c.mealId);
 }
}
