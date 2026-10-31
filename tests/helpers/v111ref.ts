// Frozen rules-111 ordinary, ongoing participation and urgent interruption.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {occasionParticipationScene} from './occasion_participation';
import type {World} from '../../src/sim/types';
export function v111Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-111 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:111});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=occasionParticipationScene(111);for(let n=0;n<30;n++)stepWorld(f.w);if(f.p.activity?.id!==f.a.id)throw new Error('Guest did not stay');const participation=advance(f.w,300);
 const u=occasionParticipationScene(111);u.p.needs.thirst=1;const urgent=advance(u.w,120);if(u.p.activity?.id===u.a.id)throw new Error('Urgent thirst did not interrupt');
 return {ordinary,participation,urgent};
}
