import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v135Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:135});
 for(let i=0;i<12000;i++)stepWorld(w);
 const cellars=w.buildings.filter(b=>b.type==='cellar').map(b=>b.id);
 if(!cellars.length)throw Error('Rules135 reference requires an autonomously completed cellar');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}
 const continued=serializeWorld(w);
 if(continued!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules135 continuation or conservation failed');
 return {cellars,saved:digest(raw),continued:digest(continued)};
}
