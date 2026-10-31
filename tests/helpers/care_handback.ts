// Declared short-lived injury and nearby family; both request and watch are actual offered actions.
import {stage,addPerson,done} from './kit';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,newActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {setExternalController} from '../../src/sim/external';
export function careHandbackScene(version=97,childRest:'continuing'|'finished'='continuing'){
 const s=stage('care-recovery-handback'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const parent=addPerson(s,'Ada',40,40,{age:34,hunger:100,thirst:100,energy:100}),child=addPerson(s,'Eli',41,41,{age:5,hh:parent.hhId,hunger:100,thirst:100,energy:childRest==='continuing'?20:80}),helper=addPerson(s,'Ben',42,40,{age:33,inv:{bread:2,water:2},hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1}});
 parent.injury={kind:'sprain',since:0,until:160,how:'declared initial recovering injury'};done(s);
 relOf(parent,helper.id).affinity=80;relOf(helper,parent.id).affinity=80;relOf(parent,helper.id).trust=80;relOf(helper,parent.id).trust=80;for(const p of [parent,child,helper])perceive(w,p);
 // Separate declared scenes: a tired child still resting, or the original short rest
 // whose completion permits a competing child/helper conversation. Neither controls
 // the child's choices after the preparation controller is released.
 startActivity(w,child,newActivity(w,child,{kind:'rest',label:'Resting',goal:'declared initial rest',here:true,amount:childRest==='continuing'?600:150,minCommit:600,maxTicks:700}));
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{
  const ask=generateOptions(w,parent,true,true).options.find(o=>o.key.endsWith(':watch'));if(!ask)throw new Error('No offered watch request');startActivity(w,parent,ask.make!()!);for(let n=0;n<100;n++)stepWorld(w);
  if(w.requests.find(r=>r.kind==='watch')?.status!=='promised')throw new Error('Watch not accepted');
  const watch=generateOptions(w,helper,true,true).options.find(o=>o.key==='watch:'+child.id);if(!watch)throw new Error('No offered watch');startActivity(w,helper,watch.make!()!);for(let n=0;n<220;n++)stepWorld(w);
 }finally{release();}
 w.sceneLabel='STAGED accepted watch and naturally healed parent; actual agreed childcare return';
 return {s,w,parent,child,helper};
}
