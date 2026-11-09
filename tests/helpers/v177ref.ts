import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {knownHungryDependant} from '../../src/sim/known_ration';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {Person,World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The housemate test as it read before rules 177: every housemate's live hunger and health. */
const liveHungryDependant=(w:World,p:Person)=>w.persons.some(q=>q.alive&&q.hhId===p.hhId&&q.id!==p.id&&q.needs.hunger<30&&(q.birthTick>w.tick-12*2400*16||q.health<60));
/** What a person knows of a hungry housemate differs from what the live state says. */
export function knownAndLiveDiffer(w:World):boolean{
 for(const p of w.persons)if(p.alive&&liveHungryDependant(w,p)!==knownHungryDependant(w,p))return true;
 return false;
}
/** Rules 177 decides the granary's emergency ration for a housemate from what the person knows.
 * Ordinary Normal birch (arrivals on): the known and the live test first disagree at tick 7,601 (sampled every 50 ticks).
 * No granary is built in this world within 12,000 ticks, so this pin does not reach the ration branch itself;
 * tests/known_ration.test.ts does. 8000 ticks include the disagreement, then 120 more after a save and load. */
export function v177Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:177});
 let differ=false;
 for(let i=0;i<8000;i++){
  stepWorld(w);
  if(!differ&&i%50===0&&knownAndLiveDiffer(w))differ=true;
 }
 if(!differ)throw Error('Rules177 reference world never has a known and a live hungry-dependant test that disagree');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules177 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
