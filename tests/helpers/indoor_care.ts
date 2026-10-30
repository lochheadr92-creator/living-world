// STAGED same-household residents already at their own entrance; admission uses the real home boundary.
import { addPerson, building, done, stage, pin } from './kit';
import { doorPoint, enterHome } from '../../src/sim/habitation';
import { newActivity, startActivity } from '../../src/sim/activities';
import { perceive } from '../../src/sim/perception';
export function indoorCareScene(version:number) {
  const s=stage('indoor-household-care');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
  const helper=addPerson(s,'Ada',40,40,{age:35,inv:{bread:3,water:1},hunger:100,thirst:100,energy:100});
  const elder=addPerson(s,'Eli',40,40,{age:72,hh:helper.hhId,hunger:20,thirst:70,energy:70});
  elder.health=30;elder.injury={kind:'sprain',since:0,until:5000,how:'staged injury'};
  const home=building(s,'hut',40,40,helper.hhId);
  s.w.households.find(h=>h.id===helper.hhId)!.homeId=home.id;
  const w=done(s),door=doorPoint(home);
  for(const p of [helper,elder]){
    p.x=p.px=door.x;p.y=p.py=door.y;
    const why=enterHome(w,p,home);if(why)throw new Error(why);
  }
  startActivity(w,elder,newActivity(w,elder,{kind:'rest',label:'Resting with an injury',goal:'to recover',targetId:home.id,here:true,minCommit:500,maxTicks:1000}));
  perceive(w,helper);perceive(w,elder);pin(helper);
  w.sceneLabel='STAGED: a resident has bread beside an injured elder in their own home; no guest admission';
  return {s,w,helper,elder,home};
}
