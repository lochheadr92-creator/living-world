import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {laidUp} from '../../src/sim/responsibilities';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody is laid up (injured, or ill enough to be in no state to see to anyone). */
export function someoneLaidUp(w:World):boolean{return w.persons.some(p=>p.alive&&laidUp(w,p));}
/** Rules 180 counts an able adult at home only if the laid-up person can see one.
 * Ordinary Normal river (arrivals on): somebody is laid up from tick 201 (sampled every 50 ticks). In birch, forest and river no laid-up person
 * lives with a child in 12,000 ticks, so this pin does not reach the changed branch; tests/known_able.test.ts does.
 * 2400 ticks include a laid-up person, then 120 more after a save and load. */
export function v180Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:180});
 let laid=false;
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!laid&&i%50===0&&someoneLaidUp(w))laid=true;
 }
 if(!laid)throw Error('Rules180 reference world never has a laid-up person');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules180 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
