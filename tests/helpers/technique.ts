// Staged young family member and known kiln. No maturation clock is accelerated.
import { stage,addPerson,building,done,pin } from './kit';
import { observe } from '../../src/sim/knowledge';
import { perceive } from '../../src/sim/perception';
import { relOf } from '../../src/sim/relations';
import { generateOptions,rankOptions } from '../../src/sim/decision';
import { startActivity,abortActivity } from '../../src/sim/activities';
import { stepWorld } from '../../src/sim/world';
export function techniqueFixture(seed='technique-contract'){
 const s=stage(seed);s.w.settings.dynamics='rich';s.w.settings.rulesVersion=18;s.w.birthCount=0;
 const a=addPerson(s,'Ada',40.5,40.5,{hunger:98,thirst:98,energy:98,traits:{generosity:0.9,sociability:1}});
 const b=addPerson(s,'Ben',42,40.5,{age:12,hh:a.hhId,hunger:98,thirst:98,energy:98,traits:{curiosity:0.9,sociability:1}});
 const kiln=building(s,'kiln',44,43,0,{wood:6});const smithy=building(s,'smithy',48,43);
 relOf(a,b.id).kin='child';relOf(b,a.id).kin='parent';
 for(const [p,q] of [[a,b],[b,a]]){relOf(p,q.id).affinity=80;relOf(p,q.id).trust=60;p.needs.warmth=95;p.needs.safety=95;pin(p);observe(s.w,p,kiln);observe(s.w,p,smithy);}
 done(s);perceive(s.w,a);perceive(s.w,b);
 const w=s.w;w.sceneLabel='STAGED: charcoal firing passes through instruction';
 function begin(){
  a.cooldowns.pause=0;
  const option=rankOptions(generateOptions(w,a,true,true)).find(o=>o.key===`socialize:${b.id}:teach_technique`);
  if(!option?.make)throw new Error('no legal teaching option');const act=option.make();if(!act)throw new Error('no lesson activity');startActivity(w,a,act);
 }
 function hold(){for(const p of [a,b]){abortActivity(w,p,'fixture holds next step');pin(p);}}
 function reachLesson(){begin();for(let i=0;i<300&&!w.conversations.some(c=>c.lesson);i++){stepWorld(w);if(b.convId)b.cooldowns.pause=0;}return w.conversations.find(c=>c.lesson);}
 return {w,a,b,kiln,smithy,begin,hold,reachLesson};
}
