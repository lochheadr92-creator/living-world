// Immutable rules-79 ordinary, mid-watch and delayed learned-choice continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {watchLearningScene,laterWatchScene} from './watch_learning';
import {setExternalController} from '../../src/sim/external';
import type {World} from '../../src/sim/types';
export function v79Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-79 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:79});while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const first=watchLearningScene(79),watch=advance(first.w,400);if(first.request.helperWork?.witnessId!==first.parent.id)throw new Error('Missing witnessed physical completion');
 const f=laterWatchScene(79);f.parent.cooldowns.pause=0;f.helper.cooldowns.pause=0;
 const restore=setExternalController({controls:(_w,p)=>p.id===f.parent.id,choose:(_w,_p,ctx,ranked)=>{const chosen=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.key.endsWith(':request:watch'))??ranked[0];return {kind:'pick',key:chosen.key};}});
 let learnedChoice:ReturnType<typeof advance>;try{learnedChoice=advance(f.w,450);}finally{restore();}
 const later=f.w.requests.find(r=>r.kind==='watch'&&r.id!==f.request.id);if(later?.status!=='fulfilled'||later.to!==f.helper.id||later.helperWork?.witnessId!==0)throw new Error('Missing later accepted physical watch or changed witness boundary');
 return {ordinary,watch,learnedChoice};
}
