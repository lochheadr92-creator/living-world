// Declared incapacity, known tree and unknown-to-helper fire. Requests and fuel work are real.
import {stage,addPerson,building,done} from './kit';
import {observe,delBelief} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {relOf} from '../../src/sim/relations';
import {makeSource} from '../../src/sim/sources';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {setExternalController} from '../../src/sim/external';
export function warmthDutyScene(version=96){
 const s=stage('warmth-care-acquisition'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const asker=addPerson(s,'Ada',40,40,{age:35,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ben',42,40,{age:35,inv:{bread:2,water:2},hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1}});
 asker.injury={kind:'sprain',since:0,until:5000,how:'declared initial incapacity'};
 const fire=building(s,'fire',30,40,0);fire.fuel=20;const tree=makeSource(w,'tree',46,40,12);done(s);observe(w,asker,fire);observe(w,helper,tree);
 relOf(asker,helper.id).affinity=80;relOf(helper,asker.id).affinity=80;relOf(asker,helper.id).trust=80;relOf(helper,asker.id).trust=80;
 perceive(w,asker);perceive(w,helper);delBelief(helper,fire.id);
 w.sceneLabel='STAGED incapacity and known resources; real spoken fire duty, acquisition and warmth';
 return {s,w,asker,helper,fire,tree};
}
export function requestWarmth(f:ReturnType<typeof warmthDutyScene>){
 const o=generateOptions(f.w,f.asker,true,true).options.find(o=>o.key.endsWith(':fire'));if(!o)throw new Error('No initial offered fire request');
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{startActivity(f.w,f.asker,o.make!()!);for(let n=0;n<200;n++)stepWorld(f.w);}finally{release();}
 return f.w.requests.find(r=>r.kind==='fire')!;
}
