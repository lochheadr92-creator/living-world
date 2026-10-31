// STAGED household hut site short of wood, a far known tree, a full-handed asker and a neighbour carrying wood; the ask, the
// answer (a promise to haul to the site), the spoken hour, every later choice and the delivery are the engine's own.
import {stage,addPerson,site,done,pin} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {setExternalController} from '../../src/sim/external';
import {stepWorld} from '../../src/sim/world';
import {produce,consume} from '../../src/sim/economy';
import {carryCap} from '../../src/sim/people';
/** `rockAt` defaults to the recorded rules-101 fixture's edge rock (80,12), which sits on the map boundary; a saved attempt to reach it fails validation, so later scenes pass an in-bounds rock. The default is kept because the rules-101 reference was recorded with it. */
export function promisedSupplyScene(version=101,woodNeed=3,rockAt:[number,number]=[80,12]){
 const s=stage('promised-supply'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const ada=addPerson(s,'Ada',40.5,40.5,{age:34,inv:{bread:2,water:2},hunger:100,thirst:100,energy:100});
 const ben=addPerson(s,'Ben',44.5,40.5,{age:33,inv:{wood:3,bread:2,water:2},hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1}});
 const st=site(s,'hut',42,36,ada.hhId,ada.id);st.required.wood=woodNeed;
 const tree=makeSource(w,'tree',12,78,12),rock=makeSource(w,'rock',rockAt[0],rockAt[1],8);
 done(s);for(const p of [ada,ben]){pin(p);p.needs.warmth=95;p.needs.safety=95;p.cooldowns.trade=1e12;}
 // Ada's hands are full of ore nothing here wants, so a carrier's answer is a real promise to haul to the site (rules 11), not a gift
 produce(w,ada.inv,carryCap(w,ada),'ore',12,'declared full carried load');
 observe(w,ada,st);observe(w,ada,tree);observe(w,ada,rock);observe(w,ben,st);
 relOf(ada,ben.id).affinity=80;relOf(ben,ada.id).affinity=80;relOf(ada,ben.id).trust=80;relOf(ben,ada.id).trust=80;
 for(const p of [ada,ben])perceive(w,p);
 w.sceneLabel='STAGED hut site short of wood, far tree, neighbour carrying wood; the ask, promise, spoken hour, waiting and delivery are autonomous';
 return {s,w,ada,ben,st,tree,rock};
}
/** Ada asks Ben for the site's wood through the real request conversation; returns the request. */
export function askWood(f:ReturnType<typeof promisedSupplyScene>){
 f.ada.cooldowns.pause=0;f.ben.cooldowns.pause=0;perceive(f.w,f.ada);perceive(f.w,f.ben);f.ben.nextThink=f.w.tick+600;
 const o=generateOptions(f.w,f.ada,true,true).options.find(o=>o.kind==='socialize'&&o.label==='Ask Ben for wood');if(!o)throw new Error('No site ask offered: '+JSON.stringify(generateOptions(f.w,f.ada,true,true).options.map(o=>o.key)));
 startActivity(f.w,f.ada,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<400;n++){stepWorld(f.w);const r=f.w.requests.find(r=>r.from===f.ada.id&&r.item==='wood');if(r&&r.status!=='pending')break;}}finally{release();}
 pin(f.ada);pin(f.ben);const r=f.w.requests.find(r=>r.from===f.ada.id&&r.item==='wood');if(!r)throw new Error('No request');
 // the staged load is declared gone again, so what Ada does next is limited by nothing but her own knowledge and the promise
 consume(f.w,f.ada.inv,'ore',f.ada.inv.ore??0,'declared removal of the staged load');return r;
}
