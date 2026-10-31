// Frozen rules-102 single roof duty: ordinary river, a declined second ask about a promised roof, and the one patch.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {repairDutyScene,requestRepair,secondAsker,askRepairFrom} from './repair_duty';
import type {World} from '../../src/sim/types';
export function v102Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-102 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:102});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=repairDutyScene(102,'hut',{wood:1,bread:2,water:2},35),first=requestRepair(f);if(first.status!=='promised')throw new Error('No first promise');
 const cal=secondAsker(f),second=askRepairFrom(f,cal);if(second.request.status!=='declined')throw new Error('Second ask not declined');const declined=advance(f.w,100);
 for(let n=0;n<2500&&first.status==='promised';n++)stepWorld(f.w);if(first.status!=='fulfilled'||f.w.ledger.reasons['-repairs']!==1)throw new Error('No single patch');const patched=advance(f.w,60);
 return {ordinary,declined,patched};
}
