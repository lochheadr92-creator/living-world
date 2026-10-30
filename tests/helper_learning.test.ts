import {afterEach,expect,it} from 'vitest';
import {helperLearningScene} from './helpers/helper_learning';
import {projectHelperScene} from './helpers/project_helpers';
import {helperExperience,setHelperLearning,describeHelperTask} from '../src/sim/helper_learning';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {rememberRequest} from '../src/sim/social_memory';
import {relationshipHistory} from '../src/sim/history';
import {observeInhabitant} from '../src/agent/observe';
import {DAY} from '../src/sim/constants';
afterEach(()=>setHelperLearning(true));

it('retains actual task, direct receipt and useful work without informing an uninvolved person',async()=>{
 const f=await helperLearningScene(),{w,ada,ben,outsider,receipt}=f;
 expect(receipt.task).toEqual({kind:'stone',item:'stone',asked:2,offered:2,receipt:{item:'stone',amount:2,tick:989,eventKind:'activity',eventId:29}});
 expect(w.tick-receipt.tick).toBeGreaterThan(650);expect(ada.inv.pick).toBe(1);expect(outsider.socialMemory??[]).toEqual([]);
 expect(helperExperience(w,ada,ben.id,'stone','stone').bonus).toBe(3);expect(helperExperience(w,outsider,ben.id,'stone','stone').bonus).toBe(0);
 expect(helperExperience(w,ada,ben.id,'watch','stone').bonus).toBe(0);expect(helperExperience(w,ada,ben.id,'wood','wood').bonus).toBe(0);
 const raw=serializeWorld(w),r=w.requests.find(r=>r.id===receipt.requestId)!;rememberRequest(w,r);expect(serializeWorld(w)).toBe(raw);
 const ctx=generateOptions(w,ada,true,true);observeInhabitant(w,ada,ctx,rankOptions(ctx));expect(relationshipHistory(w,ada).join(' ')).toContain('Last direct receipt: 2 stone');expect(serializeWorld(w)).toBe(raw);expect(conservationReport(w).ok).toBe(true);
 const copy=deserializeWorld(raw);expect(copy.persons.find(p=>p.id===ada.id)!.socialMemory).toEqual(ada.socialMemory);
 // Unit retention boundary: removing operational requests does not remove personally retained evidence.
 copy.requests=[];expect(helperExperience(copy,copy.persons.find(p=>p.id===ada.id)!,ben.id,'stone','stone').bonus).toBe(3);
});

it('changes an eligible later helper choice across a save, while preserving the helper’s valid refusal',async()=>{
 const f=await helperLearningScene(),raw=serializeWorld(f.w),copy=deserializeWorld(raw),decisions:{on:number;off:number;tick:number}[]=[];
 const restore=setExternalController({controls:(_w,p)=>p.id===f.ada.id,choose:(w,p,ctx,ranked)=>{
  const asks=ranked.filter(o=>o.kind==='socialize'&&o.label.endsWith('for stone'));
  if(asks.length){const before=serializeWorld(w);setHelperLearning(false);const off=rankOptions(generateOptions(w,p,true,true)).find(o=>o.kind==='socialize'&&o.label.endsWith('for stone'));setHelperLearning(true);expect(serializeWorld(w)).toBe(before);decisions.push({on:asks[0].targetId,off:off!.targetId,tick:w.tick});expect(asks[0].selectionReason).toContain('request #22');}
  const chosen=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??asks[0]??ranked.find(o=>o.kind==='craft')??ranked[0];return {kind:'pick',key:chosen.key};
 }});
 try{while(f.w.tick<3000){stepWorld(f.w);stepWorld(copy);}}finally{restore();}
 expect(decisions.some(d=>d.on===f.ben.id&&d.off===f.cora.id&&d.tick===2281)).toBe(true);expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 const later=f.w.requests.find(r=>r.id!==f.receipt.requestId&&r.from===f.ada.id&&r.to===f.ben.id&&r.kind==='stone');expect(later?.status).toBe('declined');expect(later?.note).toBe('making');expect(later?.helperReceipt).toBeUndefined();expect(helperExperience(f.w,f.ada,f.ben.id,'stone','stone').bonus).toBe(3);expect(conservationReport(f.w).ok).toBe(true);
});

it('keeps unavailable tasks unknown and preserves rules 77 and the isolated removal',async()=>{
 const old=await helperLearningScene(77);expect(old.receipt.task).toBeUndefined();expect(describeHelperTask(old.receipt.task)).toContain('not recorded');
 setHelperLearning(false);const off=await helperLearningScene();expect(off.receipt.task).toBeUndefined();expect(helperExperience(off.w,off.ada,off.ben.id,'stone','stone').bonus).toBe(0);
});

it('bounds evidence, declines to generalise tasks, and never treats a refusal as inability',()=>{
 // Unit fixture only: synthetic receipts isolate choice/retention boundaries; physical evidence is tested above.
 const {w,ada,ben,cora}=projectHelperScene(78);const t=w.tick;
 const m={requestId:999,otherId:cora.id,siteId:0,tick:t,outcome:'partial',reason:'one unit received',role:'asker' as const,task:{kind:'stone' as const,item:'stone' as const,asked:3,offered:1,receipt:{item:'stone' as const,amount:1,tick:t,eventKind:'activity' as const,eventId:998}}};
 ada.socialMemory=[m,{...structuredClone(m),requestId:999}];expect(helperExperience(w,ada,cora.id,'stone','stone').bonus).toBe(3);
 const ask=()=>generateOptions(w,ada,true,true).options.find(o=>o.key.endsWith(':plan:stone'));
 expect(ask()?.targetId).toBe(cora.id);setHelperLearning(false);expect(ask()?.targetId).toBe(ben.id);setHelperLearning(true);
 ada.socialMemory.push({...structuredClone(m),requestId:1000});expect(helperExperience(w,ada,cora.id,'stone','stone').bonus).toBe(3);
 for(let n=0;n<5;n++){const extra=structuredClone(m);extra.requestId=2000+n;extra.task.receipt.eventId=3000+n;ada.socialMemory.push(extra);}expect(helperExperience(w,ada,cora.id,'stone','stone').bonus).toBe(6);
 w.tick+=5*DAY;expect(helperExperience(w,ada,cora.id,'stone','stone').bonus).toBe(3);w.tick+=8*DAY;expect(helperExperience(w,ada,cora.id,'stone','stone').bonus).toBe(0);
 ada.socialMemory=[{...m,outcome:'declined',reason:'own need',task:{kind:'stone',item:'stone',asked:3}}];expect(helperExperience(w,ada,cora.id,'stone','stone')).toEqual({bonus:0,reason:''});
});

it.each(['future','wrong item','old rules','unreceived'] as const)('rejects malformed helper receipt saves: %s',async kind=>{
 const f=await helperLearningScene(),r=f.w.requests.find(r=>r.id===f.receipt.requestId)!;
 if(kind==='future')r.helperReceipt!.tick=f.w.tick+1;if(kind==='wrong item')(r.helperReceipt as any).item='invented';if(kind==='old rules')f.w.settings.rulesVersion=77;if(kind==='unreceived')r.helperReceipt!.amount=(r.delivered??0)+1;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/helper/i);
});
