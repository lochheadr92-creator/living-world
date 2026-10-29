import {expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {describePerson} from '../src/sim/inspect';
import {decide} from '../src/sim/decision';
import {newActivity,startActivity,endActivity} from '../src/sim/activities';
import {serializeWorld} from '../src/app/save';

it('a previous food blocker remains recorded history after needs change, never a claim about the current state',()=>{
 const s=stage('blocker-history');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=55;
 const p=addPerson(s,'Ada',40,40,{age:35,hunger:10,thirst:100,energy:100});const w=done(s);w.tick=2000;
 decide(w,p,'staged hungry decision');if(p.activity)endActivity(w,p,'interrupted','staged task boundary');
 expect(p.lastDecision?.blocked.length).toBeGreaterThan(0);
 p.needs.hunger=90;w.tick+=120; // a changed condition without an intervening decision, as immediately after eating
 const before=serializeWorld(w),v=describePerson(w,p.id)!;
 expect(v.qa.stoppingIsHistorical).toBe(true);expect(v.qa.stopping).toContain('at the last decision');
 expect(v.home).toContain('last considered');expect(serializeWorld(w)).toBe(before);
});
it('a real activity blocker is presented as current rather than relabelled history',()=>{
 const s=stage('blocker-current'),p=addPerson(s,'Ada',40,40,{age:35});const w=done(s);
 const a=newActivity(w,p,{kind:'rest',label:'Resting',goal:'recover',here:true});startActivity(w,p,a);a.blocked='home exit is blocked';
 const v=describePerson(w,p.id)!;expect(v.qa.stoppingIsHistorical).toBe(false);expect(v.qa.stopping).toBe('Home exit is blocked.');
});
