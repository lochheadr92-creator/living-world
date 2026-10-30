import {afterEach,expect,it} from 'vitest';
import {remoteCompletionScene,completionReportScene} from './helpers/promise_knowledge';
import {finishWitnessedWatch} from './helpers/watch_learning';
import {helperLearningScene} from './helpers/helper_learning';
import {setPromiseKnowledge,pendingCompletionReports,receiveCompletionReport,acknowledgeCompletionReport} from '../src/sim/promise_knowledge';
import {watchExperience,helperExperience} from '../src/sim/helper_learning';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {startActivity} from '../src/sim/activities';
import {abortConversationFor} from '../src/sim/social';
import {stage,addPerson,building,done,pin} from './helpers/kit';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {relOf} from '../src/sim/relations';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {relationshipHistory} from '../src/sim/history';
import {DAY} from '../src/sim/constants';
import {setExternalController} from '../src/sim/external';
afterEach(()=>setPromiseKnowledge(true));
it('keeps completed work real without remotely changing the requester’s knowledge or relationship',()=>{
 const f=remoteCompletionScene();expect(f.watch.progress).toBe(300);expect(f.request.status).toBe('fulfilled');expect(f.parent.relations[f.helper.id]).toEqual(f.before);expect(f.parent.heard??[]).toEqual([]);expect(f.parent.socialMemory??[]).toEqual([]);
 expect(pendingCompletionReports(f.w,f.helper)).toHaveLength(1);expect(pendingCompletionReports(f.w,f.helper)[0].completion?.source).toBe('own completion');expect(conservationReport(f.w).ok).toBe(true);
});
it('preserves witnessed completion and records the actual acknowledgement without a redundant report',()=>{
 const f=finishWitnessedWatch(80),m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(m.completion?.source).toBe('observed completion');expect(pendingCompletionReports(f.w,f.helper)).toHaveLength(0);expect(watchExperience(f.w,f.parent,f.helper.id).bonus).toBe(3);
});
it('preserves actual direct material delivery, acknowledgement and useful crafting under current rules',async()=>{
 const f=await helperLearningScene(80);expect(f.ada.inv.pick).toBe(1);expect(f.receipt.task?.receipt?.amount).toBe(2);expect(f.receipt.completion?.source).toBe('observed completion');expect(pendingCompletionReports(f.w,f.ben).some(m=>m.requestId===f.receipt.requestId)).toBe(false);expect(helperExperience(f.w,f.ada,f.ben.id,'stone','stone').bonus).toBe(3);expect(conservationReport(f.w).ok).toBe(true);
});
it('keeps an actual distant roof repair from awarding unseen trust through the upkeep path',()=>{
 const s=stage('reported-roof'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=80;
 const parent=addPerson(s,'Edda',40,40,{age:72,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ned',42,40,{age:34,inv:{wood:4,fruit:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),hut=building(s,'hut',60,40,parent.hhId);
 w.households.find(h=>h.id===parent.hhId)!.homeId=hut.id;hut.condition=38;done(s);for(const p of [parent,helper]){observe(w,p,hut);perceive(w,p);}relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;pin(helper);
 const ask=generateOptions(w,parent,true,true).options.find(o=>o.key.endsWith(':request:repair'));expect(ask).toBeDefined();startActivity(w,parent,ask!.make!()!);for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='repair'&&r.status!=='pending')&&!parent.convId)break;}
 const r=w.requests.find(r=>r.kind==='repair')!;expect(r.status).toBe('promised');pin(parent);helper.cooldowns.pause=0;const repair=generateOptions(w,helper,true,true).options.find(o=>o.kind==='repair'&&o.targetId===hut.id);expect(repair).toBeDefined();startActivity(w,helper,repair!.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===helper.id,choose:(_w,_p,ctx,ranked)=>{const o=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.kind==='repair')??ranked[0];return {kind:'pick',key:o.key};}});
 let before=structuredClone(parent.relations[helper.id]);try{for(let n=0;n<2200&&r.status==='promised';n++){before=structuredClone(parent.relations[helper.id]);stepWorld(w);}}finally{restore();}
 expect(r.status,JSON.stringify({tick:w.tick,request:r,condition:hut.condition,activity:helper.activity,commitments:helper.commitments,result:helper.lastResult})).toBe('fulfilled');expect(hut.condition).toBeGreaterThan(38);expect(w.ledger.reasons['-repairs']).toBeGreaterThan(0);expect(parent.relations[helper.id]).toEqual(before);expect(parent.socialMemory?.some(m=>m.requestId===r.id)).not.toBe(true);expect(pendingCompletionReports(w,helper).some(m=>m.requestId===r.id)).toBe(true);const commitment=helper.commitments.find(c=>c.requestId===r.id)!;expect(commitment.contrib).toBe(40);const repairId=helper.activity?.id;for(let n=0;n<600&&helper.activity?.id===repairId;n++)stepWorld(w);expect(commitment.contrib).toBe(40);expect(conservationReport(w).ok).toBe(true);
});
it('walks to communicate a saved personal completion, keeps report provenance and acknowledges receipt',()=>{
 const f=completionReportScene(),raw=serializeWorld(f.w),copy=deserializeWorld(raw);
 const offered=()=>rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report');expect(offered()).toBeDefined();expect(serializeWorld(f.w)).toBe(raw);
 for(const w of [f.w,copy]){const helper=w.persons.find(p=>p.id===f.helper.id)!;const o=rankOptions(generateOptions(w,helper,true,true)).find(o=>o.tag==='report');helper.cooldowns.pause=0;startActivity(w,helper,o!.make!()!);}
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const o=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:o.key};}});
 try{for(let n=0;n<500;n++){stepWorld(f.w);stepWorld(copy);}}finally{restore();}expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
 const m=f.parent.socialMemory?.find(m=>m.requestId===f.request.id);expect(m?.completion?.source).toBe('helper report');expect(m?.completion?.from).toBe(f.helper.id);expect(m?.task?.workReceipt).toBeUndefined();expect(m?.task?.receipt).toBeUndefined();expect(watchExperience(f.w,f.parent,f.helper.id).bonus).toBe(0);expect(helperExperience(f.w,f.parent,f.helper.id,'stone','stone').bonus).toBe(0);
 expect(pendingCompletionReports(f.w,f.helper)).toHaveLength(0);expect(f.helper.socialMemory?.find(m=>m.requestId===f.request.id)?.completion?.acknowledgedAt).toBeDefined();expect(relationshipHistory(f.w,f.parent).join(' ')).toContain('reported, not independently witnessed');expect(conservationReport(f.w).ok).toBe(true);
});
it('cannot transmit at a distance, through a separate room, to a sleeping listener or as an unrelated speaker',()=>{
 const f=remoteCompletionScene();expect(receiveCompletionReport(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();expect(acknowledgeCompletionReport(f.w,f.helper,f.parent,f.request.id)).toBe(false);
 f.parent.x=f.helper.x;f.parent.y=f.helper.y;f.parent.pose='sleep';expect(receiveCompletionReport(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();f.parent.pose='stand';f.parent.indoors=999;expect(receiveCompletionReport(f.w,f.helper,f.parent,f.request.id,999)).toBeNull();delete f.parent.indoors;expect(receiveCompletionReport(f.w,f.child,f.parent,f.request.id,999)).toBeNull();
});
it('retains a heard report after interruption without inventing acknowledgement or duplicate evidence',()=>{
 const f=completionReportScene(),o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='report')!;f.helper.cooldowns.pause=0;startActivity(f.w,f.helper,o.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,_ctx,ranked)=>({kind:'pick',key:ranked[0].key})});
 try{for(let n=0;n<400&&!f.parent.socialMemory?.some(m=>m.completion?.source==='helper report');n++)stepWorld(f.w);}finally{restore();}
 const own=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(own.completion?.acknowledgedAt).toBeUndefined();expect(f.parent.socialMemory?.filter(m=>m.requestId===f.request.id)).toHaveLength(1);
 const saved=serializeWorld(f.w),copy=deserializeWorld(saved);expect(serializeWorld(copy)).toBe(saved);abortConversationFor(f.w,f.helper);expect(own.completion?.acknowledgedAt).toBeUndefined();expect(f.helper.lastInteraction?.outcome).toBe('report heard, acknowledgement not received');
 expect(own.completion?.reportAfter).toBeGreaterThan(f.w.tick);expect(Object.keys(f.helper.cooldowns).some(k=>k.startsWith('report:'))).toBe(false);
 // Unit retry boundary at real contact: cooldown must elapse; hearing twice cannot multiply a retained event or reward.
 f.w.tick+=401;const relation=structuredClone(f.parent.relations[f.helper.id]);expect(receiveCompletionReport(f.w,f.helper,f.parent,f.request.id,999)).not.toBeNull();expect(f.parent.socialMemory?.filter(m=>m.requestId===f.request.id)).toHaveLength(1);expect(f.parent.relations[f.helper.id]).toEqual(relation);expect(acknowledgeCompletionReport(f.w,f.helper,f.parent,f.request.id)).toBe(true);expect(pendingCompletionReports(f.w,f.helper)).toHaveLength(0);
});
it('retains the own outcome after operational expiry, bounds reporting age and preserves old rules/removal',()=>{
 const f=remoteCompletionScene();f.w.requests=[];f.helper.commitments=[];expect(pendingCompletionReports(f.w,f.helper)).toHaveLength(1);f.w.tick+=13*DAY;expect(pendingCompletionReports(f.w,f.helper)).toHaveLength(0);
 const old=remoteCompletionScene(79);expect(old.parent.relations[old.helper.id].trust-old.before.trust).toBe(6);setPromiseKnowledge(false);const off=remoteCompletionScene();expect(off.parent.relations[off.helper.id].trust-off.before.trust).toBe(6);expect(off.helper.socialMemory?.some(m=>m.completion)).toBe(false);
});
it('keeps an eligible older report when newer pending recipients are not in sight',()=>{
 const f=completionReportScene(),old=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;
 // Unit bound: newer personal records must not hide the one recipient actually seen now.
 f.helper.socialMemory!.push({...structuredClone(old),requestId:900,otherId:998},{...structuredClone(old),requestId:901,otherId:999});
 const offered=generateOptions(f.w,f.helper,true,true).options.filter(o=>o.tag==='report');expect(offered).toHaveLength(1);expect(offered[0].targetId).toBe(f.parent.id);
});
it.each(['future','source','role','old rules','ack time'] as const)('rejects malformed personal completion: %s',kind=>{
 const f=remoteCompletionScene(),m=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;
 if(kind==='future')m.completion!.tick=f.w.tick+1;if(kind==='source')(m.completion as any).source='omniscient';if(kind==='role')m.role='asker';if(kind==='old rules')f.w.settings.rulesVersion=79;if(kind==='ack time')m.completion!.acknowledgedAt=f.w.tick+1;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});
