import {afterEach,expect,it} from 'vitest';
import {careHandbackScene} from './helpers/care_handback';
import {setCareHandback,answerCareReturn,proposeCareReturn} from '../src/sim/care_handback';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld,hashWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {startActivity,suspendActivity,resumeSuspended} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {abortConversationFor} from '../src/sim/social';
afterEach(()=>setCareHandback(true));
const memory=(f:ReturnType<typeof careHandbackScene>)=>f.parent.socialMemory!.find(m=>m.task?.kind==='watch')!;
function proposed(){const f=careHandbackScene(),o=generateOptions(f.w,f.parent,true,true).options.find(o=>o.goal.includes('handback'))!;startActivity(f.w,f.parent,o.make!()!);for(let n=0;n<100&&memory(f).careHandback?.state!=='proposed';n++)stepWorld(f.w);expect(memory(f).careHandback?.state).toBe('proposed');return f;}
it('a naturally recovered parent autonomously agrees a safe return without claiming a complete watch',()=>{
 const f=careHandbackScene();expect(f.parent.injury).toBeUndefined();expect(f.helper.activity?.data.watch).toBe(true);const paid=f.helper.activity!.data.watchedTicks;
 const saved=serializeWorld(f.w),offers=generateOptions(f.w,f.parent,true,true).options;expect(offers.some(o=>o.goal.includes('handback'))).toBe(true);expect(serializeWorld(f.w)).toBe(saved);const twin=deserializeWorld(saved);
 for(let n=0;n<220&&memory(f).careHandback?.state!=='accepted';n++){stepWorld(f.w);stepWorld(twin);}
 expect(memory(f).careHandback,JSON.stringify({last:f.parent.lastResult,activity:f.parent.activity,c:f.helper.commitments})).toMatchObject({state:'accepted',childId:f.child.id});
 expect(memory(f).careHandback!.watchedTicks).toBeGreaterThanOrEqual(paid);expect(f.helper.commitments.find(c=>c.milestone==='watched')).toMatchObject({status:'cancelled'});expect(f.helper.commitments.find(c=>c.milestone==='watched')?.contrib??0).toBe(0);expect(f.helper.suspended?.data.watch).toBeUndefined();
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['legacy','ablation'])('retains historical lack of handback under %s',mode=>{
 if(mode==='ablation')setCareHandback(false);const f=careHandbackScene(mode==='legacy'?96:97);expect(generateOptions(f.w,f.parent,true,true).options.some(o=>o.goal.includes('handback'))).toBe(false);
});
it('paid watch time survives pause, save and re-arrival; talking and travel add no time',()=>{
 const f=careHandbackScene(),paid=f.helper.activity!.data.watchedTicks;suspendActivity(f.w,f.helper);const before=hashWorld(f.w);f.helper.suspended!.data.watchedTicks++;expect(hashWorld(f.w)).not.toBe(before);f.helper.suspended!.data.watchedTicks--;
 const twin=deserializeWorld(serializeWorld(f.w)),other=twin.persons.find(p=>p.id===f.helper.id)!;expect(resumeSuspended(f.w,f.helper)).toBe(true);expect(resumeSuspended(twin,other)).toBe(true);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<8;n++){stepWorld(f.w);stepWorld(twin);}}finally{release();}
 expect(f.helper.activity!.data.watchedTicks).toBe(paid+8);expect(f.helper.activity!.progress).toBe(paid+8);expect(f.helper.activity!.duration).toBe(300);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('renewed incapacity before the answer refuses handback and resumes the same paid watch',()=>{
 const f=careHandbackScene(),o=generateOptions(f.w,f.parent,true,true).options.find(o=>o.goal.includes('handback'))!;startActivity(f.w,f.parent,o.make!()!);
 for(let n=0;n<100&&memory(f).careHandback?.state!=='proposed';n++)stepWorld(f.w);expect(memory(f).careHandback?.state).toBe('proposed');const paid=f.helper.suspended!.data.watchedTicks;
 f.parent.injury={kind:'sprain',since:f.w.tick,until:f.w.tick+600,how:'declared new injury after proposal'};const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<100&&(f.parent.convId||memory(f).careHandback?.state==='proposed');n++){stepWorld(f.w);stepWorld(twin);}
 expect(memory(f).careHandback?.state).toBe('refused');expect(f.helper.commitments.find(c=>c.milestone==='watched')?.status).toBe('active');expect(f.helper.activity?.data.watchedTicks??f.helper.suspended?.data.watchedTicks).toBeGreaterThanOrEqual(paid);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('an interrupted proposal does not transfer responsibility or erase the suspended watch',()=>{
 const f=careHandbackScene(),o=generateOptions(f.w,f.parent,true,true).options.find(o=>o.goal.includes('handback'))!;startActivity(f.w,f.parent,o.make!()!);for(let n=0;n<100&&memory(f).careHandback?.state!=='proposed';n++)stepWorld(f.w);
 const paid=f.helper.suspended!.data.watchedTicks;abortConversationFor(f.w,f.parent);expect(memory(f).careHandback?.state).toBe('proposed');expect(f.helper.commitments.find(c=>c.milestone==='watched')?.status).toBe('active');expect(f.helper.activity?.data.watchedTicks??f.helper.suspended?.data.watchedTicks).toBe(paid);expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it('a competing conversation with the child can prevent the parent from proposing; it does not end the watch',()=>{
 const f=careHandbackScene(97,'finished'),events:string[]=[];f.w.hooks={onActivityEnd:(p,a,outcome,detail)=>{if(p.id===f.parent.id&&a.data.purpose==='return_care')events.push(detail);}};
 const o=generateOptions(f.w,f.parent,true,true).options.find(o=>o.goal.includes('handback'))!;startActivity(f.w,f.parent,o.make!()!);for(let n=0;n<100;n++)stepWorld(f.w);
 expect(memory(f).careHandback).toBeUndefined();expect(events.some(s=>s.includes('already talking'))).toBe(true);expect(f.helper.commitments.find(c=>c.milestone==='watched')?.status).toBe('active');expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['away','other room','dead'])('refuses when the child is %s at the actual answer',mode=>{
 const f=proposed(),h=memory(f).careHandback!;if(mode==='away')f.child.x+=20;else if(mode==='other room')f.child.indoors=999;else f.child.alive=false;
 expect(answerCareReturn(f.w,f.parent,f.helper,memory(f).requestId,h.conversationId)).toContain('Not yet');expect(h.state).toBe('refused');expect(f.helper.commitments.find(c=>c.milestone==='watched')?.status).toBe('active');expect(f.helper.suspended?.data.watch).toBe(true);
});
it.each(['parent absent','helper dead'])('cannot communicate with %s',mode=>{
 const f=proposed(),h=memory(f).careHandback!;if(mode==='parent absent')f.parent.x+=20;else f.helper.alive=false;
 expect(answerCareReturn(f.w,f.parent,f.helper,memory(f).requestId,h.conversationId)).toBeNull();expect(h.state).toBe('proposed');expect(f.helper.commitments.find(c=>c.milestone==='watched')?.status).toBe('active');
});
it('a stale request learns that the exact watch already ended without creating completion credit',()=>{
 const f=proposed(),h=memory(f).careHandback!,c=f.helper.commitments.find(c=>c.milestone==='watched')!;c.status='cancelled';c.reason='declared independently cancelled watch';
 expect(answerCareReturn(f.w,f.parent,f.helper,memory(f).requestId,h.conversationId)).toContain('already ended');expect(h.state).toBe('already ended');expect(memory(f).expectation?.source).toBe('helper report');expect(c.contrib??0).toBe(0);expect(memory(f).completion).toBeUndefined();expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it('a reply cannot clear unrelated suspended work or settle another obligation',()=>{
 const f=proposed(),h=memory(f).careHandback!,held=f.helper.suspended!;held.data.commitmentId+=1000;const before=structuredClone(held);
 answerCareReturn(f.w,f.parent,f.helper,memory(f).requestId,h.conversationId);expect(h.state).toBe('accepted');expect(f.helper.suspended).toEqual(before);expect(h.watchedTicks).toBeUndefined();
});
it('remote recovery alone neither informs the helper nor stops paid childcare',()=>{
 const f=careHandbackScene();f.parent.x+=30;const paid=f.helper.activity!.data.watchedTicks,release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<8;n++)stepWorld(f.w);}finally{release();}
 expect(proposeCareReturn(f.w,f.parent,f.helper,memory(f).requestId,1000)).toBeNull();expect(memory(f).careHandback).toBeUndefined();expect(f.helper.activity!.data.watchedTicks).toBe(paid+8);expect(f.helper.commitments.find(c=>c.milestone==='watched')?.status).toBe('active');
});
it('an interrupted discussion resumes and completes only the remaining physical watch time',()=>{
 const f=proposed(),paid=f.helper.suspended!.data.watchedTicks;abortConversationFor(f.w,f.parent);const twin=deserializeWorld(serializeWorld(f.w)),c=f.helper.commitments.find(c=>c.milestone==='watched')!;
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<300-paid-1;n++){stepWorld(f.w);stepWorld(twin);}expect(c.status).toBe('active');expect(f.helper.activity?.data.watchedTicks).toBe(299);stepWorld(f.w);stepWorld(twin);expect(c.status).toBe('done');expect(c.contrib).toBe(40);for(let n=0;n<20;n++){stepWorld(f.w);stepWorld(twin);}}finally{release();}
 expect(c.contrib).toBe(40);expect(memory(f).careHandback?.state).toBe('proposed');expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['future','negative progress','wrong child','premature answer','legacy'])('rejects malformed childcare state: %s',mode=>{
 const f=proposed(),h=memory(f).careHandback!;if(mode==='future')h.proposedAt=f.w.tick+1;else if(mode==='negative progress')f.helper.suspended!.data.watchedTicks=-1;else if(mode==='wrong child')h.childId+=1000;else if(mode==='premature answer')h.answeredAt=f.w.tick;else f.w.settings.rulesVersion=96;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow();
});
