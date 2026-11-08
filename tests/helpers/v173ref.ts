import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {isDependent} from '../../src/sim/people';
import {currentWorldSettings} from '../../src/sim/profiles';
import {knownNeeds} from '../../src/sim/remembered_need';
import type {Person,World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** A household dependant in sight is not judged by their live hunger, thirst or warmth. */
export function signsDiffer(w:World):boolean{
 for(const p of w.persons){
  if(!p.alive)continue;
  for(const s of p.seen){
   if(s.ent!=='person')continue;
   const q=w.byId.get(s.id);
   if(!q||q.ent!=='person'||!q.alive||q.hhId!==p.hhId||!isDependent(w,q))continue;
   const d=q as Person;
   const kn=knownNeeds(w,p,d,true);
   if(!kn)continue;
   if(kn.hunger!==d.needs.hunger||kn.thirst!==d.needs.thirst||kn.warmth!==d.needs.warmth)return true;
  }
 }
 return false;
}
/** Rules 173 judges a dependant in sight from visible signs, not live needs.
 * Ordinary Normal birch (arrivals on) first does so at tick 1 when sampled every 50 ticks.
 * Forest, meadow, river, aspen and cedar do the same at tick 1.
 * 2400 ticks include that case, then 120 more after a save and load. */
export function v173Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:173});
 let seen=false;
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!seen&&i%50===0&&signsDiffer(w))seen=true;
 }
 if(!seen)throw Error('Rules173 reference world never judges a dependant in sight from signs rather than live needs');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules173 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
