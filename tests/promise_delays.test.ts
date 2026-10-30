import {setBuildPromiseSettlement} from '../src/sim/promise_knowledge';
import {afterEach,expect,it} from 'vitest';
import {repairDelayScene,watchDelayScene,contributedBuildScene} from './helpers/promise_delays';
import {pendingDelayProposals,receiveDelayProposal,answerDelayProposal,setPromiseDelays,DELAY_EXTENSION} from '../src/sim/promise_delays';
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
afterEach(()=>{setPromiseDelays(true);setBuildPromiseSettlement(true);});
type Scene={w:World,parent:Person,helper:Person,request:{id:number},c:Person['commitments'][number]};
function startTalk(f:Scene){f.helper.cooldowns.pause=0;const o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='delay');expect(o).toBeDefined();startActivity(f.w,f.helper,o!.make!()!);}
function held(f:Scene){return setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:()=>({kind:'defer'})});}
it('offers a sourced active-delay explanation without revealing it remotely or mutating observation',()=>{
 const f=repairDelayScene(),raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true),ranked=rankOptions(ctx);expect(f.c.attempt?.reason).toBe('no way to get there');expect(pendingDelayProposals(f.w,f.helper)).toContain(f.c);expect(observeInhabitant(f.w,f.helper,ctx,ranked).options.some(o=>o.key.includes('delay_request'))).toBe(true);expect(f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!.expectation!.delay).toBeUndefined();expect(serializeWorld(f.w)).toBe(raw);
});
it('hears the failed attempt before answering and agrees exactly one bounded extension through actual speech',()=>{
 const f=repairDelayScene(),deadline=f.c.deadline,before=structuredClone(f.helper.inv);startTalk(f);const restore=held(f);
 try{for(let n=0;n<400&&!f.c.delay;n++)stepWorld(f.w);const m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(f.c.delay?.response).toBeUndefined();expect(m.expectation!.delay?.source).toBe('helper statement');expect(f.c.deadline).toBe(deadline);expect(m.expectation!.deadline).toBeLessThan(deadline+DELAY_EXTENSION);expect(m.task?.workReceipt).toBeUndefined();
 const copy=deserializeWorld(serializeWorld(f.w));for(let n=0;n<150;n++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(copy)).toBe(serializeWorld(f.w));expect(f.c.delay?.response).toBe('accepted');expect(f.c.deadline).toBe(deadline+DELAY_EXTENSION);expect(m.expectation!.deadline).toBe(f.c.deadline);expect(m.expectation!.delay!.originalExpectedDeadline).toBe(deadline);expect(relationshipHistory(f.w,f.parent).join(' ')).toContain('revised in conversation');expect(f.w.requests.find(r=>r.id===f.request.id)!.deadline).toBe(f.c.deadline);expect(f.c.status).toBe('active');expect(f.helper.inv).toEqual(before);expect(pendingDelayProposals(f.w,f.helper)).toHaveLength(0);expect(relationshipHistory(f.w,f.parent).join(' ')).toContain('Cause reported, not independently witnessed');expect(conservationReport(f.w).ok).toBe(true);
 }finally{restore();}
});
it('declines another six-hour wait for childcare without cancelling the existing obligation or inventing care',()=>{
 const f=watchDelayScene(),deadline=f.c.deadline;startTalk(f);const restore=held(f);try{for(let n=0;n<400&&!f.c.delay?.response;n++)stepWorld(f.w);expect(f.c.delay?.response).toBe('refused');expect(f.c.delay?.responseReason).toContain('care');expect(f.c.deadline).toBe(deadline);expect(f.c.status).toBe('active');expect(f.c.contrib??0).toBe(0);expect(f.child.alive).toBe(true);expect(conservationReport(f.w).ok).toBe(true);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);}finally{restore();}
});
it('interruption after hearing leaves the old agreement intact and retries the same proposal',()=>{
 const f=repairDelayScene(),deadline=f.c.deadline;startTalk(f);const restore=held(f);try{for(let n=0;n<400&&!f.c.delay;n++)stepWorld(f.w);abortConversationFor(f.w,f.helper);expect(f.c.deadline).toBe(deadline);expect(f.c.delay?.response).toBeUndefined();expect(pendingDelayProposals(f.w,f.helper)).toHaveLength(0);while(f.w.tick<f.c.delay!.retryAfter!)stepWorld(f.w);expect(pendingDelayProposals(f.w,f.helper)).toContain(f.c);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);}finally{restore();}
});
it('does not explain a corrected attempt, extend an ended obligation or speak through separation',()=>{
 const f=repairDelayScene();f.c.attempt!.resolvedAt=f.w.tick;expect(pendingDelayProposals(f.w,f.helper)).toHaveLength(0);delete f.c.attempt!.resolvedAt;f.parent.x=20;expect(receiveDelayProposal(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();f.parent.x=f.helper.x;f.parent.y=f.helper.y;expect(receiveDelayProposal(f.w,f.helper,f.parent,f.request.id,999)).not.toBeNull();f.c.status='done';expect(answerDelayProposal(f.w,f.helper,f.parent,f.request.id)).toBeNull();expect(f.c.delay?.response).toBeUndefined();
});
it('retains rules 84 and isolated removal',()=>{for(const version of [84,85]){setPromiseDelays(version===84);const f=repairDelayScene(version);expect(pendingDelayProposals(f.w,f.helper)).toHaveLength(0);expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.tag==='delay')).toBe(false);}});
it.each(['source','future','amount','extension','answer','unagreed deadline','old rules','null'] as const)('rejects malformed delay provenance: %s',kind=>{
 const f=repairDelayScene();f.parent.x=f.helper.x;f.parent.y=f.helper.y;expect(receiveDelayProposal(f.w,f.helper,f.parent,f.request.id,999)).not.toBeNull();const d=f.c.delay!;
 if(kind==='source')(d as any).source='omniscient';if(kind==='future')d.tick=f.w.tick+1;if(kind==='amount')d.delivered=-1;if(kind==='extension')d.proposedDeadline++;if(kind==='answer')d.response='accepted';if(kind==='unagreed deadline')f.c.deadline++;if(kind==='old rules')f.w.settings.rulesVersion=84;if(kind==='null')(f.c as any).delay=null;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});


it('returns to actual repair after the staged obstruction clears, retaining work and material accounting',()=>{
 const f=repairDelayScene();startTalk(f);let restore=held(f);try{for(let n=0;n<400&&(f.c.delay?.response===undefined||f.helper.convId);n++)stepWorld(f.w);}finally{restore();}expect(f.c.delay?.response).toBe('accepted');
 // Declared environmental intervention, not attributed to the conversation or extra time itself.
 f.w.terrain.set(f.originalTerrain);f.helper.cooldowns.pause=0;
 const repair=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='repair'&&o.targetId===f.hut.id);expect(repair).toBeDefined();const before={wood:f.helper.inv.wood??0,condition:f.hut.condition};startActivity(f.w,f.helper,repair!.make!()!);
 restore=held(f);try{for(let n=0;n<1000&&f.c.status==='active';n++)stepWorld(f.w);}finally{restore();}
 expect(f.c.status).toBe('done');expect(f.hut.condition).toBeGreaterThan(before.condition);expect(f.helper.inv.wood??0).toBeLessThan(before.wood);expect(f.c.attempt?.resolvedAt).toBeDefined();expect(f.c.delay?.response).toBe('accepted');expect(conservationReport(f.w).ok).toBe(true);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});


it('allows a healthy requester to refuse on personal trust without changing time, goods or work',()=>{
 const f=repairDelayScene();f.parent.relations[f.helper.id].trust=0;const deadline=f.c.deadline,inv=structuredClone(f.helper.inv);startTalk(f);const restore=held(f);try{for(let n=0;n<400&&!f.c.delay?.response;n++)stepWorld(f.w);expect(f.c.delay?.response).toBe('refused');expect(f.c.delay?.responseReason).toContain('confident');expect(f.c.deadline).toBe(deadline);expect(f.helper.inv).toEqual(inv);expect(f.c.contrib??0).toBe(0);}finally{restore();}
});
it('requires the intended awake listener and matching request before sharing the attempt',()=>{
 const f=repairDelayScene();f.parent.x=f.helper.x;f.parent.y=f.helper.y;f.parent.pose='sleep';const raw=serializeWorld(f.w);expect(receiveDelayProposal(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();expect(serializeWorld(f.w)).toBe(raw);f.parent.pose='stand';expect(receiveDelayProposal(f.w,f.parent,f.helper,f.request.id,999)).toBeNull();expect(receiveDelayProposal(f.w,f.helper,f.parent,f.request.id+1,999)).toBeNull();expect(f.c.delay).toBeUndefined();
});
it('rejects a requester-side report forged as firsthand evidence',()=>{
 const f=repairDelayScene();f.parent.x=f.helper.x;f.parent.y=f.helper.y;receiveDelayProposal(f.w,f.helper,f.parent,f.request.id,999);const e=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!.expectation!;e.delay!.source='own attempt';expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});


it('settles an actually completed building share before its deadline while the larger site remains unfinished',()=>{
 const f=contributedBuildScene();expect(f.c.contrib).toBeGreaterThanOrEqual(40);expect(f.w.tick).toBeLessThan(f.c.deadline);expect(f.w.byId.has(f.target.id)).toBe(true);expect(f.target.work).toBeLessThan(f.target.workTotal);expect(f.c.status).toBe('done');expect(f.request.status).toBe('fulfilled');expect(f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!.outcome).toBe('promised');const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(f.helper.socialMemory!.find(m=>m.requestId===f.request.id)?.completion?.source).toBe('own completion');expect(pendingDelayProposals(f.w,f.helper)).toHaveLength(0);expect(conservationReport(f.w).ok).toBe(true);
});


it('retains old build settlement and its isolated removal without negotiating already supplied work',()=>{
 for(const version of [84,85]){setBuildPromiseSettlement(version===84);const f=contributedBuildScene(version);expect(f.c.status).toBe('active');expect(f.c.contrib).toBeGreaterThanOrEqual(40);expect(pendingDelayProposals(f.w,f.helper)).toHaveLength(0);expect(conservationReport(f.w).ok).toBe(true);}
});
