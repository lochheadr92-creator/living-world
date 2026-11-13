import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {IRON_WHY} from '../../src/sim/smithy_iron';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V235_SEED='river';
export const V235_TICK=48500;
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:235});
/** People now at something done because the smithy wants iron (smithy_iron.ts: the activity's goal begins with the want's words). */
export const atIronWork=(w:World):number=>w.persons.filter(p=>p.alive&&!!p.activity&&p.activity.goal.startsWith(IRON_WHY)).length;
/** The first multiple of 100 ticks at which somebody is at such work, or 0 (how the pin's seed and tick were chosen). */
export function firstIronWork235(seed:string,maxTicks:number):number{
 const w=make(seed);
 while(w.tick<maxTicks){stepWorld(w);if(w.tick%100===0&&atIronWork(w)>0)return w.tick;}
 return 0;
}
/** Rules 235 (smithy_iron.ts). An ordinary Normal world (arrivals on) stepped to the tick at which somebody is at work the
 * smithy's standing want for iron gave them (found with firstIronWork235: of six worlds tried within 25 days only river, at tick 48,500), saved there, then 120 ticks more. If nobody is at
 * such work at that tick the function throws rather than recording a pin that does not exercise the rule. */
export function v235Continuation(){
 const w=make(V235_SEED);
 while(w.tick<V235_TICK)stepWorld(w);
 const at=atIronWork(w);
 if(at<1)throw Error('Rules235 reference world has nobody at work for the smithy\'s iron');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules235 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,atIronWork:at,ironMade:(w.ledger.created as Record<string,number>).iron??0};
}
