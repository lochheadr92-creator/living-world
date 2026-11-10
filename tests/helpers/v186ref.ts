import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Some building lists everyone who built it. */
export function someBuildingListsAllBuilders(w:World):boolean{
 return w.buildings.some(b=>b.builtAll===true&&(b.builtBy??[]).length>=2);
}
/** Rules 186 lists everyone who built a shared building. Ordinary Normal cedar (arrivals on): the storehouse is finished by two people at tick 12,908
 * (sampled every 25 ticks). 13,200 ticks include that, then 120 more after a save and load. */
export function v186Continuation(){
 const w=createWorld({...currentWorldSettings('normal','cedar',{immigration:true}),rulesVersion:186});
 let recorded=false;
 for(let i=0;i<13200;i++){
  stepWorld(w);
  if(!recorded&&i%25===0&&someBuildingListsAllBuilders(w))recorded=true;
 }
 if(!recorded)throw Error('Rules186 reference world never holds a building that lists all its builders');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules186 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
