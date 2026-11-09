import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {isSolidHome} from '../../src/sim/constants';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {DOOR_REACH,seesInside} from '../../src/sim/home_interior';
import {senseRadius} from '../../src/sim/perception';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody outdoors is within sight of a hut or house that has something in its store, and is neither inside it nor at its door. */
export function someoneSeesAHomeFromOutside(w:World):boolean{
 for(const b of w.buildings){
  if(!isSolidHome(b.type)||!Object.values(b.store.items).some(n=>(n??0)>0))continue;
  for(const p of w.persons){
   if(!p.alive||p.indoors)continue;
   const dx=Math.max(b.x-p.x,0,p.x-(b.x+b.w)),dy=Math.max(b.y-p.y,0,p.y-(b.y+b.h)),d=Math.hypot(dx,dy);
   if(!seesInside(p,b)&&d>DOOR_REACH&&d<=senseRadius(w,p))return true;
  }
 }
 return false;
}
/** Rules 184 learns a home's contents only from inside or at the door. Ordinary Normal birch (arrivals on): from tick 12,176 somebody is in sight of a stocked hut and
 * not at its door (sampled every 25 ticks). 14000 ticks include that, then 120 more after a save and load. */
export function v184Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:184});
 let seen=false;
 for(let i=0;i<14000;i++){
  stepWorld(w);
  if(!seen&&i%25===0&&someoneSeesAHomeFromOutside(w))seen=true;
 }
 if(!seen)throw Error('Rules184 reference world never has somebody in sight of a stocked home and not at its door');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules184 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}

