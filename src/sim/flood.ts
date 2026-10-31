import { DAY } from './constants';
import { nearbyWaterFraction } from './hydrology';
import { delBelief, putBelief } from './knowledge';
import { runsRulesVersion } from './rulesversion';
import { T } from './types';
import type { Building, Person, World } from './types';

export interface Flood { since:number; activeUntil:number; recoveryUntil:number; tiles:number[] }
export type FloodSign='flooded'|'recovering';
let enabled=true;
export const setFloodAccess=(on:boolean):void=>{enabled=on;};
export const floodAccessEnabled=():boolean=>enabled;
export const hasFloodAccess=(w:World):boolean=>enabled&&eligible(w);
const eligible=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,88);
const MEMORY_BASE=3_000_000;
export const floodPlaceId=(tile:number):number=>-MEMORY_BASE-tile;
const cache=new WeakMap<Flood,Set<number>>();
function tiles(f:Flood):Set<number>{let set=cache.get(f);if(!set){set=new Set(f.tiles);cache.set(f,set);}return set;}

/** A single bounded footprint. It is wet ground, not another extractable water inventory. */
export function beginFlood(w:World):boolean {
 if(!hasFloodAccess(w)||w.weather.storm<0.92||w.flood)return false;
 const affected:number[]=[];
 for(let i=0;i<w.W*w.H;i++){
  if(w.terrain[i]===T.DEEP||w.terrain[i]===T.SHALLOW)continue;
  if((nearbyWaterFraction(w,i%w.W,Math.floor(i/w.W),2)??0)>=0.5)affected.push(i);
 }
 if(!affected.length)return false;
 w.flood={since:w.tick,activeUntil:w.tick+DAY/4,recoveryUntil:w.tick+DAY,tiles:affected};return true;
}
export function floodAt(w:World,x:number,y:number):FloodSign|undefined {
 const f=w.flood,tx=Math.floor(x),ty=Math.floor(y);
 if(!hasFloodAccess(w)||!f||tx<0||ty<0||tx>=w.W||ty>=w.H||w.tick>=f.recoveryUntil||!tiles(f).has(ty*w.W+tx))return;
 return w.tick<f.activeUntil?'flooded':'recovering';
}
export function updateFlood(w:World):void {if(hasFloodAccess(w)&&w.flood&&w.tick>=w.flood.recoveryUntil)delete w.flood;}

/** Close outdoor observation only. No expiry date of the real flood enters personal memory. */
export function observeFlood(w:World,p:Person):void {
 if(!hasFloodAccess(w)||p.indoors)return;
 const cx=Math.floor(p.x),cy=Math.floor(p.y);
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  if(dx*dx+dy*dy>4)continue;
  const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=w.W||y>=w.H)continue;
  const id=floodPlaceId(y*w.W+x),sign=floodAt(w,x,y),old=p.beliefs[id];
  if(!sign&&!old)continue;
  putBelief(p,{id,kind:'flood',x:x+0.5,y:y+0.5,amount:0,max:0,seen:w.tick,learned:old?.learned??w.tick,src:'seen',from:0,state:sign??'clear'});
 }
 const memories=(p.bykind.flood??[]).map(id=>p.beliefs[id]).sort((a,b)=>b.seen-a.seen||Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)||a.id-b.id);
 for(const b of memories.slice(64))delBelief(p,b.id);
}
/** An actual resident attempting the exit can inspect that doorway, not the outside map. */
export function observeFloodDoor(w:World,p:Person,b:Building):void {
 if(!hasFloodAccess(w)||p.indoors!==b.id)return;
 const id=floodPlaceId(b.doorY*w.W+b.doorX),sign=floodAt(w,b.doorX,b.doorY),old=p.beliefs[id];
 if(!sign&&!old)return;
 if(!old&&(p.bykind.flood?.length??0)>=64){const oldest=p.bykind.flood!.slice().sort((a,c)=>p.beliefs[a].seen-p.beliefs[c].seen||a-c)[0];delBelief(p,oldest);}
 putBelief(p,{id,kind:'flood',x:b.doorX+0.5,y:b.doorY+0.5,amount:0,max:0,seen:w.tick,learned:old?.learned??w.tick,src:'seen',from:0,state:sign??'clear'});
}
/** Planning consults only dated personal signs. Old warnings become uncertain after a day. */
export function knownFloodCosts(w:World,p:Person):Map<number,number>|undefined {
 if(!hasFloodAccess(w))return;
 const costs=new Map<number,number>();
 for(const id of p.bykind.flood??[]){const b=p.beliefs[id];if(w.tick-b.seen>=DAY||b.state==='clear')continue;
  const x=Math.floor(b.x),y=Math.floor(b.y);costs.set(y*w.W+x,b.state==='flooded'||p.cartId!==0?0:2);
  // Existing trailing cart needs one tile of clearance around a personally known wet patch.
  if(p.cartId)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(x+dx>=0&&y+dy>=0&&x+dx<w.W&&y+dy<w.H)costs.set((y+dy)*w.W+x+dx,0);
 }
 return costs.size?costs:undefined;
}
export function floodMovementBlocked(w:World,p:Person,x:number,y:number):boolean {
 const next=floodAt(w,x,y);if(next==='flooded'||!!p.cartId&&next==='recovering')return true;
 if(p.cartId)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(floodAt(w,x+dx,y+dy))return true;
 return false;
}
export function floodSpeed(w:World,p:Person):number {
 if(p.indoors)return 1;
 const sign=floodAt(w,p.x,p.y);return sign==='flooded'?0.3:sign==='recovering'?0.65:1;
}
export function validateFlood(w:World):void {
 const fail=():never=>{throw new Error('invalid saved flood footprint or memory');};
 if(w.flood!==undefined){const f=w.flood;if(!eligible(w)||!f||Object.keys(f).some(k=>!['since','activeUntil','recoveryUntil','tiles'].includes(k))||!Number.isSafeInteger(f.since)||f.since<0||f.since>w.tick||f.activeUntil!==f.since+DAY/4||f.recoveryUntil!==f.since+DAY||!Array.isArray(f.tiles)||!f.tiles.length||f.tiles.length>w.W*w.H)fail();
  let last=-1;for(const i of f.tiles){if(!Number.isSafeInteger(i)||i<=last||i>=w.W*w.H||w.terrain[i]===T.DEEP||w.terrain[i]===T.SHALLOW)fail();last=i;}
 }
 for(const p of w.persons){const bs=Object.values(p.beliefs).filter(b=>b.kind==='flood');if(bs.length>64||bs.length&&!eligible(w))fail();
  for(const b of bs){const i=Math.floor(b.y)*w.W+Math.floor(b.x);if(b.id!==floodPlaceId(i)||b.x!==Math.floor(b.x)+0.5||b.y!==Math.floor(b.y)+0.5||b.x<0||b.y<0||b.x>=w.W||b.y>=w.H||!Number.isSafeInteger(b.seen)||b.seen<0||b.seen>w.tick||!Number.isSafeInteger(b.learned)||b.learned<0||b.learned>w.tick||b.src!=='seen'||b.from!==0||!['flooded','recovering','clear'].includes(b.state??''))fail();}
  for(const a of [p.activity,p.suspended])if(a){const d=a.data;for(const key of ['floodWaitSince','floodObservedAt','floodInterruptedWorkAt'])if(d[key]!==undefined&&(!eligible(w)||!Number.isSafeInteger(d[key])||d[key]<0||d[key]>w.tick))fail();if(d.floodRetreat!==undefined&&(!eligible(w)||d.floodRetreat!==true))fail();}
 }
}
