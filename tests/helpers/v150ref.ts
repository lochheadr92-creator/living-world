import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {trapRecoveryScene} from './trap_recovery';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v150Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:150});
 for(let i=0;i<2400;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules150 ordinary continuation failed');
 const f=trapRecoveryScene(150);for(let i=0;i<200;i++)stepWorld(f.w);
 const staged=serializeWorld(f.w),twin=deserializeWorld(staged);
 for(let i=0;i<2200;i++){stepWorld(f.w);stepWorld(twin);}
 if(!(f.w.ledger.consumed.meat!>0)||f.gear.gear!.cycle<2||serializeWorld(f.w)!==serializeWorld(twin)||!conservationReport(f.w).ok)throw Error('Rules150 catch recovery continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),staged:digest(staged),stagedContinued:digest(serializeWorld(f.w))};
}
