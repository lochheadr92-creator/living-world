import {afterEach,expect,it} from 'vitest';
import {dailyRoutineScene} from './helpers/daily_routine';
import {recordRoutine,routineReason,setRoutines,tiltRoutineChoices} from '../src/sim/daily_routines';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {consume,ledgerConsume,conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import {stepWorld,hashWorld} from '../src/sim/world';
import {delBelief,isWaterBeliefId} from '../src/sim/knowledge';
import {relOf} from '../src/sim/relations';
import {addPerson} from './helpers/kit';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {createPlot} from '../src/sim/farming';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
afterEach(()=>setRoutines(true));
it('earns a bounded morning preference from real completed trips on distinct days with exact saved continuation',()=>{
 const f=dailyRoutineScene();for(let d=0;d<3;d++)f.practice(d);
 const e=f.p.dailyRoutines?.entries.find(e=>e.key===f.key);expect(e).toBeDefined();expect(e!.episodes.length).toBe(3);expect(new Set(e!.episodes.map(e=>e.day)).size).toBe(3);expect(routineReason(f.w,f.p,e!)).toBe('');
 expect(e!.episodes.every(e=>e.took>0)).toBe(true);expect(f.a.amount).toBeLessThan(6);
});
it('does not count a repeated callback or several trips on one day as several successful days',()=>{
 const f=dailyRoutineScene(),a=f.practice(0),saved=serializeWorld(f.w);recordRoutine(f.w,f.p,a,'success','done');expect(serializeWorld(f.w)).toBe(saved);
 f.practice(0);expect(f.p.dailyRoutines!.entries.find(e=>e.key===f.key)!.episodes.length).toBe(1);
});
it('changes an autonomous legal decision under otherwise matched circumstances for a recorded personal reason',()=>{
 const f=dailyRoutineScene();for(let d=0;d<3;d++)f.practice(d);
 consume(f.w,f.p.inv,'wood',f.p.inv.wood??0,'staged use after practice');f.p.x=40;f.p.y=40;
 const learned=f.p.dailyRoutines;let found=false;
 for(let offset=0;offset<480;offset+=32){
  f.w.tick=3*DAY+offset;f.p.dailyRoutines=undefined;const before=rankOptions(generateOptions(f.w,f.p,true,true));f.p.dailyRoutines=learned;
  const after=rankOptions(generateOptions(f.w,f.p,true,true));
  if(before[0]?.key!==f.key&&after[0]?.key===f.key){found=true;expect(after[0].routineReason).toContain('3 successful days');break;}
 }
 expect(found).toBe(true);
 f.p.nextThink=f.w.tick;const control=deserializeWorld(serializeWorld(f.w)),q=control.persons.find(p=>p.id===f.p.id)!;delete q.dailyRoutines;
 stepWorld(f.w);stepWorld(control);expect(f.p.activity?.targetId).toBe(f.a.id);expect(q.activity?.targetId).not.toBe(f.a.id);expect(f.p.lastDecision?.because).toContain('learned morning preference');
});
it.each(['season','injury','home','dependant','contact','known loss','age','phase','urgent','cost'] as const)('suppresses the preference after %s changes, without observer mutation',why=>{
 const f=dailyRoutineScene();for(let d=0;d<3;d++)f.practice(d);consume(f.w,f.p.inv,'wood',f.p.inv.wood??0,'staged use');
 if(why==='season')f.w.tick=9*DAY;
 if(why==='injury')f.p.injury={kind:'sprain',since:f.w.tick,until:f.w.tick+DAY,how:'staged injury'};
 if(why==='home')delBelief(f.p,f.home.id);
 if(why==='dependant')f.p.children.push(999);
 if(why==='contact'){const r=relOf(f.p,999);r.kin='sibling';r.lastMet=f.w.tick;}
 if(why==='known loss'){const r=relOf(f.p,999);r.kin='sibling';r.deathKnown={learned:f.w.tick,source:'told',via:998};}
 if(why==='age')f.w.tick+=12*DAY;
 if(why==='phase')f.w.tick+=DAY/2;
 if(why==='urgent')f.p.needs.thirst=5;
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
 if(why==='cost')for(const o of ctx.options)o.eta=1e6; // unit contract for a newly expensive legal candidate
 const ranked=rankOptions(ctx);expect(ranked.every(o=>!o.routineReason)).toBe(true);observeInhabitant(f.w,f.p,ctx,ranked);describePerson(f.w,f.p.id);expect(serializeWorld(f.w)).toBe(before);
});
it('does not react to an unseen household member or their private need',()=>{
 const f=dailyRoutineScene();for(let d=0;d<3;d++)f.practice(d);const e=f.p.dailyRoutines!.entries.find(e=>e.key===f.key)!;
 const stranger=addPerson(f.s,'Unseen child',70,70,{hh:f.p.hhId,age:4});stranger.needs.thirst=1;expect(routineReason(f.w,f.p,e)).toBe('');
});
it('records actual failure on a depleted trip and stops reinforcing that preference',()=>{
 const f=dailyRoutineScene();for(let d=0;d<3;d++)f.practice(d);consume(f.w,f.p.inv,'wood',f.p.inv.wood??0,'staged use');f.p.x=40;f.p.y=40;f.w.tick=3*DAY;
 const chosen=selectPrerequisite(f.w,f.p,f.key);ledgerConsume(f.w,'wood',f.a.amount,'staged source loss');f.a.amount=0;
 try{for(let n=0;n<500&&f.p.activity?.id===chosen.act.id;n++)stepWorld(f.w);}finally{chosen.restore();}
 expect(f.p.lastResult?.outcome).toBe('failed');const e=f.p.dailyRoutines!.entries.find(e=>e.key===f.key)!;expect(e.failures).toBe(1);expect(e.episodes.length).toBe(3);expect(routineReason(f.w,f.p,e)).toContain('failed');expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['old','removed'] as const)('learns nothing when %s',why=>{
 if(why==='removed')setRoutines(false);const f=dailyRoutineScene(why==='old'?69:70);f.practice(0);expect(f.p.dailyRoutines).toBeUndefined();
});
it.each(['duplicate event','duplicate day','too many entries','old rules','bad cost','future episode'] as const)('rejects persisted %s',why=>{
 const f=dailyRoutineScene();for(let d=0;d<3;d++)f.practice(d);const e=f.p.dailyRoutines!.entries[0];
 if(why==='duplicate event')e.episodes[1].id=e.episodes[0].id;
 if(why==='duplicate day')e.episodes[1].day=e.episodes[0].day;
 if(why==='too many entries')f.p.dailyRoutines!.entries=Array(9).fill(e);
 if(why==='old rules')f.w.settings.rulesVersion=69;
 if(why==='bad cost')e.episodes[0].eta=Infinity;
 if(why==='future episode')e.episodes[0].tick=f.w.tick+1;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/daily/i);
});
it('learns actual water collection and preserves its dedicated water-belief ID through a save',()=>{
 const f=dailyRoutineScene();consume(f.w,f.p.inv,'water',3,'staged use before collecting');f.p.x=40;f.p.y=16;
 const plot=createPlot(f.w,44,18,f.p.hhId);plot.state='growing';observe(f.w,f.p,plot);
 perceive(f.w,f.p);
 const chosen=selectPrerequisite(f.w,f.p,'fetch_water');
 try{expect(isWaterBeliefId(chosen.act.targetId)).toBe(true);const copy=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<700&&f.p.activity?.id===chosen.act.id;n++){stepWorld(f.w);stepWorld(copy);}
  expect(f.p.lastResult?.outcome).toBe('success');expect(f.p.dailyRoutines?.entries.some(e=>e.kind==='fetch_water'&&e.episodes.length===1)).toBe(true);
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
 }finally{chosen.restore();}
});
it('fingerprints an in-progress learning snapshot as well as completed preferences',()=>{
 const f=dailyRoutineScene(),chosen=selectPrerequisite(f.w,f.p,f.key);chosen.restore();const before=hashWorld(f.w);
 chosen.act.data.dailyRoutine.eta+=1;expect(hashWorld(f.w)).not.toBe(before);
});
