import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {PROJECT_CAP} from '../../src/sim/project_room';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** A shared project holds more than the cap: what rules 196 never allows (rules 195 reaches it in this world at tick 12,031). */
export function aProjectOverTheCap(w:World):boolean{
 return (w.civicProjects??[]).some(q=>q.participants.length>PROJECT_CAP);
}
/** Rules 196 never records a thirteenth participant. Ordinary Normal told-beliefs-legacy (arrivals off, the save_told product world): at
 * rules 195 the first shared storehouse holds thirteen at tick 12,031, so the 196 trajectory parts from 195 there. 12,100 ticks checked
 * every tick for a project over the cap (which must never occur), then 120 more after a save and load (which 195 could not do). */
export function v196Continuation(){
 const w=createWorld({...currentWorldSettings('normal','told-beliefs-legacy',{immigration:false}),rulesVersion:196});
 for(let i=0;i<12100;i++){
  stepWorld(w);
  if(aProjectOverTheCap(w))throw Error('Rules196 reference world took a thirteenth participant at tick '+w.tick);
 }
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules196 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
