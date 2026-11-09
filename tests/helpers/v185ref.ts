import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Some township holds a record of how far its building has reached. */
export function someTownshipHasExtent(w:World):boolean{
 return (w.townships??[]).some(t=>t.extent!==undefined);
}
/** Rules 185 keeps a township's building extent. Ordinary Normal river (arrivals on): a township first holds an extent at tick 924
 * (sampled every 25 ticks). 2400 ticks include that, then 120 more after a save and load. */
export function v185Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:185});
 let recorded=false;
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!recorded&&i%25===0&&someTownshipHasExtent(w))recorded=true;
 }
 if(!recorded)throw Error('Rules185 reference world never records a township extent');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules185 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
