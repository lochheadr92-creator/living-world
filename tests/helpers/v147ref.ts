import {newCart} from '../../src/sim/carts';
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v147Continuation(){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:147});
 for(let i=0;i<6000;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}
 const continued=serializeWorld(w);
 if(continued!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules147 continuation or conservation failed');
 const f=stage('final-account-reference');f.w.settings={...f.w.settings,dynamics:'rich',rulesVersion:147};const p=addPerson(f,'Ada',40,40,{inv:{berries:2}});addPerson(f,'Ben',65,40);done(f);p.activity=newActivity(f.w,p,{kind:'wander',label:'Walking toward water',goal:'find a drink'});killPerson(f.w,p,'thirst');
 const staged=serializeWorld(f.w),twin=deserializeWorld(staged);
 for(let i=0;i<240;i++){stepWorld(f.w);stepWorld(twin);}if(serializeWorld(f.w)!==serializeWorld(twin)||!f.w.deceased[0].last)throw Error('Final account continuation failed');
 const c=stage('carried-cuttings');c.w.settings={...c.w.settings,dynamics:'rich',rulesVersion:147};const cp=addPerson(c,'Ada',40,40,{inv:{cutting:20},hunger:100,thirst:100,energy:100});cp.cooldowns.pause=1e12;const cart=newCart(c.w,42,40,cp.hhId);cart.load.cutting=20;done(c);for(let i=0;i<2400;i++)stepWorld(c.w);
 if(!cp.alive||(cp.inv.cutting??0)>=20||(cart.load.cutting??0)>=20||!conservationReport(c.w).ok)throw Error('Carried cuttings failed');const carried=serializeWorld(c.w),ct=deserializeWorld(carried);for(let i=0;i<240;i++){stepWorld(c.w);stepWorld(ct);}if(serializeWorld(c.w)!==serializeWorld(ct))throw Error('Carried cuttings continuation changed');
 return {carried:digest(carried),carriedContinued:digest(serializeWorld(c.w)),saved:digest(raw),continued:digest(continued),staged:digest(staged),stagedContinued:digest(serializeWorld(f.w))};
}
import {stage,addPerson,done} from './kit';import {killPerson} from '../../src/sim/lifecycle';import {newActivity} from '../../src/sim/activities';
