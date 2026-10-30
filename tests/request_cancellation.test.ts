import {sitePromiseScene} from './helpers/promise_targets';
import {newActivity} from '../src/sim/activities';
import {pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {afterEach,expect,it} from 'vitest';
import {requesterCancellationScene,cancellationContactScene} from './helpers/request_cancellation';
import {setRequestCancellation,pendingCancellations,receiveCancellation} from '../src/sim/request_cancellation';
import {personalRequests} from '../src/sim/promise_expectations';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {relationshipHistory} from '../src/sim/history';
import {observeInhabitant} from '../src/agent/observe';
import {abortConversationFor} from '../src/sim/social';
import type {World,Person} from '../src/sim/types';
afterEach(()=>setRequestCancellation(true));
function startTalk(f:ReturnType<typeof cancellationContactScene>,w=f.w){
 const parent=w.persons.find(p=>p.id===f.parent.id)!,helper=w.persons.find(p=>p.id===f.helper.id)!;
 // The helper starts the actual remembered repair before being approached, while still unaware.
 helper.cooldowns.pause=0;const repair=generateOptions(w,helper,true,true).options.find(o=>o.kind==='repair'&&o.targetId===f.hut.id)!;expect(repair).toBeDefined();startActivity(w,helper,repair.make!()!);
 parent.cooldowns.pause=0;const cancel=rankOptions(generateOptions(w,parent,true,true)).find(o=>o.tag==='cancel');expect(cancel).toBeDefined();startActivity(w,parent,cancel!.make!()!);
}
it('uses actual requester observation without remotely cancelling or informing the helper',()=>{
 const f=requesterCancellationScene(),m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(m.cancellation?.source).toBe('own target observation');expect(m.expectation?.source).toBe('own cancellation');expect(m.outcome).toBe('cancelled');expect(f.c.status).toBe('active');expect(f.helper.beliefs[f.hut.id]).toBeDefined();expect(f.helper.socialMemory?.some(m=>m.cancellation)).not.toBe(true);expect(f.request.status).toBe('promised');expect(pendingCancellations(f.w,f.parent)).toHaveLength(1);expect(personalRequests(f.w,f.helper).find(r=>r.id===f.request.id)?.status).toBe('promised');expect(conservationReport(f.w).ok).toBe(true);
});
it('offers lawful cancellation from own knowledge without observer mutation or private helper progress',()=>{
 const f=cancellationContactScene(),raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.parent,true,true),ranked=rankOptions(ctx);expect(ranked.some(o=>o.tag==='cancel')).toBe(true);const seen=observeInhabitant(f.w,f.parent,ctx,ranked);expect(seen.options.some(o=>o.key.includes('cancel_request'))).toBe(true);expect(relationshipHistory(f.w,f.parent).join(' ')).toContain('Helper acknowledgement not received');expect(serializeWorld(f.w)).toBe(raw);
});
it('hears cancellation before acknowledgement, releases suspended work, and continues exactly from save',()=>{
 const f=cancellationContactScene(),before=structuredClone(f.helper.inv);startTalk(f);const restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:()=>({kind:'defer'})});
 try{for(let n=0;n<400&&!f.helper.socialMemory?.some(m=>m.cancellation);n++)stepWorld(f.w);
 const heard=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(heard.cancellation?.source).toBe('requester statement');expect(heard.cancellation?.response).toBe('stopped');expect(f.c.status).toBe('cancelled');expect(f.helper.suspended).toBeNull();expect(f.helper.beliefs[f.hut.id]).toBeDefined();expect(f.parent.socialMemory!.find(m=>m.requestId===f.request.id)?.cancellation?.acknowledgedAt).toBeUndefined();expect(f.helper.inv).toEqual(before);
 const copy=deserializeWorld(serializeWorld(f.w));for(let n=0;n<150;n++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(copy)).toBe(serializeWorld(f.w));expect(f.parent.socialMemory!.find(m=>m.requestId===f.request.id)?.cancellation?.acknowledgedAt).toBeDefined();expect(pendingCancellations(f.w,f.parent)).toHaveLength(0);expect(f.helper.activity?.kind).not.toBe('repair');expect(f.helper.socialMemory!.filter(m=>m.requestId===f.request.id)).toHaveLength(1);expect(f.request.status).toBe('cancelled');expect(conservationReport(f.w).ok).toBe(true);
 }finally{restore();}
});
it('an interrupted acknowledgement leaves the already heard cancellation real and retry bounded',()=>{
 const f=cancellationContactScene();startTalk(f);const restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:()=>({kind:'defer'})});try{for(let n=0;n<400&&!f.helper.socialMemory?.some(m=>m.cancellation);n++)stepWorld(f.w);abortConversationFor(f.w,f.parent);expect(f.c.status).toBe('cancelled');expect(pendingCancellations(f.w,f.parent)).toHaveLength(0);const k=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!.cancellation!;expect(k.acknowledgedAt).toBeUndefined();while(f.w.tick<k.reportAfter!)stepWorld(f.w);expect(pendingCancellations(f.w,f.parent)).toHaveLength(1);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);}finally{restore();}
});
it('does not convey cancellation at a distance, to a sleeping listener, through an interior or from the wrong requester',()=>{
 const f=requesterCancellationScene(),before=serializeWorld(f.w);expect(receiveCancellation(f.w,f.parent,f.helper,f.request.id,999)).toBeNull();expect(serializeWorld(f.w)).toBe(before);
 // Explicitly positioned unit contact-boundary probes; no physical-journey claim.
 f.parent.x=f.helper.x;f.parent.y=f.helper.y;f.helper.pose='sleep';expect(receiveCancellation(f.w,f.parent,f.helper,f.request.id,999)).toBeNull();f.helper.pose='stand';f.helper.indoors=999;expect(receiveCancellation(f.w,f.parent,f.helper,f.request.id,999)).toBeNull();delete f.helper.indoors;expect(receiveCancellation(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();expect(f.c.status).toBe('active');
});
it('preserves old rules and isolated removal',()=>{
 for(const version of [83,84]){setRequestCancellation(version===83);const f=requesterCancellationScene(version);expect(f.parent.socialMemory!.find(m=>m.requestId===f.request.id)?.cancellation).toBeUndefined();expect(f.c.status).toBe('active');}
});
it.each(['future','source','from','role','ack','target','old rules','null','wrong target','unacknowledged response'] as const)('rejects malformed cancellation knowledge: %s',kind=>{
 const f=requesterCancellationScene(),m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!,k=m.cancellation!;if(kind==='future')k.tick=f.w.tick+1;if(kind==='source')(k as any).source='omniscient';if(kind==='from')k.from=f.helper.id;if(kind==='role')m.role='helper';if(kind==='ack')k.acknowledgedAt=f.w.tick+1;if(kind==='target')k.target.tick=f.w.tick+1;if(kind==='old rules')f.w.settings.rulesVersion=83;if(kind==='null')(m as any).cancellation=null;if(kind==='wrong target')k.target.targetId++;if(kind==='unacknowledged response')k.response='stopped';expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});

it('acknowledges a late cancellation without undoing completed work and reports the actual completion',()=>{
 const f=sitePromiseScene(84);f.helper.cooldowns.pause=0;const build=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='build'&&o.targetId===f.target.id)!;startActivity(f.w,f.helper,build.make!()!);
 let restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&f.c.status==='active';n++)stepWorld(f.w);}finally{restore();}expect(f.c.status).toBe('done');pin(f.helper);
 f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged inspection of own site',goal:'staged inspection',tx:55,ty:40,spotX:55,spotY:40,minCommit:700,maxTicks:1000,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);restore=setExternalController({controls:(_w,p)=>p.id===f.parent.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);}finally{restore();}for(const p of [f.parent,f.helper])perceive(f.w,p);
 const own=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(own.cancellation).toBeDefined();const cancel=rankOptions(generateOptions(f.w,f.parent,true,true)).find(o=>o.tag==='cancel');expect(cancel).toBeDefined();const stock=structuredClone(f.helper.inv),work=f.c.contrib;startActivity(f.w,f.parent,cancel!.make!()!);restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:()=>({kind:'defer'})});try{for(let n=0;n<400;n++)stepWorld(f.w);}finally{restore();}
 expect(f.c.status).toBe('done');expect(f.c.contrib).toBe(work);expect(f.helper.inv).toEqual(stock);expect(own.cancellation?.response).toBe('already ended');expect(own.cancellation?.acknowledgedAt).toBeDefined();expect(own.completion?.source).toBe('helper report');expect(own.outcome).toBe('fulfilled');expect(own.task?.workReceipt).toBeUndefined();expect(pendingCancellations(f.w,f.parent)).toHaveLength(0);expect(f.w.buildings.some(b=>b.type==='lean_to'&&b.hhId===f.parent.hhId)).toBe(true);expect(conservationReport(f.w).ok).toBe(true);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});


it('retains a heard cancellation when the helper has an obligation but no request-memory array',()=>{
 const f=cancellationContactScene();delete f.helper.socialMemory;
 // Unit contact setup: the physical journey and conversation are covered separately above.
 f.parent.x=f.helper.x;f.parent.y=f.helper.y;
 expect(receiveCancellation(f.w,f.parent,f.helper,f.request.id,999)?.stopped).toBe(true);
 expect((f.helper as Person).socialMemory?.find(m=>m.requestId===f.request.id)?.cancellation?.source).toBe('requester statement');
 const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
it('an interruption before the cancellation is spoken leaves the helper obligation active',()=>{
 const f=cancellationContactScene();startTalk(f);abortConversationFor(f.w,f.parent);
 expect(f.c.status).toBe('active');expect(f.helper.socialMemory?.some(m=>m.cancellation)).not.toBe(true);
 expect(f.parent.socialMemory!.find(m=>m.requestId===f.request.id)?.cancellation?.acknowledgedAt).toBeUndefined();
 expect(f.request.status).toBe('promised');expect(conservationReport(f.w).ok).toBe(true);
});


it.each([true,false])('preserves suspended work for another active obligation at the same target (explicit binding: %s)',explicit=>{
 const f=cancellationContactScene();
 // Unit overlap setup: a second accepted obligation shares the target. The cancellation conversation remains physical.
 const other={...f.c,id:f.c.id+5000,requestId:f.request.id+5000};f.helper.commitments.push(other);startTalk(f);
 const work=f.helper.activity!;if(explicit)work.data.commitmentId=other.id;else delete work.data.commitmentId;
 const restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:()=>({kind:'defer'})});
 try{for(let n=0;n<400&&!f.helper.socialMemory?.some(m=>m.cancellation);n++)stepWorld(f.w);expect(f.c.status).toBe('cancelled');expect(other.status).toBe('active');expect(f.helper.suspended?.id).toBe(work.id);}finally{restore();}
});
