// Immutable rules-83 ordinary cancellation, discovered target and heard-before-ack continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {targetPromiseScene,discoveredTargetScene} from './promise_targets';
import {destroyBuilding} from '../../src/sim/buildings';
import {setExternalController} from '../../src/sim/external';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {newActivity,startActivity} from '../../src/sim/activities';
import {pin} from './kit';
import type {World} from '../../src/sim/types';
export function v83Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-83 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:83});while(w.tick<3000)stepWorld(w);const ordinary=advance(w,600);if(!w.persons.some(p=>p.socialMemory?.some(m=>m.requestId===1669&&m.role==='asker'&&m.outcome==='cancelled'&&m.resolution?.targetEvidence?.source==='completed here')))throw new Error('Missing actual partial-haul explanation');
 const d=targetPromiseScene(83);destroyBuilding(d.w,d.hut,'staged collapse');d.helper.cooldowns.pause=0;const repair=generateOptions(d.w,d.helper,true,true).options.find(o=>o.kind==='repair'&&o.targetId===d.hut.id)!;startActivity(d.w,d.helper,repair.make!()!);if(!d.helper.activity)throw new Error('Missing actual remembered approach');
 const held=setExternalController({controls:(_w,p)=>p.id===d.helper.id,choose:()=>({kind:'defer'})});let discovered:ReturnType<typeof advance>;try{discovered=advance(d.w,400);}finally{held();}if(d.c.status!=='moot'||d.c.targetEvidence?.source!=='observed absence'||d.parent.socialMemory?.some(m=>m.resolution))throw new Error('Missing private target discovery');
 const f=discoveredTargetScene(),x=f.helper.x-4,y=f.helper.y;f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged rendezvous after target loss',goal:'staged rendezvous',tx:x,ty:y,spotX:x,spotY:y,minCommit:500,maxTicks:700,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);for(let n=0;n<650&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);pin(f.parent);
 const o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report');if(!o)throw new Error('Missing offered cancellation report');f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const choice=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:choice.key};}});
 let report:ReturnType<typeof advance>;try{for(let n=0;n<400&&!f.parent.socialMemory?.some(m=>m.resolution?.source==='helper report');n++)stepWorld(f.w);const own=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;if(own.resolution?.acknowledgedAt!==undefined||!f.parent.socialMemory?.some(m=>m.resolution?.targetEvidence))throw new Error('Missing heard-before-acknowledged cancellation');report=advance(f.w,100);if(own.resolution?.acknowledgedAt===undefined)throw new Error('Missing actual acknowledgement');}finally{restore();}
 return {ordinary,discovered,report};
}
