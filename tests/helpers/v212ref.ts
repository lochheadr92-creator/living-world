import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
import {ageYears} from '../../src/sim/people';
import {LITTLE_AGE} from '../../src/sim/child_pace';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The world holds what rules 212 changes: a little one (under seven) on the move, walking at a little one's pace. */
export function littleOneWalking(w:World):boolean{
 return w.persons.some(p=>p.alive&&ageYears(w,p)<LITTLE_AGE&&(p.pose==='walk'||p.pose==='run'));
}
/** Rules 212 (child_pace.ts). Ordinary Normal gen-2 (arrivals on), stepped until such a thing is in the world (checked every 25 ticks, at
 * most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world never shows it the
 * function throws rather than recording a pin that does not exercise the rule. */
export function v212Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:212});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&littleOneWalking(w))reached=true;}
 if(!reached)throw Error('Rules212 reference world never shows a little one walking');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules212 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
