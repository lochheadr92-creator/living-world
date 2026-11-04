import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {lambBirthScene} from './lamb_birth';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v151Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:151});
 for(let i=0;i<2400;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules151 ordinary continuation failed');
 const f=lambBirthScene(151);for(let i=0;i<6000;i++)stepWorld(f.w);
 const staged=serializeWorld(f.w),twin=deserializeWorld(staged);
 for(let i=0;i<4800;i++){stepWorld(f.w);stepWorld(twin);}
 if(!f.w.animals.some(a=>a.sheep?.origin==='birth')||serializeWorld(f.w)!==serializeWorld(twin)||!conservationReport(f.w).ok)throw Error('Rules151 lamb birth continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),staged:digest(staged),stagedContinued:digest(serializeWorld(f.w))};
}
