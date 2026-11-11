import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const REASONS=['a gathering is called at this fire','it would save me the walk to food'];
/** Somebody's last choice rested on one of the two rules-202 reasons (swap_and_fire.ts). */
export function aChoiceOnA202Reason(w:World):boolean{
 return w.persons.some(p=>p.alive&&(p.lastDecision?.chosen?.parts??[]).some(x=>REASONS.includes(String(x[0]))));
}
/** Rules 202 (swap_and_fire.ts). Ordinary Normal gen-2 (arrivals on), stepped until somebody chooses on a rules-202 reason (checked
 * every 25 ticks, at most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. NOT YET RUN when
 * written: if no such choice appears the function throws, and another seed is chosen. */
export function v202Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:202});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&aChoiceOnA202Reason(w))reached=true;}
 if(!reached)throw Error('Rules202 reference world never chooses on a rules-202 reason');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules202 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
