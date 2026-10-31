// Frozen rules-98 heard roof duty: ordinary river, communicated destination, paid wood patch, saved interruption and later shelter.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,suspendActivity} from '../../src/sim/activities';
import {setExternalController} from '../../src/sim/external';
import {repairDutyScene,requestRepair} from './repair_duty';
import type {World} from '../../src/sim/types';
export function v98Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-98 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:98});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=repairDutyScene(98),r=requestRepair(f);if(r.status!=='promised'||f.helper.beliefs[f.home.id]?.src!=='told')throw new Error('No heard roof duty');const heard=advance(f.w,100);
 for(let n=0;n<2000&&r.status==='promised';n++)stepWorld(f.w);if((r.status as string)!=='fulfilled'||!(f.w.ledger.reasons['-repairs']>0))throw new Error('No real wood patch');const fulfilled=advance(f.w,60);
 for(let n=0;n<1000&&f.parent.indoors!==f.home.id;n++)stepWorld(f.w);if(f.parent.indoors!==f.home.id)throw new Error('No later shelter');const sheltered=advance(f.w,50);
 const held=repairDutyScene(98,'house',{wood:3,bread:1,water:1});requestRepair(held);const o=generateOptions(held.w,held.helper,true,true).options.find(o=>o.kind==='repair');if(!o)throw new Error('No offered promised repair');startActivity(held.w,held.helper,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});let paid,interrupted;try{for(let n=0;n<900&&!(held.helper.activity?.cycle);n++)stepWorld(held.w);if(held.helper.activity?.cycle!==1)throw new Error('No paid repair cycle');paid=advance(held.w,20);suspendActivity(held.w,held.helper);if(!held.helper.suspended)throw new Error('No saved interruption');interrupted=advance(held.w,150);}finally{release();}
 return {ordinary,heard,fulfilled,sheltered,paid,interrupted};
}
