import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {CROWD_AT,peopleKnownOf} from '../../src/sim/known_crowd';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The world's live count and somebody's own knowing of people fall on opposite sides of a crowd. */
export function liveAndKnownCrowdDiffer(w:World):boolean{
 const alive=w.persons.filter(p=>p.alive).length;
 return w.persons.some(p=>p.alive&&(alive>=CROWD_AT)!==(peopleKnownOf(p)>=CROWD_AT));
}
/** Rules 181 judges a crowd by the people one knows of. Ordinary Normal birch (arrivals on): from tick 38,551 somebody knows of fewer than
 * two dozen people while the world holds two dozen or more (sampled every 50 ticks). 40000 ticks include that, then 120 more after a save and load. */
export function v181Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:181});
 let differ=false;
 for(let i=0;i<40000;i++){
  stepWorld(w);
  if(!differ&&i%50===0&&liveAndKnownCrowdDiffer(w))differ=true;
 }
 if(!differ)throw Error('Rules181 reference world never has a live and known crowd that differ');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules181 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
