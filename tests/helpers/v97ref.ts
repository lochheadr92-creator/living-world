// Frozen rules-97 spoken childcare return and retained actual watch time.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {abortConversationFor} from '../../src/sim/social';
import {setExternalController} from '../../src/sim/external';
import {careHandbackScene} from './care_handback';
import type {World} from '../../src/sim/types';
export function v97Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-97 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:97});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=careHandbackScene(97),paid=advance(f.w,10);for(let n=0;n<80&&!f.parent.socialMemory?.some(m=>m.careHandback?.state==='proposed');n++)stepWorld(f.w);if(!f.parent.socialMemory?.some(m=>m.careHandback?.state==='proposed'))throw new Error('No real proposal');const proposal=advance(f.w,70);if(!f.parent.socialMemory?.some(m=>m.careHandback?.state==='accepted'))throw new Error('No actual handback');const accepted=advance(f.w,30);
 const paused=careHandbackScene(97);for(let n=0;n<80&&!paused.parent.socialMemory?.some(m=>m.careHandback?.state==='proposed');n++)stepWorld(paused.w);if(!paused.helper.suspended?.data.watchedTicks)throw new Error('No paid paused watch');abortConversationFor(paused.w,paused.parent);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});let resumed;try{resumed=advance(paused.w,110);}finally{release();}if(paused.helper.commitments.find(c=>c.milestone==='watched')?.status!=='done')throw new Error('No resumed completion');
 const busy=careHandbackScene(97,'finished'),competing=advance(busy.w,100);if(busy.parent.socialMemory?.some(m=>m.careHandback))throw new Error('Competing conversation no longer blocks proposal');
 return {ordinary,paid,proposal,accepted,resumed,competing};
}
