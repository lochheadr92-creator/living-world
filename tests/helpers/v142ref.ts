import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v142Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:142});
 for(let i=0;i<6000;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}
 const continued=serializeWorld(w);
 if(continued!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules142 continuation or conservation failed');
 const f=coachingFixture();startCoaching(f);const staged=serializeWorld(f.w),twin=deserializeWorld(staged);
 for(let i=0;i<240;i++){stepWorld(f.w);stepWorld(twin);}if(serializeWorld(f.w)!==serializeWorld(twin)||!f.p.skillExperience?.length)throw Error('Coaching continuation failed');
 return {saved:digest(raw),continued:digest(continued),staged:digest(staged),stagedContinued:digest(serializeWorld(f.w))};
}
import {coachingFixture,startCoaching} from './skill_coaching';
