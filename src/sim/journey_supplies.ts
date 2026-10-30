// Conservative credit for future physical consumption, never an immediate change to needs.
import {NUTRITION,WATER_VALUE,WORK} from './constants';
import {reservedFor} from './reserved_goods';
import {runsRulesVersion} from './rulesversion';
import type {FoodKind,ItemKind,Person,World} from './types';
let enabled=true;
export const journeysOn=()=>enabled;
export function setJourneys(on:boolean):void{enabled=on;}
export const hasJourneys=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,72);
export const JOURNEY_LIMITS={portions:2,history:8,retries:3,candidates:32,prepDistance:180} as const;
export function journeyAvailable(w:World,p:Person,k:ItemKind):number{
 const own=p.intentions.filter(i=>i.kind==='journey'&&i.status==='active').reduce((n,i)=>n+(i.wants[k]??0),0);
 return Math.max(0,(p.inv[k]??0)-Math.max(0,reservedFor(w,p,k)-own));
}
export function journeyCredit(w:World,p:Person,extraWater=0,extraFood=0):{food:number;water:number;ticks:number}{
 if(!hasJourneys(w))return {food:0,water:0,ticks:0};
 const water=Math.min(JOURNEY_LIMITS.portions,Math.floor(journeyAvailable(w,p,'water'))+extraWater);
 let portions=0,food=0;
 for(const k of Object.keys(NUTRITION).sort((a,b)=>NUTRITION[a as FoodKind]-NUTRITION[b as FoodKind]) as FoodKind[]){
  const n=Math.min(JOURNEY_LIMITS.portions-portions,Math.floor(journeyAvailable(w,p,k)));portions+=n;food+=n*NUTRITION[k]*0.8;
 }
 const additional=Math.min(JOURNEY_LIMITS.portions-portions,extraFood);portions+=additional;food+=additional*12*0.8;
 return {food,water:water*WATER_VALUE*0.8,ticks:water*8+portions*WORK.eat};
}
