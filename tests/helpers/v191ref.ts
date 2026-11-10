import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The feed holds a storehouse layout line that follows the public site rather than the actor's household. */
export function aStorehouseLaidOutForSharedUse(w:World):boolean{
 return w.events.some(e=>e.kind==='build'&&e.text.includes('marked out a storehouse for shared use'));
}
/** Rules 191 words a public site's layout line from the site. Ordinary Normal gen-2 (arrivals on): the first storehouse is marked out through the
 * ordinary option and proposed to its township by tick 6,025 (sampled every 25 ticks); at 190 that line named the actor's household. 6,100 ticks
 * include it, then 120 more after a save and load. */
export function v191Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:191});
 let reached=false;
 for(let i=0;i<6100;i++){
  stepWorld(w);
  if(!reached&&i%25===0&&aStorehouseLaidOutForSharedUse(w))reached=true;
 }
 if(!reached)throw Error('Rules191 reference world never lays out a public storehouse');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules191 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
