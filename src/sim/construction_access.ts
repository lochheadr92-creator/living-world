import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
// Before a new footprint is occupied, all walkable perimeter exits must still
// connect. Conservative cardinal flood: false negatives refuse a site, never trap someone.
import { isWalkable } from './registry';
import type { World } from './types';
let enabled = true;
export const constructionSafetyOn = (): boolean => enabled;
export function setConstructionSafety(on: boolean): void { enabled=on; }
export const allSitesNeedAccess = (w: World): boolean => enabled && isRich(w) && runsRulesVersion(w,19);
export function preservesAccess(w: World, x: number, y: number, width: number, height: number): boolean {
 const inside=(px:number,py:number)=>px>=x&&px<x+width&&py>=y&&py<y+height;
 if(w.persons.some(p=>p.alive&&!p.indoors&&inside(Math.floor(p.x),Math.floor(p.y))))return false;
 if(w.buildings.some(b=>inside(b.doorX,b.doorY)))return false;
 const perimeter:number[]=[];
 for(let yy=y-1;yy<=y+height;yy++)for(let xx=x-1;xx<=x+width;xx++)
  if(!inside(xx,yy)&&isWalkable(w,xx,yy))perimeter.push(yy*w.W+xx);
 if(!perimeter.length)return false;
 const seen=new Uint8Array(w.W*w.H);const queue=[perimeter[0]];seen[perimeter[0]]=1;
 let found=1;const targets=new Set(perimeter);
 for(let at=0;at<queue.length&&found<perimeter.length;at++){
  const i=queue[at],px=i%w.W,py=Math.floor(i/w.W);
  for(const [nx,ny] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){
   if(inside(nx,ny)||!isWalkable(w,nx,ny))continue;
   const j=ny*w.W+nx;if(seen[j])continue;seen[j]=1;queue.push(j);if(targets.has(j))found++;
  }
 }
 return found===perimeter.length;
}
