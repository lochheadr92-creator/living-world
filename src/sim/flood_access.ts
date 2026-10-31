import { floodMovementBlocked } from './flood';
import { isWalkable } from './registry';
import { T } from './types';
import type { Activity, Person, World } from './types';

/** A person caught on affected ground can physically retreat to nearby visible safe ground.
 * Four-neighbour local search cannot inspect routes beyond three tiles or cross solid terrain. */
export function floodEscapePath(w:World,p:Person):number[]|null {
 const sx=Math.floor(p.x),sy=Math.floor(p.y),start=sy*w.W+sx,queue=[start],from=new Map<number,number>([[start,-1]]);
 for(let cursor=0;cursor<queue.length;cursor++){
  const i=queue[cursor],x=i%w.W,y=Math.floor(i/w.W);
  if(i!==start&&!floodMovementBlocked(w,p,x,y)){
   const chain:number[]=[];for(let at=i;at!==start;at=from.get(at)!)chain.push(at);chain.reverse();return chain.flatMap(at=>[at%w.W+0.5,Math.floor(at/w.W)+0.5]);
  }
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,ni=ny*w.W+nx;
   if(Math.abs(nx-sx)>3||Math.abs(ny-sy)>3||!isWalkable(w,nx,ny)||from.has(ni))continue;
   const terrain=w.terrain[ni];if(p.cartId&&(terrain===T.FOREST||terrain===T.STONY||terrain===T.SHALLOW))continue;
   from.set(ni,i);queue.push(ni);
  }
 }
 return null;
}
/** A bounded pause retains this physical activity and its claims; normal urgent interruption remains. */
export function waitForFlood(w:World,p:Person,a:Activity):'moving'|'blocked' {
 a.data.floodWaitSince??=w.tick;a.blocked='Waiting for a safe route past remembered flood ground';p.pose='stand';
 if(w.tick-a.data.floodWaitSince>=180){a.blocked='flood route stayed blocked after waiting';return 'blocked';}
 return 'moving';
}
