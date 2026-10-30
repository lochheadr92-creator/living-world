import {afterEach,expect,it} from 'vitest';
import {finishWitnessedWatch,watchLearningScene,laterWatchScene} from './helpers/watch_learning';
import {watchExperience,setWatchLearning,helperExperience} from '../src/sim/helper_learning';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {conservationReport} from '../src/sim/economy';
import {relationshipHistory} from '../src/sim/history';
import {rememberRequest} from '../src/sim/social_memory';
import {startActivity,newActivity} from '../src/sim/activities';
import {DAY} from '../src/sim/constants';
import {setExternalController} from '../src/sim/external';
afterEach(()=>setWatchLearning(true));

it('changes a later eligible childcare choice across a delay and save, followed by voluntary acceptance and real work',()=>{
 const f=laterWatchScene(),raw=serializeWorld(f.w),copy=deserializeWorld(raw);
 const asks=()=>rankOptions(generateOptions(f.w,f.parent,true,true)).filter(o=>o.key.endsWith(':request:watch'));
 expect(asks()[0].targetId).toBe(f.helper.id);expect(asks()[0].selectionReason).toContain('I saw completion');setWatchLearning(false);expect(asks()[0].targetId).toBe(f.other.id);setWatchLearning(true);expect(serializeWorld(f.w)).toBe(raw);
 for(const w of [f.w,copy]){w.persons.find(p=>p.id===f.parent.id)!.cooldowns.pause=0;w.persons.find(p=>p.id===f.helper.id)!.cooldowns.pause=0;}
 const restore=setExternalController({controls:(_w,p)=>p.id===f.parent.id,choose:(_w,p,ctx,ranked)=>{const choice=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??ranked.find(o=>o.key.endsWith(':request:watch'))??ranked[0];return {kind:'pick',key:choice.key};}});
 try{while(f.w.tick<1250){stepWorld(f.w);stepWorld(copy);}}finally{restore();}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));const later=f.w.requests.find(r=>r.kind==='watch'&&r.id!==f.request.id);expect(later?.to).toBe(f.helper.id);expect(later?.status).toBe('fulfilled');expect(later?.helperWork?.eventId).not.toBe(f.watch.id);expect(conservationReport(f.w).ok).toBe(true);
});

it('records physical watch completion, distinct personal sources and no outsider knowledge',()=>{
 const {w,parent,helper,child,other,request,watch}=finishWitnessedWatch();
 expect(watch.progress).toBe(300);expect(child.inv.bread).toBeGreaterThan(0);expect(request.helperWork).toEqual({kind:'watch',target:child.id,eventId:watch.id,tick:396,witnessId:parent.id});
 expect(parent.socialMemory?.[0].task?.workReceipt?.source).toBe('completion in sight');expect(helper.socialMemory?.find(m=>m.requestId===request.id)?.task?.workReceipt?.source).toBe('own work');expect(other.socialMemory??[]).toEqual([]);
 expect(watchExperience(w,parent,helper.id).bonus).toBe(3);expect(watchExperience(w,other,helper.id).bonus).toBe(0);expect(helperExperience(w,parent,helper.id,'stone','stone').bonus).toBe(0);
 const before=serializeWorld(w);rememberRequest(w,request);generateOptions(w,parent,true,true);expect(relationshipHistory(w,parent).join(' ')).toContain('Saw completion of the agreed watch');expect(serializeWorld(w)).toBe(before);expect(conservationReport(w).ok).toBe(true);
 const copy=deserializeWorld(before);copy.requests=[];expect(watchExperience(copy,copy.persons.find(p=>p.id===parent.id)!,helper.id).bonus).toBe(3);
});

it('preserves a mid-watch save and does not invent completed work early',()=>{
 const f=watchLearningScene();expect(f.request.helperWork).toBeUndefined();const copy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<500;i++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(copy)).toBe(serializeWorld(f.w));expect(f.request.helperWork).toBeDefined();expect(conservationReport(copy).ok).toBe(true);
});

it('does not turn losing contact before completion into competence evidence',()=>{
 const f=watchLearningScene();for(let i=0;i<100;i++)stepWorld(f.w);expect(f.watch.progress).toBeLessThan(300);
 // Explicit staged disruption: the child leaves the helper's local sight before completion.
 f.child.x=70;f.child.y=70;for(let i=0;i<40;i++)stepWorld(f.w);
 expect(f.request.helperWork).toBeUndefined();expect(watchExperience(f.w,f.parent,f.helper.id).bonus).toBe(0);expect(f.request.status).not.toBe('fulfilled');
});

it.each(['absent','sleeping'] as const)('does not give competence credit to an %s parent',mode=>{
 const f=watchLearningScene();
 if(mode==='absent'){f.parent.x=70;f.parent.y=70;}
 else startActivity(f.w,f.parent,newActivity(f.w,f.parent,{kind:'sleep',label:'Staged sleep',goal:'staged sleeping parent',here:true,minCommit:1000,maxTicks:1200,amount:1000,data:{sticky:true}}));
 for(let i=0;i<500&&f.request.status==='promised';i++)stepWorld(f.w);
 expect(f.request.status).toBe('fulfilled');expect(f.request.helperWork?.witnessId).toBe(0);expect(watchExperience(f.w,f.parent,f.helper.id).bonus).toBe(0);expect(f.helper.socialMemory?.find(m=>m.requestId===f.request.id)?.task?.workReceipt?.source).toBe('own work');
});

it('preserves predecessor and isolated removal without backfilling historical outcomes',()=>{
 const old=finishWitnessedWatch(78);expect(old.request.helperWork).toBeUndefined();expect(old.parent.socialMemory?.[0].task?.workReceipt).toBeUndefined();
 setWatchLearning(false);const off=finishWitnessedWatch();expect(off.request.helperWork).toBeUndefined();expect(watchExperience(off.w,off.parent,off.helper.id).bonus).toBe(0);setWatchLearning(true);expect(watchExperience(off.w,off.parent,off.helper.id).bonus).toBe(0);
});

it('deduplicates physical events and bounds and ages the limited preference',()=>{
 const {w,parent,helper}=finishWitnessedWatch();const original=parent.socialMemory![0];parent.socialMemory!.push({...structuredClone(original),requestId:999});expect(watchExperience(w,parent,helper.id).bonus).toBe(3);
 for(let n=1;n<=3;n++){const m=structuredClone(original);m.requestId=1000+n;m.task!.workReceipt!.eventId+=n;parent.socialMemory!.push(m);}expect(watchExperience(w,parent,helper.id).bonus).toBe(6);
 w.tick+=5*DAY;expect(watchExperience(w,parent,helper.id).bonus).toBe(3);w.tick+=8*DAY;expect(watchExperience(w,parent,helper.id).bonus).toBe(0);
});

it.each(['future','wrong role','wrong task','old rules','wrong witness'] as const)('rejects malformed watch evidence: %s',kind=>{
 const f=finishWitnessedWatch(),m=f.parent.socialMemory![0];
 if(kind==='future')m.task!.workReceipt!.tick=f.w.tick+1;if(kind==='wrong role')m.task!.workReceipt!.source='own work';if(kind==='wrong task')m.task!.kind='stone';if(kind==='old rules')f.w.settings.rulesVersion=78;if(kind==='wrong witness')f.request.helperWork!.witnessId=f.other.id;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});
