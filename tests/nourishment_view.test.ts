import {expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {describePerson} from '../src/sim/inspect';
import {serializeWorld} from '../src/app/save';
it('does not promise free health recovery in the sleeping inspector',()=>{
 const s=stage('nourishment-view'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:132};const p=addPerson(s,'Ada',40,40,{hunger:60,thirst:90,energy:50});done(s);p.pose='sleep';p.needs.warmth=90;p.health=50;
 const before=serializeWorld(w);expect(describePerson(w,p.id)!.qa.stopping).toContain('Food is needed for health recovery');expect(serializeWorld(w)).toBe(before);
 p.nourishment=2;expect(describePerson(w,p.id)!.qa.stopping).toContain('Stored nourishment pays');
 p.needs.thirst=20;expect(describePerson(w,p.id)!.qa.stopping).toContain('also needs enough food, water and warmth');
 p.health=100;expect(describePerson(w,p.id)!.qa.stopping).toBe('Sleeping restores energy.');
 w.settings.rulesVersion=131;expect(describePerson(w,p.id)!.qa.stopping).toBe('Nothing; sleeping recovers energy and health.');
});
