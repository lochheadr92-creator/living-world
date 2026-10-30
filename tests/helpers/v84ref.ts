// Immutable rules-84 continuations: ordinary late reconciliation and actual cancellation before/after hearing.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {requesterCancellationScene,cancellationContactScene} from './request_cancellation';
import {setExternalController} from '../../src/sim/external';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import type {World} from '../../src/sim/types';
export function v84Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-84 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:84});while(w.tick<1900)stepWorld(w);const ordinary=advance(w,300);if(!w.persons.some(p=>p.socialMemory?.some(m=>m.requestId===1485&&m.role==='asker'&&m.cancellation?.acknowledgedAt!==undefined&&m.resolution?.source==='helper report')))throw new Error('Missing ordinary late reconciliation');
 const d=requesterCancellationScene(84),observed=advance(d.w,50);if(d.c.status!=='active'||!d.parent.socialMemory?.some(m=>m.cancellation?.source==='own target observation'))throw new Error('Missing private withdrawal');
 const f=cancellationContactScene();f.helper.cooldowns.pause=0;const repair=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair'&&o.targetId===f.hut.id)!;startActivity(f.w,f.helper,repair.make!()!);f.parent.cooldowns.pause=0;const cancel=rankOptions(generateOptions(f.w,f.parent,true,true)).find(o=>o.tag==='cancel');if(!cancel)throw new Error('Missing actual offered cancellation');startActivity(f.w,f.parent,cancel.make!()!);
 const restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:()=>({kind:'defer'})});let heard:ReturnType<typeof advance>;
 try{for(let n=0;n<400&&!f.helper.socialMemory?.some(m=>m.cancellation);n++)stepWorld(f.w);const own=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;if(f.c.status!=='cancelled'||!f.helper.socialMemory?.some(m=>m.cancellation?.source==='requester statement')||own.cancellation?.acknowledgedAt!==undefined)throw new Error('Missing heard-before-acknowledged cancellation');heard=advance(f.w,150);if(own.cancellation?.acknowledgedAt===undefined)throw new Error('Missing actual acknowledgement');}finally{restore();}
 return {ordinary,observed,heard};
}
