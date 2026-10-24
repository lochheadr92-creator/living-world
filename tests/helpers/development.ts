// Labelled contract fixture: a 12-year-old entrant practising, not accelerated maturation.
import { stage, addPerson, done, pin } from './kit';
import { makeSource } from '../../src/sim/sources';
import { observe } from '../../src/sim/knowledge';
import { newActivity, startActivity } from '../../src/sim/activities';
export function practiceFixture() {
 const s=stage('young-practice');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=17;s.w.birthCount=0;
 const p=addPerson(s,'Cora',40.5,40.5,{age:12,hunger:95,thirst:98,energy:98});
 p.needs.warmth=95;p.needs.safety=95;pin(p);
 const bush=makeSource(s.w,'berry_bush',42,40,8);observe(s.w,p,bush);done(s);
 const w=s.w;w.sceneLabel='STAGED: a young entrant learns by gathering';
 const begin=()=>{p.cooldowns.pause=0;return startActivity(w,p,newActivity(w,p,{kind:'gather',label:'Gather berries',goal:'staged practice contract',targetId:bush.id,targetType:'source',tx:42.5,ty:40.5,spotX:41.5,spotY:40.5,amount:3,utility:100,minCommit:1000,maxTicks:1000,data:{stype:'berry_bush'}}));};
 return {w,p,bush,begin};
}
