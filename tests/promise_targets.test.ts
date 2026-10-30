import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {afterEach,expect,it} from 'vitest';
import {targetPromiseScene,discoveredTargetScene,sitePromiseScene,firePromiseScene} from './helpers/promise_targets';
import {setPromiseTargets,observePromiseTarget} from '../src/sim/promise_targets';
import {cancelSite,destroyBuilding} from '../src/sim/buildings';
import {checkCommitments} from '../src/sim/social';
import {refreshBeliefs} from '../src/sim/perception';
import {personalRequests} from '../src/sim/promise_expectations';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {startActivity,newActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {setExternalController} from '../src/sim/external';
import {pin} from './helpers/kit';
import {relationshipHistory} from '../src/sim/history';
afterEach(()=>setPromiseTargets(true));
it('retains an uninformed accepted repair and offered remembered approach after a distant collapse',()=>{
 const f=targetPromiseScene(),belief=structuredClone(f.helper.beliefs[f.hut.id]);destroyBuilding(f.w,f.hut,'staged collapse');checkCommitments(f.w,f.helper);expect(f.c.status).toBe('active');expect(f.helper.beliefs[f.hut.id]).toEqual(belief);expect(f.c.targetEvidence).toBeUndefined();expect(personalRequests(f.w,f.helper).find(r=>r.id===f.request.id)?.status).toBe('promised');
 const before=serializeWorld(f.w);expect(generateOptions(f.w,f.helper,true,true).options.some(o=>o.kind==='repair'&&o.targetId===f.hut.id)).toBe(true);expect(serializeWorld(f.w)).toBe(before);expect(serializeWorld(deserializeWorld(before))).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
});
it('walks to discover the absent target, releases its promise and retains a report without informing the requester',()=>{
 const f=discoveredTargetScene();expect(f.c.targetEvidence?.source).toBe('observed absence');expect(f.c.reason).toContain('fate is unknown');expect(f.helper.activity).toBeNull();expect(f.helper.beliefs[f.hut.id]).toBeUndefined();expect(f.request.status).toBe('cancelled');expect(personalRequests(f.w,f.parent).find(r=>r.id===f.request.id)?.status).toBe('promised');
 const m=f.helper.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(m.resolution?.targetEvidence).toEqual(f.c.targetEvidence);expect(m.outcome).toBe('cancelled');expect(m.task?.workReceipt).toBeUndefined();expect(relationshipHistory(f.w,f.helper).join(' ')).toContain('observed absence');expect(conservationReport(f.w).ok).toBe(true);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
it('preserves exact saved continuation through physical discovery',()=>{
 const f=targetPromiseScene();destroyBuilding(f.w,f.hut,'staged collapse');const copy=deserializeWorld(serializeWorld(f.w));for(const w of [f.w,copy]){const p=w.persons.find(p=>p.id===f.helper.id)!;p.cooldowns.pause=0;const o=generateOptions(w,p,true,true).options.find(o=>o.kind==='repair'&&o.targetId===f.hut.id)!;startActivity(w,p,o.make!()!);}
 for(let n=0;n<400;n++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(copy)).toBe(serializeWorld(f.w));expect(f.c.targetEvidence).toBeDefined();expect(conservationReport(f.w).ok).toBe(true);
});
it('communicates a discovered cancellation in person and acknowledges it once',()=>{
 const f=discoveredTargetScene(),x=f.helper.x-4,y=f.helper.y;f.parent.cooldowns.pause=0;const walk=newActivity(f.w,f.parent,{kind:'wander',label:'Staged rendezvous after target loss',goal:'staged rendezvous',tx:x,ty:y,spotX:x,spotY:y,minCommit:500,maxTicks:700,duration:1,data:{sticky:true}});startActivity(f.w,f.parent,walk);for(let n=0;n<650&&f.parent.activity?.id===walk.id;n++)stepWorld(f.w);pin(f.parent);
 const raw=serializeWorld(f.w),copy=deserializeWorld(raw);for(const w of [f.w,copy]){const p=w.persons.find(p=>p.id===f.helper.id)!;p.cooldowns.pause=0;const o=rankOptions(generateOptions(w,p,true,true)).find(o=>o.tag==='report');expect(o).toBeDefined();startActivity(w,p,o!.make!()!);}
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:(_w,_p,ctx,ranked)=>{const o=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.tag==='report')??ranked[0];return {kind:'pick',key:o.key};}});try{for(let n=0;n<300;n++){stepWorld(f.w);stepWorld(copy);}}finally{restore();}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));const m=f.parent.socialMemory!.find(m=>m.requestId===f.request.id)!;expect(m.expectation?.source).toBe('helper report');expect(m.outcome).toBe('cancelled');expect(m.resolution?.targetEvidence?.source).toBe('observed absence');expect(m.task?.workReceipt).toBeUndefined();expect(f.helper.socialMemory!.find(m=>m.requestId===f.request.id)?.resolution?.acknowledgedAt).toBeDefined();expect(f.parent.socialMemory!.filter(m=>m.requestId===f.request.id)).toHaveLength(1);expect(conservationReport(f.w).ok).toBe(true);
});
it('does not infer target loss from a forgotten belief, sleep or a different interior',()=>{
 const f=targetPromiseScene();destroyBuilding(f.w,f.hut,'staged collapse');delete f.helper.beliefs[f.hut.id];checkCommitments(f.w,f.helper);expect(f.c.status).toBe('active');
 // Unit observation guards; no physical journey claimed in these positioned boundary probes.
 f.helper.x=61;f.helper.y=41;f.helper.pose='sleep';observePromiseTarget(f.w,f.helper,f.hut.id,61,41);expect(f.c.targetEvidence).toBeUndefined();f.helper.pose='stand';f.helper.indoors=999;observePromiseTarget(f.w,f.helper,f.hut.id,61,41);expect(f.c.targetEvidence).toBeUndefined();
});
it('keeps prior rules and isolated removal unchanged',()=>{
 for(const version of [82,83]){setPromiseTargets(version===82);const f=targetPromiseScene(version);destroyBuilding(f.w,f.hut,'staged collapse');checkCommitments(f.w,f.helper);expect(f.c.status).toBe('moot');expect(f.c.reason).toBe('the building is gone');expect(f.c.targetEvidence).toBeUndefined();}
});
it.each(['future','target','kind','source','old rules','null'] as const)('rejects malformed target evidence: %s',kind=>{
 const f=discoveredTargetScene(),k=f.c.targetEvidence!;if(kind==='null')(f.c as any).targetEvidence=null;if(kind==='future')k.tick=f.w.tick+1;if(kind==='target')k.targetId++;if(kind==='kind')k.kind='site';if(kind==='source')(k as any).source='omniscient';if(kind==='old rules')f.w.settings.rulesVersion=82;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});

it('does not call an unseen vanished site complete at the personal deadline',()=>{
 const f=sitePromiseScene();expect(f.parent.socialMemory?.find(m=>m.requestId===f.request.id)?.expectation).toBeDefined();cancelSite(f.w,f.target,'staged distant abandonment');checkCommitments(f.w,f.helper);expect(f.c.status).toBe('active');f.helper.cooldowns.pause=0;
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<2200&&f.c.status==='active';n++)stepWorld(f.w);}finally{restore();}
 expect(f.c.status).toBe('expired');expect(f.c.reason).toContain('cause not established');expect(f.c.targetEvidence).toBeUndefined();expect(f.request.status).not.toBe('fulfilled');expect(conservationReport(f.w).ok).toBe(true);
});
it('preserves real partial building work when the local site disappears, without claiming completion',()=>{
 const f=sitePromiseScene();f.helper.cooldowns.pause=0;const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='build'&&o.targetId===f.target.id);expect(o).toBeDefined();startActivity(f.w,f.helper,o!.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<600&&(f.c.contrib??0)<10;n++)stepWorld(f.w);expect(f.c.contrib).toBe(10);cancelSite(f.w,f.target,'staged collapse during real work');for(let n=0;n<100&&f.c.status==='active';n++)stepWorld(f.w);}finally{restore();}
 expect(f.c.status).toBe('moot');expect(f.c.contrib).toBe(10);expect(f.c.reason).toContain('10/40');expect(f.c.targetEvidence?.source).toBe('observed absence');expect(f.helper.activity).toBeNull();expect(f.request.status).toBe('cancelled');expect(f.parent.socialMemory?.find(m=>m.requestId===f.request.id)?.outcome).toBe('promised');expect(conservationReport(f.w).ok).toBe(true);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
it('recognizes a site actually completed by the promised worker as completed work, not missing goods',()=>{
 const f=sitePromiseScene();f.helper.cooldowns.pause=0;const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='build'&&o.targetId===f.target.id)!;startActivity(f.w,f.helper,o.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&f.c.status==='active';n++)stepWorld(f.w);}finally{restore();}
 expect(f.w.byId.has(f.target.id)).toBe(false);expect(f.c.targetEvidence?.source).toBe('completed here');expect(f.c.status).toBe('done');expect(f.request.status).toBe('fulfilled');expect(f.request.note).toBe('completed my promised work contribution');expect(f.w.buildings.some(b=>b.type==='lean_to'&&b.hhId===f.parent.hhId)).toBe(true);expect(conservationReport(f.w).ok).toBe(true);const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});

it('counts actually consumed firewood before target loss without losing the performed duty',()=>{
 const f=firePromiseScene();f.helper.cooldowns.pause=0;const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.kind==='fuel_fire'&&o.targetId===f.hut.id);expect(o).toBeDefined();startActivity(f.w,f.helper,o!.make!()!);
 const restore=setExternalController({controls:(_w,p)=>p.id===f.helper.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<600&&(f.helper.cooldowns['fedfire'+f.hut.id]??-1)<f.c.made;n++)stepWorld(f.w);expect(f.w.ledger.reasons['-fuel for the fire']).toBeGreaterThan(0);destroyBuilding(f.w,f.hut,'staged disappearance after actual fuel');checkCommitments(f.w,f.helper);}finally{restore();}
 expect(f.c.status).toBe('done');expect(f.c.contrib).toBe(40);expect(f.request.status).toBe('fulfilled');expect(conservationReport(f.w).ok).toBe(true);
});

it('keeps actual ordinary site completion distinct from a partially delivered hauling promise',()=>{
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:83});while(w.tick<1000)stepWorld(w);const p=w.persons.find(p=>p.id===1135)!,c=p.commitments.find(c=>c.id===1501)!,m=p.socialMemory!.find(m=>m.requestId===c.requestId)!;
 expect(c.kind).toBe('haul');expect(c.contrib).toBeGreaterThan(40);expect(c.delivered).toBe(2);expect(c.amount).toBe(3);expect(c.targetEvidence?.source).toBe('completed here');expect(c.status).toBe('moot');expect(m.outcome).toBe('cancelled');expect(m.reason).toContain('delivered only 2/3');expect(m.completion).toBeUndefined();expect(m.resolution?.targetEvidence?.source).toBe('completed here');expect(conservationReport(w).ok).toBe(true);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
