import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 162 lays out the settlement's first storehouse early; 5.5 days of the river world include its finishing (day 5.0 in the screens). */
export function v162Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:162});
 for(let i=0;i<13200;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules162 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
