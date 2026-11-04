import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 154 weighs food hearsay by the listener's checks of the teller; river holds the most checked tellers. */
export function v154Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:154});
 for(let i=0;i<7200;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules154 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
