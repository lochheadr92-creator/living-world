import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {knowsDeath} from '../../src/sim/death_knowledge';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {CONCERN_LIFE} from '../../src/sim/welfare';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** A worry is still held about someone on the deceased list, by a person who has not learned that death, and the worry is not yet too old. */
export function sawKeptWorry(w:World):boolean{
 const gone=new Set(w.deceased.map(d=>d.id));
 if(!gone.size)return false;
 for(const p of w.persons){
  if(!p.alive)continue;
  for(const c of p.concerns){
   if(!gone.has(c.about))continue;
   if(knowsDeath(p,c.about))continue;
   if(w.tick-c.seen>=CONCERN_LIFE)continue;
   return true;
  }
 }
 return false;
}
/** Rules 170 keeps a worry after the subject has left the register. The ordinary Normal 'birch' world (arrivals on)
 * first does so at tick 30433 (first death at 26558; none of birch, forest, meadow, river, aspen or cedar did in 10 days).
 * 32000 ticks include it, then 120 more after a save and load. */
export function v170Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:170});
 let kept=false;
 for(let i=0;i<32000;i++){
  stepWorld(w);
  if(!kept&&sawKeptWorry(w))kept=true;
 }
 if(!kept)throw Error('Rules170 reference world never keeps a worry about someone on the deceased list');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules170 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
