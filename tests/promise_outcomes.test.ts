import {afterEach,expect,it} from 'vitest';
import {failedPromiseScene,outcomeReportScene} from './helpers/promise_outcomes';
import {completionReportScene} from './helpers/promise_knowledge';
import {setPromiseOutcomes,pendingOutcomeReports,receiveOutcomeReport,acknowledgeOutcomeReport,deadlineOutcome,correctPromiseApproach,recordPromiseAttempt} from '../src/sim/promise_outcomes';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {startActivity,newActivity} from '../src/sim/activities';
import {stepWorld,hashWorld} from '../src/sim/world';
import {pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {conservationReport} from '../src/sim/economy';
import {relationshipHistory} from '../src/sim/history';
import {setExternalController} from '../src/sim/external';
import {abortConversationFor} from '../src/sim/social';
import {DAY} from '../src/sim/constants';
afterEach(()=>setPromiseOutcomes(true));
it('retains an actual failed journey through the natural deadline without inventing blame or remote knowledge',()=>{
 const f=failedPromiseScene();expect(f.failed?.outcome).toBe('failed');expect(f.commitment.attempt?.activityId).toBe(f.watch.id);expect(f.commitment.attempt?.reason).toBe('no way to get there');
 const saved=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);const {before,after}=f.expire();
 expect(after.tick-before.tick).toBe(1);expect(after.commitment.status).toBe('failed');expect(after.request).toBe('failed');expect(after.relation).toEqual(before.relation);expect(after.heard).toEqual(before.heard);expect(after.requesterReceipt).toBeUndefined();expect(after.parentAlive&&after.helperAlive).toBe(true);
 const own=pendingOutcomeReports(f.w,f.helper);expect(own).toHaveLength(1);expect(own[0].resolution?.attempt?.activityId).toBe(f.watch.id);expect(own[0].resolution?.source).toBe('own outcome');expect(conservationReport(f.w).ok).toBe(true);
});
it('walks to report a saved failed attempt and acknowledges hearing it without creating firsthand proof',()=>{
 const f=outcomeReportScene(),raw=serializeWorld(f.w),copy=deserializeWorld(raw);const offered=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report');expect(offered,JSON.stringify({tick:f.w.tick,parent:{x:f.parent.x,y:f.parent.y,activity:f.parent.activity},helper:{x:f.helper.x,y:f.helper.y,pending:pendingOutcomeReports(f.w,f.helper)},options:rankOptions(generateOptions(f.w,f.helper,true,true)).map(o=>o.key)})).toBeDefined();expect(serializeWorld(f.w)).toBe(raw);
 for(const w of [f.w,copy]){const p=w.persons.find(p=>p.id===f.helper.id)!;p.cooldowns.pause=0;const o=rankOptions(generateOptions(w,p,true,true)).find(o=>o.tag==='report');startActivity(w,p,o!.make!()!);}
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const o=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:o.key};}});
 try{for(let n=0;n<500;n++){stepWorld(f.w);stepWorld(copy);}}finally{restore();}
 expect(serializeWorld(copy)).toBe(serializeWorld(f.w));const m=f.parent.socialMemory?.find(m=>m.requestId===f.request.id);expect(m?.resolution?.source,JSON.stringify({m,own:f.helper.socialMemory,result:f.helper.lastResult,interaction:f.helper.lastInteraction})).toBe('helper report');expect(m?.resolution?.attempt?.activityId).toBe(f.watch.id);expect(m?.task?.receipt).toBeUndefined();expect(m?.task?.workReceipt).toBeUndefined();expect(f.parent.relations[f.helper.id].grievance).toBeNull();expect(pendingOutcomeReports(f.w,f.helper)).toHaveLength(0);expect(relationshipHistory(f.w,f.parent).join(' ')).toContain('Intent is not established');expect(conservationReport(f.w).ok).toBe(true);
});
it('requires actual contact, preserves a heard explanation across interruption, and deduplicates a retry',()=>{
 const f=outcomeReportScene();expect(receiveOutcomeReport(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();
 const o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report')!;f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,_ctx,ranked)=>({kind:'pick',key:ranked[0].key})});try{for(let n=0;n<400&&!f.parent.socialMemory?.some(m=>m.resolution);n++)stepWorld(f.w);}finally{restore();}
 const own=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(own.resolution?.acknowledgedAt).toBeUndefined();expect(f.parent.socialMemory?.filter(m=>m.requestId===f.request.id)).toHaveLength(1);abortConversationFor(f.w,f.helper);expect(f.helper.lastInteraction?.outcome).toBe('report heard, acknowledgement not received');
 const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(receiveOutcomeReport(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();
 // Unit retry boundary, not ordinary simulation evidence.
 f.w.tick+=401;const relation=structuredClone(f.parent.relations[f.helper.id]);expect(receiveOutcomeReport(f.w,f.helper,f.parent,f.request.id,999)).not.toBeNull();expect(f.parent.socialMemory?.filter(m=>m.requestId===f.request.id)).toHaveLength(1);expect(f.parent.relations[f.helper.id]).toEqual(relation);expect(acknowledgeOutcomeReport(f.w,f.helper,f.parent,f.request.id)).toBe(true);
});
it('does not attribute unrelated work, and corrects only a validated matching approach',()=>{
 const f=failedPromiseScene(),c=f.commitment,a=f.watch,original=structuredClone(c.attempt);const other={...a,id:a.id+100,targetId:a.targetId+1,data:{}};
 recordPromiseAttempt(f.w,f.helper,other,'failed','unrelated');expect(c.attempt).toEqual(original);correctPromiseApproach(f.w,f.helper,other);expect(c.attempt?.resolvedAt).toBeUndefined();
 correctPromiseApproach(f.w,f.helper,a);expect(c.attempt?.resolvedAt).toBe(f.w.tick);delete c.blockedAt;deadlineOutcome(f.w,c,0);expect(c.status).toBe('expired');expect(c.reason).toContain('cause not established');
 c.attempt={...original!,phase:'work'};correctPromiseApproach(f.w,f.helper,a);expect(c.attempt.resolvedAt).toBeUndefined();
});
it('separates partial work, own survival and unknown cause without asserting bad faith',()=>{
 const f=failedPromiseScene(),c=f.commitment;deadlineOutcome(f.w,c,.25);expect(c.status).toBe('expired');expect(c.reason).toContain('25%');c.setAside=f.w.tick;deadlineOutcome(f.w,c,0);expect(c.status).toBe('interrupted');delete c.setAside;delete c.attempt;delete c.blockedAt;deadlineOutcome(f.w,c,0);expect(c.status).toBe('expired');expect(c.reason).toContain('cause not established');
});
it('keeps previous rules and removal unchanged; positive completion still reports independently',()=>{
 const old=failedPromiseScene(80);old.expire();expect(old.commitment.status).toBe('broken');expect(old.parent.relations[old.helper.id].grievance).toBeDefined();expect(old.commitment.attempt).toBeUndefined();
 setPromiseOutcomes(false);const removed=failedPromiseScene();removed.expire();expect(removed.commitment.status).toBe('broken');expect(removed.commitment.attempt).toBeUndefined();setPromiseOutcomes(true);
 const positive=completionReportScene(81);expect(positive.request.status).toBe('fulfilled');expect(rankOptions(generateOptions(positive.w,positive.helper,true,true)).some(o=>o.tag==='report')).toBe(true);
});
it('retains one bounded personal outcome after operational pruning and bounds report age',()=>{
 const f=failedPromiseScene();f.expire();f.w.requests=[];f.helper.commitments=[];expect(pendingOutcomeReports(f.w,f.helper)).toHaveLength(1);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);f.w.tick+=13*DAY;expect(pendingOutcomeReports(f.w,f.helper)).toHaveLength(0);
});
it.each(['future','old rules','firsthand','resolved attempt','role','retry'])('rejects malformed outcome saves: %s',bad=>{
 const f=failedPromiseScene();f.expire();const own=f.helper.socialMemory!.find(m=>m.resolution)!,k=own.resolution!;
 if(bad==='future')k.resolvedAt=f.w.tick+1;if(bad==='old rules')f.w.settings.rulesVersion=80;if(bad==='firsthand'){k.source='helper report';k.from=own.otherId;k.conversationId=999;own.role='asker';own.task!.receipt={item:'wood',amount:1,tick:f.w.tick,eventKind:'activity',eventId:999};}if(bad==='resolved attempt')k.attempt!.resolvedAt=f.w.tick;if(bad==='role')own.role='asker';if(bad==='retry')k.reportAfter=f.w.tick+401;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});

it('corrects the failed approach only after a real later journey reaches the child',()=>{
 const f=failedPromiseScene();const originalHash=hashWorld(f.w);f.commitment.attempt!.reason+=' changed';expect(hashWorld(f.w)).not.toBe(originalHash);f.commitment.attempt!.reason='no way to get there';
 f.w.terrain.set(f.originalTerrain);for(let n=0;n<100;n++)stepWorld(f.w);f.helper.cooldowns.pause=0;const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`watch:${f.child.id}`);expect(o).toBeDefined();startActivity(f.w,f.helper,o!.make!()!);
 for(let n=0;n<600&&f.commitment.attempt?.resolvedAt===undefined;n++)stepWorld(f.w);expect(f.commitment.attempt?.resolvedAt).toBeDefined();expect(f.helper.activity?.phase).toBe('work');expect(f.commitment.status).toBe('active');expect(conservationReport(f.w).ok).toBe(true);
});
