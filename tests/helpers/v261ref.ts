import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V261_SEED='gen-2';
const make=(seed:string):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:261});
/** Tick 48000 (day 20), the same world and tick as the rules 260 pin, chosen after probing so the saved world holds the state rules 261 added (see the note in the expected file). */
export const V261_TICK=48000;
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
/** Plain counts of the rules 261 saved state in a world (birth_help.ts, naming.ts, vigil.ts): people lying in, people who have attended a birth (and the births they were beside), people asked to a birth, people named after the dead, feasts that are a naming feast (and the children they name, and how many are already named aloud), requests to attend a birth, and activities (current or suspended) marked as a vigil, a lying in or a birth visit. */
export function v261State(w:World){
 let lyingIn=0,attendedPeople=0,attendedBirths=0,birthAsked=0,namedAfter=0;
 let vigilActivities=0,lyingInActivities=0,birthActivities=0;
 for(const p of w.persons){
  if(p.lyingIn!==undefined)lyingIn++;
  if(p.attended!==undefined){attendedPeople++;attendedBirths+=p.attended;}
  if(p.birthAsked!==undefined)birthAsked++;
  if(p.namedAfter!==undefined)namedAfter++;
  for(const a of [p.activity,p.suspended]){
   if(!a)continue;
   if(a.data.vigil!==undefined)vigilActivities++;
   if(a.data.lyingIn!==undefined)lyingInActivities++;
   if(a.data.birth!==undefined)birthActivities++;
  }
 }
 let namingFeasts=0,namingChildren=0,namedAloud=0;
 for(const o of w.occasions??[]){if(o.naming!==undefined){namingFeasts++;namingChildren+=o.naming.length;}if(o.named!==undefined)namedAloud+=o.named.length;}
 const attendBirthRequests=w.requests.filter(r=>r.kind==='attend_birth').length;
 return {lyingIn,attendedPeople,attendedBirths,birthAsked,namedAfter,namingFeasts,namingChildren,namedAloud,attendBirthRequests,vigilActivities,lyingInActivities,birthActivities};
}
/** Rules 261. An ordinary Normal gen-2 (arrivals on), run to `tick`, saved there and continued 120 ticks; the counts are of the saved world. */
export function v261Continuation(tick:number){
 const w=make(V261_SEED);
 while(w.tick<tick)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw),state260=v260State(w),state261=v261State(w);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules261 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,arrivals:w.stats.arrivals??0,alive:w.persons.filter(p=>p.alive).length,...state260,...state261};
}
