// Pure claims over personally held goods; no option/handler imports or hidden world lookups.
import type {ItemKind,Person,World} from './types';
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
