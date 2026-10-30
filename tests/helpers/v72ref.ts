// Immutable rules-72 reference. Keep its fixture meanings when later journeys gain recovery.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {generateOptions} from '../../src/sim/decision';
import {conservationReport,ledgerConsume} from '../../src/sim/economy';
import {journeyScene} from './journey';
import {selectPrerequisite,finishPrerequisite} from './tool_prerequisite';
import type {World} from '../../src/sim/types';
export function v72Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-72 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:72});while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const prep=(f:ReturnType<typeof journeyScene>)=>generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor)!.key;
 const f=journeyScene(72),selected=selectPrerequisite(f.w,f.p,prep(f));selected.restore();const preparing=advance(f.w,600);
 const g=journeyScene(72);finishPrerequisite(g.w,g.p,prep(g));g.p.nextThink=g.w.tick;g.p.cooldowns.pause=0;
 for(let n=0;n<1200&&g.p.activity?.data.optKey!=='drink:inv';n++)stepWorld(g.w);if(g.p.activity?.data.optKey!=='drink:inv')throw new Error('Missing drink break');
 const drinking=advance(deserializeWorld(serializeWorld(g.w)),800);
 for(let n=0;n<1200&&!(g.p.activity?.data.optKey===g.key&&g.p.activity.phase==='travel');n++)stepWorld(g.w);if(g.p.activity?.data.optKey!==g.key)throw new Error('Missing retained trip');
 const travelling=advance(deserializeWorld(serializeWorld(g.w)),1000);
 ledgerConsume(g.w,'wood',g.tree.amount,'staged loss after departure');g.tree.amount=0;const lostSource=advance(g.w,700);
 return {ordinary,preparing,drinking,travelling,lostSource};
}
