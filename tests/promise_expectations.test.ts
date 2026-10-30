import {afterEach,expect,it} from 'vitest';
import {expectationReportScene} from './helpers/promise_expectations';
import {failedPromiseScene} from './helpers/promise_outcomes';
import {completionReportScene,remoteCompletionScene} from './helpers/promise_knowledge';
import {helperLearningScene} from './helpers/helper_learning';
import {materialPromiseScene} from './helpers/stored_materials';
import {setPromiseExpectations,expectsCare,personalRequests,expectedStatus,expectedOutstanding,updateExpectations} from '../src/sim/promise_expectations';
import {killPerson} from '../src/sim/lifecycle';
import {knowsDeath} from '../src/sim/death_knowledge';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {newActivity,startActivity} from '../src/sim/activities';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {setExternalController} from '../src/sim/external';
import {pin} from './helpers/kit';
import {conservationReport} from '../src/sim/economy';
import {outstandingForPlan,planHelp} from '../src/sim/intent';
import {observeInhabitant} from '../src/agent/observe';
import {noteHelperReceipt} from '../src/sim/helper_learning';
import {relationshipHistory} from '../src/sim/history';
import type {World,Person} from '../src/sim/types';
const observation=(w:World,p:Person)=>{const ctx=generateOptions(w,p,true,true);return observeInhabitant(w,p,ctx,rankOptions(ctx));};
afterEach(()=>setPromiseExpectations(true));
it('keeps a distant helper’s accepted obligation when the requester dies without their knowledge',()=>{
 const f=failedPromiseScene(82);killPerson(f.w,f.parent,'staged remote death');expect(knowsDeath(f.helper,f.parent.id)).toBe(false);expect(f.request.status).toBe('cancelled');expect(f.commitment.status).toBe('active');expect(f.commitment.reason).toBeUndefined();
 for(let n=0;n<80;n++)stepWorld(f.w);expect(f.commitment.status).toBe('active');const own=personalRequests(f.w,f.helper).find(r=>r.id===f.request.id)!;expect(own.status).toBe('promised');expect(own.note).not.toContain('died');const seen=observation(f.w,f.helper);expect(JSON.stringify(seen.people.requests)).not.toContain('died');expect(conservationReport(f.w).ok).toBe(true);
});
it('learns the remote death by physically reaching a grave, then releases the personal obligation',()=>{
 const f=failedPromiseScene(82);killPerson(f.w,f.parent,'staged remote death');const saved=serializeWorld(f.w),copy=deserializeWorld(saved);
 for(const w of [f.w,copy]){const p=w.persons.find(p=>p.id===f.helper.id)!;p.cooldowns.pause=0;startActivity(w,p,newActivity(w,p,{kind:'wander',label:'Staged return to last known requester location',goal:'staged search for requester',tx:26,ty:40,spotX:26,spotY:40,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}}));expect(p.activity?.goal).toBe('staged search for requester');}
 for(let n=0;n<400;n++){stepWorld(f.w);stepWorld(copy);if(knowsDeath(f.helper,f.parent.id)&&f.commitment.status==='moot')break;}
 expect(serializeWorld(copy)).toBe(serializeWorld(f.w));expect(knowsDeath(f.helper,f.parent.id)).toBe(true);expect(f.helper.relations[f.parent.id].deathKnown?.source).toBe('grave');expect(f.commitment.status).toBe('moot');expect(conservationReport(f.w).ok).toBe(true);
});
it('a requester continues expecting accepted care after an unknown helper death, without reading shared cancellation',()=>{
 const f=failedPromiseScene(82),m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(m.expectation?.deadline).toBe(f.commitment.deadline);expect(expectsCare(f.w,f.parent)).toBe(true);killPerson(f.w,f.helper,'staged remote helper death');expect(knowsDeath(f.parent,f.helper.id)).toBe(false);expect(f.request.status).toBe('cancelled');expect(expectsCare(f.w,f.parent)).toBe(true);const raw=serializeWorld(f.w);expect(personalRequests(f.w,f.parent).find(r=>r.id===f.request.id)?.status).toBe('promised');expect(JSON.stringify(observation(f.w,f.parent).people.requests)).not.toContain('died');expect(serializeWorld(f.w)).toBe(raw);
 const copy=deserializeWorld(raw);for(let n=0;n<2300;n++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(expectsCare(f.w,f.parent)).toBe(false);expect(m.outcome).toBe('expired');expect(m.reason).toContain('cause is unknown');expect(m.expectation?.source).toBe('own timeout');expect(f.parent.relations[f.helper.id].grievance).toBeNull();
});
it('unseen failure expires as the helper’s own outcome even if lifecycle already cancelled the shared request',()=>{
 const f=failedPromiseScene(82);killPerson(f.w,f.parent,'staged remote death');for(let n=0;n<2300;n++)stepWorld(f.w);expect(f.commitment.status).toBe('failed');expect(f.commitment.reason).toContain('no way to get there');expect(f.helper.socialMemory?.find(m=>m.role==='helper')?.resolution?.source).toBe('own outcome');expect(f.request.status).toBe('cancelled');expect(conservationReport(f.w).ok).toBe(true);
});
it('a real completion report revises a remembered agreement without duplicating it or inventing direct receipt',()=>{
 const f=completionReportScene(82);expect(f.parent.socialMemory?.filter(m=>m.requestId===f.request.id)).toHaveLength(1);expect(f.parent.socialMemory?.find(m=>m.requestId===f.request.id)?.outcome).toBe('promised');const o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report')!;f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const x=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:x.key};}});try{for(let n=0;n<500;n++)stepWorld(f.w);}finally{restore();}
 const m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(m.outcome).toBe('fulfilled');expect(m.completion?.source).toBe('helper report');expect(m.expectation?.source).toBe('helper report');expect(m.task?.workReceipt).toBeUndefined();expect(f.parent.socialMemory?.filter(m=>m.requestId===f.request.id)).toHaveLength(1);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(relationshipHistory(f.w,f.parent).join(' ')).toContain('Heard agreement');
});
it('preserves prior remote cancellation and creates no guessed expectation under removal',()=>{
 const old=failedPromiseScene(81);killPerson(old.w,old.parent,'staged remote death');expect(old.commitment.status).toBe('moot');expect(knowsDeath(old.helper,old.parent.id)).toBe(false);
 setPromiseExpectations(false);const off=failedPromiseScene(82);expect(off.parent.socialMemory?.some(m=>m.expectation)).not.toBe(true);killPerson(off.w,off.parent,'staged remote death');expect(off.commitment.status).toBe('moot');
});
it.each(['future','role','quantity','source','version'])('rejects malformed heard expectations: %s',bad=>{
 const f=failedPromiseScene(82),m=f.parent.socialMemory!.find(m=>m.expectation)!,e=m.expectation!;if(bad==='future')e.made=f.w.tick+1;if(bad==='role')m.role='helper';if(bad==='quantity')e.received=e.amount+1;if(bad==='source')e.source='helper report';if(bad==='version')f.w.settings.rulesVersion=81;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});

it('material plans retain the heard quantity after a remote helper death and release it at their own timeout',()=>{
 const f=materialPromiseScene(82),ask=generateOptions(f.w,f.ada,true,true).options.find(o=>o.label==='Ask Ben for stone');expect(ask).toBeDefined();startActivity(f.w,f.ada,ask!.make!()!);
 for(let n=0;n<400;n++){stepWorld(f.w);if(f.w.requests.some(r=>r.status==='promised')&&!f.ada.convId)break;}
 const r=f.w.requests.find(r=>r.status==='promised')!;expect(r).toBeDefined();const m=f.ada.socialMemory!.find(m=>m.requestId===r.id)!,e=m.expectation!;expect(e.amount).toBe(2);expect(e.planId).toBeGreaterThan(0);pin(f.ada);pin(f.ben);f.ben.cooldowns.pause=0;
 const walk=newActivity(f.w,f.ben,{kind:'wander',label:'Staged helper departure',goal:'staged remote event separation',tx:65,ty:40,spotX:65,spotY:40,minCommit:700,maxTicks:900,duration:1,data:{sticky:true}});startActivity(f.w,f.ben,walk);for(let n=0;n<850&&f.ben.activity?.id===walk.id;n++)stepWorld(f.w);pin(f.ben);expect(Math.hypot(f.ada.x-f.ben.x,f.ada.y-f.ben.y)).toBeGreaterThan(10);
 const before=outstandingForPlan(f.w,f.ada.id,'stone',e.planId);expect(before).toBe(2);killPerson(f.w,f.ben,'staged remote helper death');expect(knowsDeath(f.ada,f.ben.id)).toBe(false);expect(outstandingForPlan(f.w,f.ada.id,'stone',e.planId)).toBe(before);const plan=f.ada.intentions.find(i=>i.id===e.planId)!;expect(planHelp(f.w,f.ada,plan).find(x=>x.item==='stone')?.owed).toBe(2);expect(planHelp(f.w,f.ada,plan).find(x=>x.item==='stone')?.who).toBe('Ben');
 const raw=serializeWorld(f.w);observation(f.w,f.ada);personalRequests(f.w,f.ada);planHelp(f.w,f.ada,plan);expect(serializeWorld(f.w)).toBe(raw);
 while(f.w.tick<=e.deadline+40)stepWorld(f.w);expect(f.ada.alive).toBe(true);expect(outstandingForPlan(f.w,f.ada.id,'stone',e.planId)).toBe(0);expect(m.expectation?.source).toBe('own timeout');expect(m.reason).toContain('cause is unknown');expect(conservationReport(f.w).ok).toBe(true);
});

it('actual material receipt closes the heard expectation and still feeds useful crafting and replay',async()=>{
 const f=await helperLearningScene(82);expect(f.ada.inv.pick).toBe(1);expect(f.receipt.expectation?.received).toBe(2);expect(f.receipt.expectation?.source).toBe('observed completion');expect(f.receipt.completion?.source).toBe('observed completion');const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(conservationReport(f.w).ok).toBe(true);
});

it('an unknown remote child death does not remove the offered trip; actual grave discovery ends the watch',()=>{
 const f=failedPromiseScene(82);f.w.terrain.set(f.originalTerrain);killPerson(f.w,f.child,'staged remote child death');expect(knowsDeath(f.helper,f.child.id)).toBe(false);for(let n=0;n<100;n++)stepWorld(f.w);
 const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`watch:${f.child.id}`);expect(o).toBeDefined();f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o!.make!()!);const began=f.helper.x;
 for(let n=0;n<600&&f.commitment.status==='active';n++)stepWorld(f.w);expect(f.helper.x).toBeGreaterThan(began);expect(knowsDeath(f.helper,f.child.id)).toBe(true);expect(f.helper.relations[f.child.id]?.deathKnown?.source??f.helper.heard?.find(r=>r.death?.id===f.child.id)?.death?.id).toBeTruthy();expect(f.commitment.status).toBe('moot');expect(f.commitment.reason).toContain('learned');expect(f.helper.activity?.data.commitmentId).not.toBe(f.commitment.id);expect(knowsDeath(f.parent,f.child.id)).toBe(false);expect(expectsCare(f.w,f.parent)).toBe(true);expect(conservationReport(f.w).ok).toBe(true);
});

it('a late spoken failure explanation revises an expired personal expectation through exact saved continuation',()=>{
 const f=expectationReportScene(),m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(m.expectation?.source).toBe('own timeout');expect(m.reason).toContain('cause is unknown');const copy=deserializeWorld(serializeWorld(f.w));
 for(const w of [f.w,copy]){const p=w.persons.find(p=>p.id===f.helper.id)!;p.cooldowns.pause=0;const o=rankOptions(generateOptions(w,p,true,true)).find(o=>o.tag==='report');expect(o).toBeDefined();startActivity(w,p,o!.make!()!);}
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const o=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:o.key};}});try{for(let n=0;n<500;n++){stepWorld(f.w);stepWorld(copy);}}finally{restore();}
 expect(serializeWorld(copy)).toBe(serializeWorld(f.w));expect(m.outcome).toBe('failed');expect(m.resolution?.source).toBe('helper report');expect(m.expectation?.source).toBe('helper report');expect(m.task?.receipt).toBeUndefined();expect(f.parent.socialMemory?.filter(x=>x.requestId===m.requestId)).toHaveLength(1);const saved=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);expect(conservationReport(f.w).ok).toBe(true);
});
it('an unobserved completed obligation stays expected until the requester’s own time window expires',()=>{
 const f=remoteCompletionScene(82),m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(f.request.status).toBe('fulfilled');expect(personalRequests(f.w,f.parent).find(r=>r.id===f.request.id)?.status).toBe('promised');const deadline=m.expectation!.deadline;
 while(f.w.tick<=deadline+40)stepWorld(f.w);expect(m.outcome).toBe('expired');expect(m.reason).toContain('without a known completion');expect(f.parent.relations[f.helper.id].grievance).toBeNull();
});

it('the direct-receipt boundary does not credit a sleeping requester with knowledge of who brought goods',()=>{
 const f=materialPromiseScene(82),ask=generateOptions(f.w,f.ada,true,true).options.find(o=>o.label==='Ask Ben for stone')!;startActivity(f.w,f.ada,ask.make!()!);
 for(let n=0;n<400;n++){stepWorld(f.w);if(f.w.requests.some(r=>r.status==='promised')&&!f.ada.convId)break;}
 const r=f.w.requests.find(r=>r.status==='promised')!,m=f.ada.socialMemory!.find(m=>m.expectation)!;expect(m.expectation?.item).toBe('stone');
 // Unit receipt callback probe at real conversation contact, with a sleeping recipient; no physical-transfer claim.
 f.ada.pose='sleep';noteHelperReceipt(f.w,r,f.ben,f.ada,'stone',1,'activity',999);expect(m.expectation?.received).toBe(0);
});
