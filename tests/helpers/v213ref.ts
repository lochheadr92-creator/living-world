import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The world holds what only rules 213 makes: a child recorded as shown a task, or a child resting from gathering. */
export function threeAgesShows(w:World):boolean{
 return w.persons.some(p=>p.alive&&(!!p.shown?.length||(p.cooldowns.childwork??0)>w.tick));
}
/** Rules 213 (three_ages.ts). Ordinary Normal gen-2 (arrivals on), stepped until such a thing is in the world (checked every 25 ticks, at
 * most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world never shows it the
 * function throws rather than recording a pin that does not exercise the rule. */
export function v213Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:213});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&threeAgesShows(w))reached=true;}
 if(!reached)throw Error('Rules213 reference world never shows a child shown a task or resting from gathering');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules213 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
