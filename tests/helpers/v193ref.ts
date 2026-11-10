import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport,foodUnits} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {LARDER_PER_MEMBER} from '../../src/sim/hut_before_larder';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody in a lean-to household with less than three food per member to hand has chosen to lay out a hut: the rules-193 branch. */
export function aHutLaidOutUnderAnEmptyLarder(w:World):boolean{
 for(const p of w.persons){
  if(!p.alive||p.lastDecision?.chosen?.label!=='Lay out a hut')continue;
  const hh=w.households.find(h=>h.id===p.hhId);const home=hh?.homeId?w.byId.get(hh.homeId):undefined;
  if(!hh||home?.ent!=='building'||home.type!=='lean_to')continue;
  let food=foodUnits(home.store.items);
  for(const id of hh.members){const q=w.byId.get(id);if(q?.ent==='person')food+=foodUnits(q.inv);}
  if(food<LARDER_PER_MEMBER*hh.members.length)return true;
 }
 return false;
}
/** Rules 193 lays out a hut whatever the larder holds. Ordinary Normal gen-2 (arrivals on): somebody in a lean-to household with less than three
 * food per member to hand chooses "Lay out a hut" by tick 4,875 (sampled every 25 ticks). 5,000 ticks include that, then 120 more after a save
 * and load. */
export function v193Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:193});
 let reached=false;
 for(let i=0;i<5000;i++){
  stepWorld(w);
  if(!reached&&i%25===0&&aHutLaidOutUnderAnEmptyLarder(w))reached=true;
 }
 if(!reached)throw Error('Rules193 reference world never lays out a hut under an empty larder');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules193 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
