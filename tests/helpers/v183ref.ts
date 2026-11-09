import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {senseRadius} from '../../src/sim/perception';
import {sameSpace} from '../../src/sim/habitation';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody awake is within the old fixed witness radius of another person but could not see them: in another space, or beyond their own sense radius. */
export function someoneCouldNotSee(w:World):boolean{
 for(const a of w.persons){
  if(!a.alive||a.pose==='sleep')continue;
  for(const b of w.persons){
   if(a===b||!b.alive)continue;
   const d=Math.hypot(a.x-b.x,a.y-b.y);
   if(d<=7.5&&(!sameSpace(w,a,b)||d>senseRadius(w,a)))return true;
  }
 }
 return false;
}
/** Rules 183 counts a witness only if they can see. Ordinary Normal birch (arrivals on): from early on somebody awake is inside the old radius of
 * another person and cannot see them (indoors, or in the dark), sampled every 25 ticks. 2400 ticks include that, then 120 more after a save and load. */
export function v183Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:183});
 let blind=false;
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!blind&&i%25===0&&someoneCouldNotSee(w))blind=true;
 }
 if(!blind)throw Error('Rules183 reference world never has somebody who is within the old radius and cannot see');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules183 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
