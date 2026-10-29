// Staged injured provider and distant child. The parent has a real-shaped remembered
// location; the helper learns it only through the actual accepted conversation.
import {stage,addPerson,done,pin} from './kit';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,newActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';

export function practicalCareScene(version=56){
 const s=stage('practical-care-watch'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const parent=addPerson(s,'Ada',40,40,{age:34,hunger:100,thirst:100,energy:100});
 const child=addPerson(s,'Eli',64,40,{age:5,hh:parent.hhId,hunger:40,thirst:80,energy:80});
 const helper=addPerson(s,'Ben',42,40,{age:33,inv:{bread:8,water:3},hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1,diligence:1}});
 parent.injury={kind:'sprain',since:0,until:5000,how:'staged provider injury'};
 done(s);pin(helper);
 relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;
 relOf(parent,helper.id).trust=70;relOf(helper,parent.id).trust=70;
 parent.whereabouts[child.id]={x:child.x,y:child.y,tick:w.tick};
 for(const p of [parent,helper,child])perceive(w,p);
 startActivity(w,child,newActivity(w,child,{kind:'rest',label:'Resting (staged)',goal:'staged: staying at the remembered place',here:true,minCommit:1600,maxTicks:1800,amount:1600,data:{sticky:true}}));
 w.sceneLabel='TEST SCENE: injured parent asks a neighbour to watch a child at a remembered place';
 const ask=()=>{
  const o=generateOptions(w,parent,true,true).options.find(o=>o.kind==='socialize'&&o.label.includes('keep an eye on'));
  if(!o?.make)throw new Error('No actual watch request offered');
  startActivity(w,parent,o.make()!);
  for(let i=0;i<600;i++){stepWorld(w);if(w.requests.some(r=>r.kind==='watch'&&r.status!=='pending')&&!parent.convId)break;}
  return w.requests.find(r=>r.kind==='watch');
 };
 return {w,parent,child,helper,ask};
}
