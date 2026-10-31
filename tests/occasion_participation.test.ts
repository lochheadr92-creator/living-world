import {afterEach,expect,it} from 'vitest';
import {occasionParticipationScene} from './helpers/occasion_participation';
import {generateOptions,reviewActivity} from '../src/sim/decision';
import {setOccasionParticipation} from '../src/sim/occasion_participation';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
afterEach(()=>setOccasionParticipation(true));
it('keeps a physically admitted, unfinished guest in the choices used for review',()=>{
 const {w,p,o,a}=occasionParticipationScene();
 expect(o.attended).toContain(p.id);
 expect(generateOptions(w,p,true,true).options.some(x=>x.key===a.data.optKey)).toBe(true);
 w.tick=a.minCommit+1;reviewActivity(w,p);expect(p.activity?.id).toBe(a.id);
});
it('finishes real participation across a save without a second admission or reward',()=>{
 const {w,p,o,a}=occasionParticipationScene(),before=serializeWorld(w),copy=deserializeWorld(before);
 expect(generateOptions(w,p,true,true).options.find(x=>x.key===a.data.optKey)?.label).toContain('Stay at the feast');
 expect(serializeWorld(w)).toBe(before);
 const endings:string[]=[];w.hooks={onActivityEnd:(_p,act,result)=>{if(act.id===a.id)endings.push(result);}};
 for(let n=0;n<300;n++){stepWorld(w);stepWorld(copy);}delete w.hooks;
 expect(endings).toEqual(['success']);expect(o.attended.filter(id=>id===p.id)).toHaveLength(1);
 expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(conservationReport(w).ok).toBe(true);
 expect(generateOptions(w,p,true,true).options.some(x=>x.key===a.data.optKey)).toBe(false);
});
it.each(['old','removed'] as const)('preserves the earlier missing-current-choice result with %s rules',mode=>{
 const {w,p,a}=occasionParticipationScene(mode==='old'?110:undefined);
 if(mode==='removed')setOccasionParticipation(false);
 expect(generateOptions(w,p,true,true).options.some(x=>x.key===a.data.optKey)).toBe(false);
 w.tick=a.minCommit+1;reviewActivity(w,p);expect(p.activity?.id).not.toBe(a.id);
});
it.each(['closed','left','ended'] as const)('does not turn past attendance into a new visit when %s',reason=>{
 const {w,p,o,a}=occasionParticipationScene();if(reason==='closed')o.status='done';if(reason==='left')p.x+=20;if(reason==='ended')a.progress=a.duration;
 expect(generateOptions(w,p,true,true).options.some(x=>x.key===a.data.optKey)).toBe(false);
});
it('still yields immediately to critical thirst',()=>{
 const {w,p,a}=occasionParticipationScene();p.needs.thirst=1;reviewActivity(w,p);
 expect(p.activity?.id).not.toBe(a.id);expect(p.activity?.need).toBe('thirst');
});
it('still permits a stronger noncritical need after commitment',()=>{
 const {w,p,a}=occasionParticipationScene();w.tick=a.minCommit+1;p.needs.hunger=25;
 expect(generateOptions(w,p,true,true).criticals).toEqual([]);reviewActivity(w,p);
 expect(p.activity?.id).not.toBe(a.id);expect(p.activity?.need).toBe('hunger');
});
