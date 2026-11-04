import {CARCASS_WORK} from './carcass';
import type {Ctx,Option} from './optutil';

/** Compare already generated, personally known food routes at their first meal.
 * A sheep is still a body after slaughter: recovery time is part of that route.
 * No remote stock, pregnancy, or ownership state is inspected here. */
export function earlierFoodRoute(ctx:Ctx,slaughterTravel:number,slaughterWork:number):Option|undefined {
 const firstMeal=(o:Option):number=>{
  if(o.blocked||!o.make||o.util<=0||o.need!=='hunger')return Infinity;
  if(o.kind==='eat')return o.eta;
  if(o.kind==='eat_store'){
   const b=ctx.p.beliefs[o.targetId];
   // Theft is not a substitute for using the household's own animal.
   return b&&(b.hh===0||b.hh===ctx.p.hhId)?o.eta:Infinity;
  }
  if(o.kind==='gather'&&o.scopeEstimate)return o.scopeEstimate.walk+o.scopeEstimate.work+12;
  if(o.kind==='butcher'&&o.yields==='meat')return o.eta+12;
  return Infinity;
 };
 const limit=slaughterTravel+slaughterWork+CARCASS_WORK+12;
 return ctx.options.filter(o=>firstMeal(o)<=limit).sort((a,b)=>firstMeal(a)-firstMeal(b)||a.key.localeCompare(b.key))[0];
}
