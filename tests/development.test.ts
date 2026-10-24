import { afterEach, expect, it } from 'vitest';
import { stage, addPerson, done, pin } from './helpers/kit';
import { giveBirth } from '../src/sim/lifecycle';
import { setDevelopment, initialSkills } from '../src/sim/development';
import { createPerson, makeSkills } from '../src/sim/people';
import { RNG } from '../src/sim/rng';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson } from '../src/sim/inspect';
import { stepWorld } from '../src/sim/world';
import { abortActivity } from '../src/sim/activities';
import { conservationReport } from '../src/sim/economy';
import { parseIntervention } from '../scripts/lab/lab';
import { practiceFixture } from './helpers/development';
afterEach(()=>setDevelopment(true));
function birth(version=17){
 const s=stage('newborn-skills');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;s.w.birthCount=0;
 const mother=addPerson(s,'Ada',40,40);done(s);giveBirth(s.w,mother);
 return {w:s.w,baby:s.w.persons.at(-1)!,mother};
}
it('a real birth starts every proficiency at novice, without inherited adult skills',()=>{
 const {w,baby,mother}=birth();expect(Object.values(baby.skills)).toEqual(Array(11).fill(0.2));
 expect(Object.values(mother.skills).every(n=>n>0.7)).toBe(true);expect(baby.parents).toContain(mother.id);
 const before=serializeWorld(w);expect(describePerson(w,baby.id)!.skillExplanation).toContain('birthdays grant no experience');
 expect(serializeWorld(w)).toBe(before);expect(serializeWorld(deserializeWorld(before))).toBe(before);
});
it('historical births and the ablation retain adult skills, with identical RNG use',()=>{
 const old=birth(16);setDevelopment(false);const off=birth();setDevelopment(true);const now=birth();
 expect(off.baby.skills).toEqual(old.baby.skills);expect(Object.values(old.baby.skills).every(n=>n>0.7)).toBe(true);
 expect(now.w.rng).toEqual(off.w.rng);expect(now.baby.look).toEqual(off.baby.look);
 expect(now.baby.traits).toEqual(off.baby.traits);
});
it('age scales only initial background; adult creation is unchanged, not repeatedly recalculated',()=>{
 const {w}=birth();const traits=w.persons[0].traits,draw=makeSkills(new RNG(5),traits);
 expect(initialSkills(w,16,draw)).toEqual(draw);expect(initialSkills(w,70,draw)).toEqual(draw);
 const young=initialSkills(w,8,draw);expect(young.forage).toBeCloseTo(0.2+(draw.forage-0.2)/2);
 const args={name:'Ben',sex:'m' as const,age:28,hhId:1,x:50,y:50};
 const a=createPerson(w,new RNG(12),args);setDevelopment(false);const b=createPerson(w,new RNG(12),args);
 expect(a.skills).toEqual(b.skills);
});
it('actual completed gathering improves only the practised skill with conserved goods and mid-work save continuity',()=>{
 const {w,p,begin}=practiceFixture(),before={...p.skills};begin();
 for(let i=0;i<12;i++)stepWorld(w);expect(p.skills).toEqual(before);expect(p.activity).not.toBeNull();
 const loaded=deserializeWorld(serializeWorld(w));
 for(let i=0;i<1000&&p.stats.gathered<3;i++){stepWorld(w);stepWorld(loaded);}
 expect(p.stats.gathered).toBe(3);expect(p.skills.forage).toBeCloseTo(before.forage+0.012);
 expect(p.skills.smith).toBe(before.smith);expect(p.inv.berries).toBe(3);
 expect(serializeWorld(w)).toBe(serializeWorld(loaded));expect(conservationReport(w).ok).toBe(true);
});
it('aborting before a completed action grants no practice, and waiting grants no general skill',()=>{
 const {w,p,begin}=practiceFixture(),before={...p.skills};begin();stepWorld(w);abortActivity(w,p,'staged interruption');pin(p);
 for(let i=0;i<120;i++)stepWorld(w);
 expect(p.skills).toEqual(before);expect(p.stats.gathered).toBe(0);expect(p.inv.berries??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('lab ablation restores only future creation and restores its switch afterward',()=>{
 const {w,baby}=birth();const restore=parseIntervention('rich-adult-newborn-skills').install!();
 try {expect(baby.skills.forage).toBe(0.2);expect(initialSkills(w,0,makeSkills(new RNG(2),baby.traits)).forage).toBeGreaterThan(0.7);}
 finally{restore();}
 expect(initialSkills(w,0,baby.skills).forage).toBe(0.2);
});
