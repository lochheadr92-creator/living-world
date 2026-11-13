import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {WATER_IDS_FROM} from '../../src/sim/id_ranges';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V234_SEED='aspen';
export const V234_TICK=2400;
const make=():World=>createWorld({...currentWorldSettings('normal',V234_SEED,{immigration:true}),rulesVersion:234});
/** Rules 234 (id_ranges.ts). Ordinary Normal aspen (arrivals on) stepped one day, by when people hold water knowledge numbered
 * from two thousand million and have told one another things under pair keys, then 120 ticks more after a save and load. If
 * either is missing the function throws rather than recording a pin that does not exercise the rule. */
export function v234Continuation(){
 const w=make();
 while(w.tick<V234_TICK)stepWorld(w);
 const water=w.persons.flatMap(p=>Object.values(p.beliefs).filter(b=>b.kind==='water').map(b=>b.id));
 const told=w.persons.flatMap(p=>Object.keys(p.told));
 if(!water.length||water.some(id=>id<WATER_IDS_FROM)||!told.length||told.some(k=>!/^\d+:\d+$/.test(k)))throw Error('Rules234 reference world does not use the separate id ranges');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules234 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,waterBeliefs:water.length,toldRecords:told.length};
}
