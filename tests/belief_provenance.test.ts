// P1.1 belief provenance view: display only, derived from the person's own beliefs and checks of each teller.
import {it,expect} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {putBelief,observe} from '../src/sim/knowledge';
import {relOf} from '../src/sim/relations';
import {describePerson} from '../src/sim/inspect';
import {serializeWorld} from '../src/app/save';

function scene(){
 const s=stage('belief-provenance');s.w.settings={...s.w.settings,dynamics:'rich'};
 const ada=addPerson(s,'Ada',40.5,40.5),kai=addPerson(s,'Kai',42.5,40.5),lin=addPerson(s,'Lin',44.5,40.5);
 const bush=makeSource(s.w,'berry_bush',60,40,6),grain=makeSource(s.w,'wild_grain',62,44,6),near=makeSource(s.w,'berry_bush',41,41,6);
 done(s);s.w.tick=4000;
 const told=(src:typeof bush,from:number,age:number)=>putBelief(ada,{id:src.id,kind:src.type,x:src.x,y:src.y,amount:6,max:src.max,seen:s.w.tick-age,src:'told',from,learned:s.w.tick-age});
 told(bush,kai.id,600);told(grain,lin.id,2400);observe(s.w,ada,near);
 return {w:s.w,ada,kai,lin,bush,grain,near};
}

it('labels hearsay by teller, age and the listener\'s own checks, and lists no first-hand place',()=>{
 const f=scene();relOf(f.ada,f.kai.id).accounts={checked:3,borneOut:1,last:{tick:3000,id:f.bush.id,kind:'berry_bush',described:6,expected:6,found:0,borneOut:false,toldAt:2000}};
 const before=serializeWorld(f.w),told=describePerson(f.w,f.ada.id)!.knowledge.told;
 expect(serializeWorld(f.w)).toBe(before);
 expect(told.map(t=>t.key)).toEqual([`${f.bush.id}`,`${f.grain.id}`]);
 expect(told[0].text).toContain('told by Kai today');
 expect(told[0].text).toContain('who has been wrong before (1 of 3 accounts borne out)');expect(told[0].doubt).toBe(true);
 expect(told[1].text).toContain('told by Lin a day ago');expect(told[1].text).toContain('old news');expect(told[1].doubt).toBe(false);
});

it('does not doubt a teller whose checked accounts were all borne out, or one never checked',()=>{
 const f=scene();relOf(f.ada,f.kai.id).accounts={checked:2,borneOut:2,last:{tick:3000,id:f.bush.id,kind:'berry_bush',described:6,expected:6,found:6,borneOut:true,toldAt:2000}};
 const told=describePerson(f.w,f.ada.id)!.knowledge.told;
 expect(told.every(t=>!t.doubt&&!t.text.includes('wrong before'))).toBe(true);
});
