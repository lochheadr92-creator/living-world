// Declared initial incapacity and nearby real supplies; no delivery is injected.
import {stage,addPerson,building,done} from './kit';
import {leaveHome,doorPoint,enterHome} from '../../src/sim/habitation';
import {newActivity,startActivity} from '../../src/sim/activities';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {initializeWater} from '../../src/sim/hydrology';
import {computeWaterDist,computeAccessCells} from '../../src/sim/worldgen';
import {T} from '../../src/sim/types';
export function careSupplyScene(version=95,water=false){
 const s=stage('care-supply-acquisition'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const helper=addPerson(s,'Ada',40,40,{age:35,inv:water?{}:{water:1},hunger:100,thirst:100,energy:100});
 const elder=addPerson(s,'Eli',40,40,{age:72,hh:helper.hhId,hunger:water?90:20,thirst:water?20:70,energy:70});
 elder.health=30;elder.injury={kind:'sprain',since:0,until:5000,how:'declared initial injury'};
 const home=building(s,'hut',40,40,helper.hhId);w.households.find(h=>h.id===helper.hhId)!.homeId=home.id;
 w.terrain[43*w.W+46]=T.SHALLOW;delete w.waterBodies;initializeWater(w);computeWaterDist(w);computeAccessCells(w);
 const grain=makeSource(w,'wild_grain',45,42,12);done(s);observe(w,helper,grain);
 const door=doorPoint(home);for(const p of [helper,elder]){p.x=p.px=door.x;p.y=p.py=door.y;const why=enterHome(w,p,home);if(why)throw new Error(why);}
 startActivity(w,elder,newActivity(w,elder,{kind:'rest',label:'Resting with an injury',goal:'to recover',targetId:home.id,here:true,minCommit:500,maxTicks:1000}));
 perceive(w,helper);perceive(w,elder);
 const why=leaveHome(w,helper);if(why)throw new Error(why);
 perceive(w,helper);helper.cooldowns.pause=0;helper.nextThink=0;
 w.sceneLabel='STAGED observed household incapacity and real nearby supplies; actual acquisition, return and consumption';
 return {s,w,helper,elder,home,grain};
}
