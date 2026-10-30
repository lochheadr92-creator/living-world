// Immutable rules-77 ordinary, corrected route and completed material-help continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {correctedRouteScene} from './resolved_route';
import {materialPromiseScene,materialChoice} from './stored_materials';
import {runLive,runReplay} from '../../src/agent/run';
import {stubModel} from '../../src/agent/model';
import {observationFromPrompt} from '../../src/agent/protocol';
import type {World} from '../../src/sim/types';
export async function v77Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-77 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:77});while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=correctedRouteScene(77);if(!f.p.failures[f.tree.id].resolved||f.w.tick>=520)throw new Error('Missing recent corrective arrival');const corrected=advance(f.w,800);
 const h=materialPromiseScene(77),initial=serializeWorld(h.w),model=stubModel('rules-77-material-help',req=>{const o=observationFromPrompt(req.user)!;return JSON.stringify({choose:materialChoice(o,'promise').key,why:'Use offered material help and craft the pick.'});});
 const result=await runLive(h.w,h.ada.id,model,{until:2000}),r=result.world.requests.find(r=>r.from===h.ada.id&&r.to===h.ben.id)!;
 if(r?.status!=='fulfilled'||r.delivered!==2||!result.world.persons.find(p=>p.id===h.ada.id)?.socialMemory?.some(m=>m.requestId===r.id)||serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)!==serializeWorld(result.world))throw new Error('Missing physical helper receipt or replay');
 const helperReceipt=advance(result.world,800);return {ordinary,corrected,helperReceipt};
}
