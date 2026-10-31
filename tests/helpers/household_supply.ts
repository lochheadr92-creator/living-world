// STAGED two-adult household before winter with a thin store and a known bush; the reserve plan, the telling and every later
// decision are the engine's own (no plan is written by hand, no record is set by hand).
import {stage,addPerson,building,done,pin} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {updateEnvironment} from '../../src/sim/environment';
import {generateOptions} from '../../src/sim/decision';
import {reviewIntentions} from '../../src/sim/intent';
import {startActivity} from '../../src/sim/activities';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import type {Items} from '../../src/sim/types';
/** winter sets in on day 8 of a twelve-day year; this tick is inside the preparation window before it */
export const PRE_WINTER_TICK=15000;
export function householdSupplyScene(version=100,homeFood:Items={grain:6}){
 const s=stage('household-supply'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const ada=addPerson(s,'Ada',40.5,40.5,{age:34,hunger:92,thirst:92,energy:92}),ben=addPerson(s,'Ben',42.5,40.5,{age:30,hh:ada.hhId,hunger:92,thirst:92,energy:92});
 const home=building(s,'hut',41,37,ada.hhId,homeFood);w.households.find(h=>h.id===ada.hhId)!.homeId=home.id;
 const bush=makeSource(w,'berry_bush',38,41,30);
 done(s);for(const p of [ada,ben]){observe(w,p,home);observe(w,p,bush);p.cooldowns.trade=1e12;p.needs.warmth=95;p.needs.safety=95;pin(p);}
 w.tick=PRE_WINTER_TICK;updateEnvironment(w);
 w.sceneLabel='STAGED two-adult household with a thin store before winter; the reserve plan, the telling and the later choice are autonomous';
 return {s,w,ada,ben,home,bush};
}
/** Ada takes on the reserve herself and tells Ben through the real share_work conversation; returns her plan. */
export function tellReserve(f:ReturnType<typeof householdSupplyScene>){
 const plan=reviewIntentions(generateOptions(f.w,f.ada,true));if(plan?.kind!=='stock')throw new Error('No reserve plan: '+JSON.stringify(plan));
 f.ada.cooldowns.pause=0;f.ben.cooldowns.pause=0;perceive(f.w,f.ada);perceive(f.w,f.ben);f.ben.nextThink=f.w.tick+600;
 const offered=generateOptions(f.w,f.ada,true,true).options.find(o=>o.key.includes('share_work'));if(!offered)throw new Error('No share_work offer');startActivity(f.w,f.ada,offered.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<300&&!f.ben.relations[f.ada.id]?.workHeard?.length;n++)stepWorld(f.w);}finally{release();}
 if(!f.ben.relations[f.ada.id]?.workHeard?.length)throw new Error('Nothing heard');pin(f.ada);pin(f.ben);return plan;
}
