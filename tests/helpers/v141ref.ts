import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v141Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:141});
 for(let i=0;i<6000;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}
 const continued=serializeWorld(w);
 if(continued!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules141 continuation or conservation failed');
 const f=placesFixture();observe(f.w,f.p,f.g);const option=generateOptions(f.w,f.p,true,true).options.find(o=>o.kind==='pay_respects')!;startActivity(f.w,f.p,option.make!()!);
 for(let i=0;i<20;i++){f.w.tick++;stepActivity(f.w,f.p);}const staged=serializeWorld(f.w),twin=deserializeWorld(staged);
 for(let i=0;i<240;i++){stepWorld(f.w);stepWorld(twin);}if(serializeWorld(f.w)!==serializeWorld(twin))throw Error('Grave visit continuation failed');
 return {saved:digest(raw),continued:digest(continued),staged:digest(staged),stagedContinued:digest(serializeWorld(f.w))};
}
import {placesFixture} from './personal_places';import {observe} from '../../src/sim/knowledge';import {generateOptions} from '../../src/sim/decision';import {startActivity,stepActivity} from '../../src/sim/activities';
