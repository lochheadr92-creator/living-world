import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v134Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:134});
 for(let i=0;i<6000;i++)stepWorld(w);
 const wells=w.buildings.filter(b=>b.type==='well').map(b=>b.id);
 if(!wells.length)throw Error('Rules134 reference requires an autonomously completed well');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}
 const continued=serializeWorld(w);
 if(continued!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules134 continuation or conservation failed');
 return {wells,saved:digest(raw),continued:digest(continued)};
}
