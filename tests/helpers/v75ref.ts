// Immutable rules-75 ordinary and failed-contact snapshots before route learning.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {sourceContactScene} from './source_contact';
import type {World} from '../../src/sim/types';
export function v75Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-75 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:75});while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=sourceContactScene(75,true,true);if(f.p.beliefs[f.tree.id].amount!==12||f.p.lastResult?.detail!=='no way to get there')throw new Error('Missing failed-contact boundary');const unseenEmpty=advance(f.w,1200);
 const g=sourceContactScene(75,true,false);const inaccessibleStock=advance(g.w,1200);if((g.p.failures[g.tree.id]?.count??0)<2)throw new Error('Missing repeated actual failures');
 const h=sourceContactScene(75,false,true);if(!h.p.payoff.wood?.sources?.[0].empty)throw new Error('Missing actual empty arrival');const arrivedEmpty=advance(h.w,1200);
 return {ordinary,unseenEmpty,inaccessibleStock,arrivedEmpty};
}
