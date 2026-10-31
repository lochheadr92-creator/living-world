import {afterEach,expect,it} from 'vitest';
import {occasionParticipationScene} from './helpers/occasion_participation';
import {stepWorld} from '../src/sim/world';
import {suspendActivity,resumeSuspended} from '../src/sim/activities';
import {occasionConversationScene} from './helpers/occasion_recovery';
import {setOccasionRecovery} from '../src/sim/occasion_recovery';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {reviewActivity} from '../src/sim/decision';
afterEach(()=>setOccasionRecovery(true));
it('resumes the same admitted gathering with the time already spent preserved',()=>{
 const {w,p,a}=occasionParticipationScene();for(let n=0;n<30;n++)stepWorld(w);const paid=a.progress;
 suspendActivity(w,p);expect(resumeSuspended(w,p)).toBe(true);
 expect(p.activity?.id).toBe(a.id);expect(p.activity?.progress).toBe(paid);
});
it('an actual accepted conversation pauses, saves, resumes and finishes one visit',()=>{
 const f=occasionConversationScene(),{w,p,o,a}=f,raw=serializeWorld(w),copy=deserializeWorld(raw),endings:string[]=[];let resumed=false;
 expect(f.paid).toBeGreaterThan(0);const deadline=a.expire;
 w.hooks={onActivityEnd:(_p,act,result)=>{if(act.id===a.id)endings.push(result);}};
 for(let n=0;n<500&&!endings.length;n++){
  if(p.suspended?.id===a.id)expect(p.suspended.progress).toBe(f.paid);
  stepWorld(w);stepWorld(copy);if(p.activity?.id===a.id){resumed=true;expect(a.progress).toBeGreaterThanOrEqual(f.paid);}
 }
 delete w.hooks;expect(resumed).toBe(true);expect(endings).toEqual(['success']);expect(a.expire).toBe(deadline);
 expect(o.attended.filter(id=>id===p.id)).toHaveLength(1);expect(serializeWorld(w)).toBe(serializeWorld(copy));
 expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
it.each(['old','removed'] as const)('preserves the prior discarded suspension with %s rules',mode=>{
 const {w,p}=occasionParticipationScene(mode==='old'?111:undefined);if(mode==='removed')setOccasionRecovery(false);
 for(let n=0;n<30;n++)stepWorld(w);suspendActivity(w,p);expect(p.suspended?.progress).toBe(0);expect(resumeSuspended(w,p)).toBe(false);expect(p.activity).toBeNull();
});
it.each(['closed','place gone','moved','expired'] as const)('ends a paused visit with a recorded reason when %s',why=>{
 const {w,p,o,a}=occasionParticipationScene();for(let n=0;n<30;n++)stepWorld(w);suspendActivity(w,p);
 if(why==='closed')o.status='done';if(why==='place gone')(w.byId.get(o.placeId) as any).condition=0;if(why==='moved')p.x+=20;if(why==='expired')w.tick=a.expire+1;
 const endings:string[]=[];w.hooks={onActivityEnd:(_p,act,result)=>{if(act.id===a.id)endings.push(result);}};
 expect(resumeSuspended(w,p)).toBe(false);expect(p.activity).toBeNull();expect(p.suspended).toBeNull();expect(endings).toEqual(['interrupted']);expect(p.lastResult?.detail).toBeTruthy();
});
it('retains an early guest waiting for the opening without adding participation time',()=>{
 const {w,p,o,a}=occasionParticipationScene();o.attended=[];o.status='called';o.at=100;a.progress=0;
 suspendActivity(w,p);w.tick=50;expect(resumeSuspended(w,p)).toBe(true);expect(a.progress).toBe(0);expect(o.attended).toEqual([]);
});
it('a resumed visit still yields to critical thirst',()=>{
 const {w,p,a}=occasionParticipationScene();suspendActivity(w,p);p.needs.thirst=1;expect(resumeSuspended(w,p)).toBe(true);reviewActivity(w,p);expect(p.activity?.id).not.toBe(a.id);expect(p.activity?.need).toBe('thirst');
});
it('an urgent need that cuts a real conversation short also records the interrupted visit',()=>{
 const {w,p,a}=occasionConversationScene(),ended:string[]=[];p.needs.thirst=1;
 w.hooks={onActivityEnd:(_p,act,result)=>{if(act.id===a.id)ended.push(result);}};
 for(let n=0;n<80&&p.activity?.need!=='thirst';n++)stepWorld(w);
 expect(p.activity?.need).toBe('thirst');expect(ended).toEqual(['interrupted']);
});
