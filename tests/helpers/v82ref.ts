// Immutable rules-82 heard agreements, remote death and late report continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {failedPromiseScene} from './promise_outcomes';
import {expectationReportScene} from './promise_expectations';
import {setExternalController} from '../../src/sim/external';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {newActivity,startActivity} from '../../src/sim/activities';
import {killPerson} from '../../src/sim/lifecycle';
import {knowsDeath} from '../../src/sim/death_knowledge';
import type {World} from '../../src/sim/types';
export function v82Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-82 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:82});while(w.tick<4400)stepWorld(w);const ordinary=advance(w,1200);if(!w.persons.some(p=>p.socialMemory?.some(m=>m.expectation?.source==='helper report')))throw new Error('Missing ordinary heard report');
 const distant=failedPromiseScene(82);killPerson(distant.w,distant.parent,'staged remote death');if(knowsDeath(distant.helper,distant.parent.id)||distant.commitment.status!=='active')throw new Error('Remote death leaked');
 distant.helper.cooldowns.pause=0;startActivity(distant.w,distant.helper,newActivity(distant.w,distant.helper,{kind:'wander',label:'Staged return to last known requester location',goal:'staged search for requester',tx:26,ty:40,spotX:26,spotY:40,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}}));if(!distant.helper.activity)throw new Error('Missing actual search');const remote=advance(distant.w,400);if(!knowsDeath(distant.helper,distant.parent.id)||String(distant.commitment.status)!=='moot')throw new Error('Missing physical grave discovery');
 const f=expectationReportScene(),o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report');if(!o)throw new Error('Missing offered explanation');f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const choice=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:choice.key};}});
 let report:ReturnType<typeof advance>;try{for(let n=0;n<400&&!f.parent.socialMemory?.some(m=>m.expectation?.source==='helper report');n++)stepWorld(f.w);const own=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;if(own.resolution?.acknowledgedAt!==undefined||!f.parent.socialMemory?.some(m=>m.expectation?.source==='helper report'))throw new Error('Missing heard-before-acknowledged expectation');report=advance(f.w,100);if(own.resolution?.acknowledgedAt===undefined)throw new Error('Missing actual acknowledgement');}finally{restore();}
 return {ordinary,remote,report};
}
