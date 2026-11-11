import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** A timber yard, laid out or standing, that belongs to nobody: the shared layout of rules 201. */
export function aSharedYard(w:World):boolean{
 return w.sites.some(s=>s.type==='timber_yard'&&s.hhId===0)||w.buildings.some(b=>b.type==='timber_yard'&&b.hhId===0);
}
/** Rules 201 (shared_yard.ts). Ordinary Normal gen-2 (arrivals on), stepped until a shared timber yard is laid out (checked every 25
 * ticks, at most 40,000 ticks: yards are first laid out around day 9 to 11), then to the next multiple of 100 ticks, then 120 more
 * after a save and load. NOT YET RUN when written: if no shared yard appears the function throws, and another seed is chosen. */
export function v201Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:201});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&aSharedYard(w))reached=true;}
 if(!reached)throw Error('Rules201 reference world never lays out a shared timber yard');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules201 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
