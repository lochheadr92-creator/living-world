import {createHash} from 'node:crypto';
import {projectAcquireScene} from './project_acquire';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
export function v117Continuation(){
 const {w,p}=projectAcquireScene(1,'light',117);
 const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
 for(let n=0;n<1000&&!(p.activity?.kind==='gather'&&p.activity.progress>0);n++)stepWorld(w);
 if(p.activity?.kind!=='gather'||p.activity.progress<=0)throw new Error('Remaining project stone never gathered');
 const saved=serializeWorld(w),copy=deserializeWorld(saved);
 for(let n=0;n<3600&&!(p.inv.hammer??0);n++){stepWorld(w);stepWorld(copy);}
 if(p.inv.hammer!==1||!conservationReport(w).ok||serializeWorld(w)!==serializeWorld(copy))throw new Error('No paid hammer or exact continuation');
 return {project:{saved:digest(saved),continued:digest(serializeWorld(copy)),uninterrupted:digest(serializeWorld(w)),hammer:p.inv.hammer}};
}
