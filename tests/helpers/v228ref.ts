import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {WORK_FIRST} from '../../src/sim/parent_decides';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V228_SEED='aspen';
export const V228_TICK=2400;
const make=():World=>createWorld({...currentWorldSettings('normal',V228_SEED,{immigration:true}),rulesVersion:228});
/** Family-time asks answered 'not now' because of work, among the conversations now open. */
const refusedNow=(w:World):number[]=>w.conversations.filter(c=>c.purpose==='family_time'&&c.childhood?.outcome==='declined'&&c.childhood.reason.startsWith(WORK_FIRST)).map(c=>c.id);
/** The first multiple of 100 ticks by which a grown person has told a child 'not now' for a job in hand, or 0 (how the pin's tick was chosen). */
export function firstRefusal228(maxTicks:number):number{
 const w=make();const seen=new Set<number>();
 while(w.tick<maxTicks){stepWorld(w);for(const id of refusedNow(w))seen.add(id);if(seen.size&&w.tick%100===0)return w.tick;}
 return 0;
}
/** Rules 228 (parent_decides.ts). Ordinary Normal aspen (arrivals on) stepped to the tick by which a grown person with a job in
 * hand has answered a child's ask for family time with 'not now' (found with firstRefusal228; no such answer exists before rules
 * 228), then 120 more after a save and load. If no such answer has been given the function throws rather than recording a pin
 * that does not exercise the rule. */
export function v228Continuation(){
 const w=make();const seen=new Set<number>();
 while(w.tick<V228_TICK){stepWorld(w);for(const id of refusedNow(w))seen.add(id);}
 if(!seen.size)throw Error('Rules228 reference world has no family-time ask refused for work');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules228 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,refusedForWork:seen.size};
}
