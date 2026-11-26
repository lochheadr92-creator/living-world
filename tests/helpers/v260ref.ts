import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V260_SEED='gen-2';
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:260});
/** Tick 48000 (day 20). Unlike the rules 257 pin (gen-4 at 36000), this one is chosen so the saved world holds the state rules 260 added: gen-4 had no courting in the uptake runs and gen-2 the most, but ordinary gen-2 at 36000 still holds no courted pair; at 48000 it holds one (two relation records) and one arriving household with its welcome record. */
export const V260_TICK=48000;
/** Plain counts of the rules 260 saved state in a world: relations with a `courted` record (both sides of a pair are counted, so pairs are half as many), relations with a refusal count, households with an arrival record and with welcomers, people owed thanks (and the thanks they owe) and buildings whose builders are due thanks. */
export function v260State(w:World){
 let courted=0,courtRefused=0;const pairs=new Set<string>();
 for(const p of w.persons)for(const [other,r] of Object.entries(p.relations)){
  if(r.courted!==undefined){courted++;pairs.add([p.id,Number(other)].sort((a,b)=>a-b).join('-'));}
  if(r.courtRefused!==undefined)courtRefused++;
 }
 let arrivedHouseholds=0,welcomedHouseholds=0;
 for(const h of w.households){if(h.arrived!==undefined)arrivedHouseholds++;if(h.welcomed!==undefined)welcomedHouseholds++;}
 let thanksOwedPeople=0,thanksOwedEntries=0;
 for(const p of w.persons)if(p.thanksOwed!==undefined){thanksOwedPeople++;thanksOwedEntries+=p.thanksOwed.length;}
 const thanksDueBuildings=w.buildings.filter(b=>b.thanksDue!==undefined).length;
 return {courted,courtedPairs:pairs.size,courtRefused,arrivedHouseholds,welcomedHouseholds,thanksOwedPeople,thanksOwedEntries,thanksDueBuildings};
}
/** Rules 260. An ordinary Normal gen-2 (arrivals on), run to `tick`, saved there and continued 120 ticks; the counts are of the saved world. */
export function v260Continuation(tick:number){
 const w=make(V260_SEED);
 while(w.tick<tick)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw),state=v260State(w);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules260 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,arrivals:w.stats.arrivals??0,alive:w.persons.filter(p=>p.alive).length,...state};
}
