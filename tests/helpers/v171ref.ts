import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {isHomeType} from '../../src/sim/constants';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {whereIs,type Ctx} from '../../src/sim/optutil';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {Person,World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
function liveHouseholdHome(p:Person,hh:number|null):{x:number;y:number}|null{
 if(hh==null)return null;
 for(const k in p.beliefs){
  const b=p.beliefs[k as unknown as number];
  if(b.kind==='building'&&b.hh===hh&&isHomeType(b.btype))return {x:b.x,y:b.y};
 }
 return null;
}
/** A told room names a home, and that place is not the one the target's live household id would select. */
export function sawToldHome(w:World):boolean{
 for(const p of w.persons){
  if(!p.alive)continue;
  for(const key of Object.keys(p.whereabouts)){
   const id=Number(key);
   const wh=p.whereabouts[id];
   if(!wh?.room||w.tick-wh.tick<900)continue;
   if(p.seen.some(s=>s.ent==='person'&&s.id===id))continue;
   const loc=whereIs({world:w,p,seenPersons:[]} as unknown as Ctx,id,0);
   if(loc?.how!=='at their home')continue;
   const named=p.beliefs[wh.room.homeId];
   if(!named||named.x!==loc.x||named.y!==loc.y)continue;
   const q=w.byId.get(id);
   const hh=q&&q.ent==='person'?q.hhId:null;
   const old=liveHouseholdHome(p,hh);
   if(!old||old.x!==loc.x||old.y!==loc.y)return true;
  }
 }
 return false;
}
/** Rules 171 looks for someone at a room the searcher was told, not at the target's live household.
 * Ordinary Normal forest (arrivals on) first does so at tick 11951 when sampled every 50 ticks.
 * Birch, meadow, river, aspen and cedar still matched the live household inside 12,000 ticks.
 * 12000 ticks include the forest case, then 120 more after a save and load. */
export function v171Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:171});
 let told=false;
 for(let i=0;i<12000;i++){
  stepWorld(w);
  if(!told&&i%50===0&&sawToldHome(w))told=true;
 }
 if(!told)throw Error('Rules171 reference world never looks someone up at a told room that is not their live household');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules171 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
