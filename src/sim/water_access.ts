import { DAY } from './constants';
import { hasWaterBudget, waterBodyAt, waterSign } from './hydrology';
import type { WaterBody, WaterSign } from './hydrology';
import { putBelief } from './knowledge';
import { isWaterAccess } from './registry';
import type { Activity, Belief, Person, World } from './types';

/** Only the immediately adjacent water can be reached from this shore point.
 * Available water is preferred over a dry adjacent component, without moving remotely. */
export function shoreWater(w: World, x: number, y: number): {body:WaterBody;x:number;y:number} | undefined {
  if (!hasWaterBudget(w)) return;
  const tx=Math.floor(x),ty=Math.floor(y);let best:ReturnType<typeof shoreWater>,cost=Infinity;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    const wx=tx+dx+0.5,wy=ty+dy+0.5,b=waterBodyAt(w,wx,wy);
    if(!b)continue;
    const distance=Math.hypot(wx-x,wy-y),candidate=distance+(b.amount<1?10:0);
    if(distance<=2&&candidate<cost){best={body:b,x:wx,y:wy};cost=candidate;}
  }
  return best;
}
export function waterSupplyNear(w: World,x:number,y:number): WaterSign | undefined {
  const at=shoreWater(w,x,y);return at?waterSign(at.body):undefined;
}
/** The performer is outside on a legal shore, not in an adjacent room. */
export function waterContact(w: World,p: Person): ReturnType<typeof shoreWater> {
  if(p.indoors||!isWaterAccess(w,Math.floor(p.x),Math.floor(p.y)))return;
  return shoreWater(w,p.x,p.y);
}
/** Current physical execution only; options must use the dated belief below instead. */
export function workingWater(w:World,p:Person,a:Activity): WaterBody | undefined {
  if(p.indoors||!isWaterAccess(w,Math.floor(p.x),Math.floor(p.y)))return;
  const x=Number(a.data.wx),y=Number(a.data.wy);
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(p.x-x,p.y-y)>2)return;
  const body=waterBodyAt(w,x,y);return body?.id===a.data.waterBody?body:undefined;
}
/** Successful and failed local draws revise only nearby personally observed access records. */
export function observeShore(w:World,p:Person):void {
  if(!hasWaterBudget(w)||p.indoors)return;
  for(const b of Object.values(p.beliefs))if(b.kind==='water'&&Math.hypot(b.x-p.x,b.y-p.y)<=3){
    const sign=waterSupplyNear(w,b.x,b.y);
    if(sign)putBelief(p,{...b,seen:w.tick,src:'seen',from:0,waterSupply:sign});
  }
}
export function rememberedDry(w:World,b:Belief):boolean {
  return hasWaterBudget(w)&&b.waterSupply==='dry'&&w.tick-b.seen<DAY/2;
}
export function rememberedWaterCost(w:World,b:Belief):number {
  if(!hasWaterBudget(w)||!b.waterSupply)return 0;
  const age=Math.max(0,w.tick-b.seen),fade=Math.max(0,1-age/(3*DAY));
  return (b.waterSupply==='dry'?20:b.waterSupply==='low'?6:0)*fade;
}
