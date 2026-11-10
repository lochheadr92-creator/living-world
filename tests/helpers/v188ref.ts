import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody remembers what they last took, and from where. */
export function someoneRemembersATaking(w:World):boolean{
 return w.persons.some(p=>p.lastTaken!==undefined);
}
/** Rules 188 names what was taken and from where. Ordinary Normal river (arrivals on): the first remembered taking is at tick 13
 * (sampled every 25 ticks). 2,400 ticks include many, then 120 more after a save and load. */
export function v188Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:188});
 let recorded=false;
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!recorded&&i%25===0&&someoneRemembersATaking(w))recorded=true;
 }
 if(!recorded)throw Error('Rules188 reference world never holds a remembered taking');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules188 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
