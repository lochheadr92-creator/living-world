import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody's recorded reason for the first storehouse says why now, from what they know: at 192 the want is decided from beliefs. */
export function aFirstStorehouseWantedFromKnowledge(w:World):boolean{
 return w.persons.some(p=>p.lastDecision?.because?.includes('I know of no store'));
}
/** Rules 192 wants the first storehouse from what the person knows. Ordinary Normal gen-2 (arrivals on): the first such decision is recorded by
 * tick 7,100 (sampled every 25 ticks) and the site is marked out by tick 7,175. 7,200 ticks include that, then 120 more after a save and load. */
export function v192Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:192});
 let reached=false;
 for(let i=0;i<7200;i++){
  stepWorld(w);
  if(!reached&&i%25===0&&aFirstStorehouseWantedFromKnowledge(w))reached=true;
 }
 if(!reached)throw Error('Rules192 reference world never wants the first storehouse from knowledge');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules192 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
