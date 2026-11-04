// Pure claims over personally held goods; no option/handler imports or hidden world lookups.
import type {Intention,ItemKind,Person,World} from './types';
import {runsRulesVersion} from './rulesversion';
export function plannedFor(p:Person,item:ItemKind):number{
 let n=0;for(const i of p.intentions)if(i.status==='active')n+=i.wants[item]??0;return n;
}
export function reservedFor(world:World,p:Person,item:ItemKind):number{
 let n=0;
 for(const c of p.commitments){
  if(c.status!=='active'||c.item!==item)continue;
  if(c.kind==='deliver'||c.kind==='haul')n+=Math.max(0,c.amount-(c.delivered??0));
 }
 n+=plannedFor(p,item);void world;return n;
}

let orderedProjectClaims=true;
export const orderedProjectClaimsOn=()=>orderedProjectClaims;
export const setOrderedProjectClaims=(on:boolean):void=>{orderedProjectClaims=on;};
/** Carried stock available to a project: promises first, then active plans in adoption order.
 * Its own allocated share and otherwise unclaimed surplus are usable. An unadopted proposal
 * has no share; copying an id or wants cannot manufacture one. No stock or claim is mutated.
 */
export function availableForProject(w:World,p:Person,plan:Pick<Intention,'wants'>|undefined,item:ItemKind):number{
 if(!orderedProjectClaims||w.settings.dynamics!=='rich'||!runsRulesVersion(w,148))
  return Math.max(0,(p.inv[item]??0)-reservedFor(w,p,item)+(plan?.wants[item]??0));
 let owed=0;
 for(const c of p.commitments)if(c.status==='active'&&c.item===item&&(c.kind==='deliver'||c.kind==='haul'))
  owed+=Math.max(0,c.amount-(c.delivered??0));
 let pool=Math.max(0,(p.inv[item]??0)-owed),own=0;
 for(const other of p.intentions){
  if(other.status!=='active')continue;
  const share=Math.min(Math.max(0,other.wants[item]??0),pool);
  if(other===plan)own=share;
  pool-=share;
 }
 return own+pool;
}
