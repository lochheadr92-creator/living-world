// Immutable rules-81 ordinary reporting and saved physical-completion/report continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {failedPromiseScene,outcomeReportScene} from './promise_outcomes';
import {setExternalController} from '../../src/sim/external';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import type {World} from '../../src/sim/types';
export function v81Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-81 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:81});while(w.tick<10000)stepWorld(w);const ordinary=advance(w,2000);if(!w.persons.some(p=>p.socialMemory?.some(m=>m.requestId===3867&&m.resolution?.source==='own outcome')))throw new Error('Missing ordinary partial outcome');
 const distant=failedPromiseScene(81),remote=advance(distant.w,2200);if(distant.commitment.status!=='failed'||distant.parent.socialMemory?.some(m=>m.requestId===distant.request.id))throw new Error('Failed promise attributed without contact');
 const f=outcomeReportScene(),o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report');if(!o)throw new Error('Missing offered explanation');f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const choice=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:choice.key};}});
 let report:ReturnType<typeof advance>;try{for(let n=0;n<400&&!f.parent.socialMemory?.some(m=>m.resolution?.source==='helper report');n++)stepWorld(f.w);const own=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;if(own.resolution?.acknowledgedAt!==undefined||!f.parent.socialMemory?.some(m=>m.resolution?.source==='helper report'))throw new Error('Missing heard-before-acknowledged state');report=advance(f.w,100);if(own.resolution?.acknowledgedAt===undefined)throw new Error('Missing actual acknowledgement');}finally{restore();}
 return {ordinary,remote,report};
}
