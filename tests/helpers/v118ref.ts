import {createHash} from 'node:crypto';
import {waterSearchScene} from './water_search';
import {generateOptions} from '../../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
export function v118Continuation(){
 const {w,p}=waterSearchScene(true,true,118);p.lastExploreTick=w.tick-1;
 if(!generateOptions(w,p,true,true).options.some(o=>o.kind==='explore'&&o.need==='thirst'))throw new Error('No critical search during cooldown');
 stepWorld(w);if(p.activity?.kind!=='explore')throw new Error('Critical search did not start');
 const digest=(s:string)=>createHash('sha256').update(s).digest('hex'),saved=serializeWorld(w),copy=deserializeWorld(saved);
 for(let n=0;n<240;n++){stepWorld(w);stepWorld(copy);}
 if(!conservationReport(w).ok||serializeWorld(w)!==serializeWorld(copy))throw new Error('Invalid rules-118 continuation');
 return {criticalSearch:{saved:digest(saved),continued:digest(serializeWorld(copy)),uninterrupted:digest(serializeWorld(w))}};
}
