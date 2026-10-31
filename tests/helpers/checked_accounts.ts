// STAGED: a neighbour's first-hand account of a berry bush, told by the engine's own telling, and the bush declared stripped
// (or not) after he saw it. The listener's walk there, her observation, the tally, the trust note and her later choice
// of whom to ask are the engine's own. Checks the rules-107 contract; it is not an example of spontaneous behaviour.
import {stage,addPerson,done,pin} from './kit';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {relOf} from '../../src/sim/relations';
import {makeSource} from '../../src/sim/sources';
import {tellBelief} from '../../src/sim/news';
import {endActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {rebuildMobileGrid} from '../../src/sim/registry';
export function checkedAccountsScene(version=107,bare=true){
 const s=stage('checked-accounts'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const ada=addPerson(s,'Ada',40,40,{age:30,hunger:45,thirst:100,energy:100,traits:{sociability:1}});
 // Ben and Cara stand at the same distance from Ada now and from the bush later, so the only difference between them is what she learns
 const ben=addPerson(s,'Ben',46,44,{age:32,hunger:100,thirst:100,energy:100,traits:{sociability:1}});
 const cara=addPerson(s,'Cara',46,36,{age:31,hunger:100,thirst:100,energy:100,traits:{sociability:1}});
 // the bush stands beyond everybody's sight from where they are, so Ben's account is the only way Ada hears of it
 const bush=makeSource(w,'berry_bush',58,40,6);observe(w,ben,bush);
 if(bare)bush.amount=0; // declared: stripped after Ben saw it, before the ledger snapshot; it regrows at the ordinary rate from here
 done(s);
 for(const p of [ada,ben,cara]){pin(p);p.cooldowns.trade=1e12;p.needs.warmth=100;p.needs.safety=100;}
 for(const q of [ben,cara]){relOf(ada,q.id).affinity=30;relOf(q,ada.id).affinity=30;}
 // the engine's own telling: Ben's first-hand belief, told now (hops 1, told the moment it was seen)
 if(!tellBelief(w,ben,ada,ben.beliefs[bush.id]))throw new Error('Not told');
 for(const p of [ada,ben,cara])perceive(w,p);
 w.sceneLabel='STAGED first-hand account of a bush, then stripped; the check, the tally and the later ask are the engine\'s own';
 /** Ada acts on the account: she goes for the berries and sees the bush for herself */
 const goCheck=()=>{ada.cooldowns.pause=0;for(let n=0;n<1500&&ada.beliefs[bush.id]?.src!=='seen';n++)stepWorld(w);if(ada.beliefs[bush.id]?.src!=='seen')throw new Error('Ada never saw the bush: '+JSON.stringify(ada.log.slice(-4)));pin(ada);if(ada.activity)endActivity(w,ada,'interrupted','staged');ada.needs.hunger=45;ada.needs.thirst=100;ada.needs.energy=100;
  // declared: the two neighbours come by, again at one and the same distance from her
  ben.x=ada.x-5;ben.y=ada.y+4;cara.x=ada.x-5;cara.y=ada.y-4;rebuildMobileGrid(w);for(const p of [ada,ben,cara])perceive(w,p);};
 /** declared: all three back where they began, the bush out of everybody's sight again */
 const goHome=()=>{ada.x=40;ada.y=40;ben.x=46;ben.y=44;cara.x=46;cara.y=36;rebuildMobileGrid(w);for(const p of [ada,ben,cara])perceive(w,p);};
 return {s,w,ada,ben,cara,bush,goCheck,goHome};
}
