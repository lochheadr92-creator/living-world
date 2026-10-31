// Frozen rules-112 ordinary, real conversation pause/resumption and closed-event refusal.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {occasionConversationScene} from './occasion_recovery';
import type {World} from '../../src/sim/types';
export function v112Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-112 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:112});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=occasionConversationScene(112);const paused=advance(f.w,100);if(f.p.activity?.id!==f.a.id)throw new Error('Visit did not resume');const resumed=advance(f.w,240);
 const c=occasionConversationScene(112);c.o.status='done';const closed=advance(c.w,180);if(c.p.activity?.id===c.a.id||c.p.suspended?.id===c.a.id)throw new Error('Closed visit retained');
 return {ordinary,paused,resumed,closed};
}
