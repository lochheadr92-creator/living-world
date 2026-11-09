import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody holds a grievance, or a history note, that names the event which caused it. */
export function someoneHoldsACause(w:World):boolean{
 for(const p of w.persons)for(const r of Object.values(p.relations)){
  if(r.grievance?.eventId!==undefined)return true;
  if(r.history.some(h=>h.eventId!==undefined))return true;
 }
 return false;
}
/** Rules 182 keeps the event that caused a grievance. Ordinary Normal birch (arrivals on): from tick 76 somebody holds a linked grievance and history note
 * (sampled every 25 ticks). 2400 ticks include that, then 120 more after a save and load. */
export function v182Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:182});
 let linked=false;
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!linked&&i%25===0&&someoneHoldsACause(w))linked=true;
 }
 if(!linked)throw Error('Rules182 reference world never holds a cause-linked grievance');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules182 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
