import {afterEach,expect,it} from 'vitest';
import {updateConversations} from '../src/sim/social';
import {techniqueFixture} from './helpers/technique';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {LESSON_TICKS,setTechniques,knowsCharcoal} from '../src/sim/techniques';
import {startBlocker,startJob,joinBlocker,workJob} from '../src/sim/facilities';
import {RECIPE_BY_ID} from '../src/sim/recipes';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {startActivity,abortActivity} from '../src/sim/activities';
import {killPerson,giveBirth} from '../src/sim/lifecycle';
import {conservationReport} from '../src/sim/economy';
import {describePerson} from '../src/sim/inspect';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {parseIntervention} from '../scripts/lab/lab';
const charcoal=RECIPE_BY_ID.burn_charcoal;
afterEach(()=>setTechniques(true));
it('historical initial adult competence is universal; newborns do not inherit techniques or gain them by a birthday',()=>{
 const w=createWorld({...currentWorldSettings('normal','techniques',{immigration:false}),rulesVersion:43});
 expect(w.persons.filter(p=>p.techniques?.charcoal).length).toBeGreaterThan(15);
 const m=w.persons.find(p=>p.sex==='f')!;giveBirth(w,m);const child=w.persons.at(-1)!;
 expect(child.techniques).toEqual({});const before=serializeWorld(w);describePerson(w,child.id);expect(serializeWorld(w)).toBe(before);
});
it('high kiln proficiency cannot bypass the technique at planning, starting, joining or work',()=>{
 const {w,a,b,kiln}=techniqueFixture();b.skills.kiln=1.8;
 expect(startBlocker(w,kiln,b,charcoal)).toBe('has not learned charcoal firing');
 expect(generateOptions(w,b,true,true).blocked.some(o=>o.blocked?.includes('has not learned charcoal'))).toBe(true);
 const before=serializeWorld(w);expect(startJob(w,kiln,b,charcoal,b.id,'test')).not.toBeNull();expect(serializeWorld(w)).toBe(before);
 expect(startJob(w,kiln,a,charcoal,a.id,'test')).toBeNull();expect(joinBlocker(w,kiln,b)).toBe('has not learned charcoal firing');
 const progress=kiln.ops!.job!.progress;expect(workJob(w,kiln,b)).toBe('stopped');expect(kiln.ops!.job!.progress).toBe(progress);
});
it('a real accepted lesson requires contact and time, saves midway, and enables physical charcoal production',()=>{
 const f=techniqueFixture(),{w,a,b,kiln}=f;const skill=b.skills.kiln;
 const c=f.reachLesson();expect(c?.lesson?.outcome).toBe('learning');expect(b.techniques).toEqual({});
 for(let i=0;i<80;i++)stepWorld(w);expect(b.techniques).toEqual({});
 const beforeView=serializeWorld(w);expect(describePerson(w,b.id)!.activity!.progress).toBeCloseTo(81/180);expect(serializeWorld(w)).toBe(beforeView);
 const loaded=deserializeWorld(serializeWorld(w));
 for(let i=0;i<200&&b.convId;i++){stepWorld(w);stepWorld(loaded);}
 expect(serializeWorld(w)).toBe(serializeWorld(loaded));expect(b.techniques?.charcoal).toMatchObject({source:'taught',teacher:a.id,lesson:c!.id});
 expect(b.techniques!.charcoal!.learned-b.techniques!.charcoal!.started!).toBe(LESSON_TICKS);expect(b.skills.kiln).toBe(skill);
 f.hold();b.cooldowns.pause=0;
 const op=rankOptions(generateOptions(w,b,true,true)).find(o=>o.kind==='operate'&&o.targetId===kiln.id&&o.label==='Burning charcoal');
 expect(op?.make).toBeDefined();startActivity(w,b,op!.make!()!);
 for(let i=0;i<1400&&(kiln.store.items.charcoal??0)<3;i++)stepWorld(w);
 expect(kiln.store.items.charcoal).toBe(3);expect(kiln.store.items.wood??0).toBe(0);expect(conservationReport(w).ok).toBe(true);expect(b.skills.kiln).toBeGreaterThan(skill);
});
it.each(['separate','wall','sleep','need','death'] as const)('%s during instruction leaves no invented knowledge',reason=>{
 const f=techniqueFixture(),{w,a,b}=f;expect(f.reachLesson()?.lesson?.outcome).toBe('learning');
 if(reason==='separate')b.x=70;if(reason==='wall')b.indoors=123;if(reason==='sleep')b.pose='sleep';if(reason==='need')b.needs.thirst=1;if(reason==='death')killPerson(w,a,'injuries');
 // Validate the director boundary before normal pose/interior normalisation changes these staged states.
 updateConversations(w);
 for(let i=0;i<200;i++)stepWorld(w);
 expect(b.techniques).toEqual({});expect(b.lastInteraction?.outcome).toBe('interrupted');
});
it('the learner can refuse the real offer for distrust, and it has no learning cost or grant',()=>{
 const f=techniqueFixture(),{w,a,b}=f;b.relations[a.id].trust=-50;
 const c=f.reachLesson();expect(c?.lesson?.outcome).toBe('declined');
 for(let i=0;i<100&&b.convId;i++)stepWorld(w);
 expect(b.techniques).toEqual({});expect(b.lastInteraction?.detail).toContain('does not want instruction');
});
it('a dead sole teacher leaves a real knowledge gap; learned knowledge remains with a survivor',()=>{
 const f=techniqueFixture(),{w,a,b,kiln}=f;killPerson(w,a,'injuries');expect(startBlocker(w,kiln,b,charcoal)).toContain('has not learned');expect(a.techniques?.charcoal).toBeDefined();
 const g=techniqueFixture();g.reachLesson();for(let i=0;i<240&&g.b.convId;i++)stepWorld(g.w);killPerson(g.w,g.a,'injuries');
 expect(knowsCharcoal(g.w,g.b)).toBe(true);expect(g.b.techniques?.charcoal?.teacher).toBe(g.a.id);
});
it('observer options and knowledge history are pure, including after loading mid-lesson',()=>{
 const f=techniqueFixture();f.reachLesson();const w=deserializeWorld(serializeWorld(f.w)),before=serializeWorld(w);
 for(const p of w.persons){describePerson(w,p.id);generateOptions(w,p,true,true);}expect(serializeWorld(w)).toBe(before);
});
it('historical rules and the lab ablation retain universal recipe access without rewriting holders',()=>{
 const {w,b,kiln}=techniqueFixture();w.settings.rulesVersion=17;expect(startBlocker(w,kiln,b,charcoal)).toBe('');w.settings.rulesVersion=18;
 const restore=parseIntervention('rich-universal-techniques').install!();try{expect(startBlocker(w,kiln,b,charcoal)).toBe('');expect(b.techniques).toEqual({});}finally{restore();}
 expect(startBlocker(w,kiln,b,charcoal)).toContain('has not learned');
});
