import {afterEach,expect,it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {backgroundFor,backgroundKnowsCharcoal,setBackgrounds} from '../src/sim/background';
import {createPerson,ageYears} from '../src/sim/people';
import {RNG} from '../src/sim/rng';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {describePerson} from '../src/sim/inspect';
import {observeNow} from './helpers/inhabit';
import {giveBirth} from '../src/sim/lifecycle';
import {SKILL_MAX} from '../src/sim/constants';
import {parseIntervention} from '../scripts/lab/lab';
const make=(version=44)=>createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:version});
afterEach(()=>setBackgrounds(true));
it('ordinary founders have strongly varied saved skills and real adult knowledge gaps',()=>{
 const w=make(),adults=w.persons.filter(p=>ageYears(w,p)>=16),known=adults.filter(p=>p.techniques?.charcoal);
 expect(known.length).toBeGreaterThan(0);expect(known.length).toBeLessThan(adults.length);
 const all=adults.flatMap(p=>Object.values(p.skills));expect(Math.min(...all)).toBeLessThan(.5);expect(Math.max(...all)).toBeGreaterThan(1.6);expect(Math.max(...all)).toBeLessThanOrEqual(SKILL_MAX);
 expect(new Set(adults.map(p=>p.background!.kind)).size).toBeGreaterThan(2);
 for(const p of adults)expect(p.techniques?.charcoal!==undefined).toBe(backgroundKnowsCharcoal(w,p.id));
 expect(serializeWorld(make())).toBe(serializeWorld(w));
});
it('the shared founder/arrival creation path varies adults without changing RNG consumption or appearance',()=>{
 const w=make(),old=make(43),r1=new RNG(70),r2=new RNG(70),traits=w.persons[0].traits;
 const options={name:'Traveller',sex:'m' as const,age:30,hhId:w.households[0].id,x:3,y:40,traits};
 const a=createPerson(w,r1,options),b=createPerson(old,r2,options);
 expect(a.background).toEqual(backgroundFor(w,a.id));expect(a.skills).not.toEqual(b.skills);expect(r1).toEqual(r2);expect(a.look).toEqual(b.look);expect(a.needs).toEqual(b.needs);
 expect(b.background).toBeUndefined();expect(b.techniques?.charcoal).toBeDefined();
});
it('real births remain novices, get no adult technique, and waiting supplies no background skills',()=>{
 const w=make(),mother=w.persons.find(p=>p.sex==='f'&&ageYears(w,p)>=16)!;giveBirth(w,mother);const child=w.persons.at(-1)!;
 expect(Object.values(child.skills)).toEqual(Array(11).fill(.2));expect(child.techniques).toEqual({});expect(child.background).toBeUndefined();
 child.cooldowns.pause=1e12;const before={...child.skills};for(let i=0;i<80;i++)stepWorld(w);expect(child.skills).toEqual(before);
});
it('save/load and observers preserve the background; ablation changes only future creation',()=>{
 const w=make(),saved=serializeWorld(w);for(const p of w.persons){describePerson(w,p.id);observeNow(w,p);}expect(serializeWorld(w)).toBe(saved);
 const restored=deserializeWorld(saved);for(let i=0;i<200;i++){stepWorld(w);stepWorld(restored);}expect(serializeWorld(w)).toBe(serializeWorld(restored));
 const held=serializeWorld(w),restore=parseIntervention('rich-uniform-backgrounds').install!();expect(serializeWorld(w)).toBe(held);
 const uniform=make();expect(uniform.persons.filter(p=>ageYears(uniform,p)>=16).every(p=>p.techniques?.charcoal)).toBe(true);restore();
 expect(make().persons.some(p=>p.background)).toBe(true);
});
