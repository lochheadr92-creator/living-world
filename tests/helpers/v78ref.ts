// Immutable rules-78 ordinary, saved direct receipt, later helper choice and valid refusal continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {helperLearningScene} from './helper_learning';
import {setExternalController} from '../../src/sim/external';
import type {World} from '../../src/sim/types';
export async function v78Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-78 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:78});while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=await helperLearningScene(78);if(f.receipt.task?.receipt?.amount!==2||f.ada.inv.pick!==1)throw new Error('Missing actual retained task and useful work');
 const restore=setExternalController({controls:(_w,p)=>p.id===f.ada.id,choose:(_w,_p,ctx,ranked)=>{const chosen=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.kind==='socialize'&&o.label.endsWith('for stone'))??ranked.find(o=>o.kind==='craft')??ranked[0];return {kind:'pick',key:chosen.key};}});
 let learnedChoice:ReturnType<typeof advance>;try{learnedChoice=advance(f.w,1000);}finally{restore();}
 if(!f.w.requests.some(r=>r.id!==f.receipt.requestId&&r.from===f.ada.id&&r.to===f.ben.id&&r.status==='declined'&&r.note==='making'))throw new Error('Missing valid later refusal');
 const refusal=advance(f.w,600);return {ordinary,learnedChoice,refusal};
}
