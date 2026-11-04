import {stage,addPerson,building,done,learn} from './kit';
import {makeSheep} from '../../src/sim/livestock';
import {makeSource} from '../../src/sim/sources';
/** STAGED finite opportunity; all subsequent decisions are autonomous. */
export function lambBirthScene(version:number){
const s=stage('lamb-autonomy'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:version};
const p=addPerson(s,'Ada',42.5,15.5,{hunger:90,thirst:100,energy:100,inv:{grain:5,wood:4,fibre:3,water:2}});
const home=building(s,'hut',44,16,p.hhId);w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
const ewe=makeSheep(w,40.5,15.5,'f'),ram=makeSheep(w,41.5,15.5,'m');
const fields=[makeSource(w,'wild_grain',40,16,12),makeSource(w,'wild_grain',41,16,12),makeSource(w,'berry_bush',39,16,12)];
done(s);learn(w,p,home,ewe,ram,...fields);
return {w,p,ewe,ram};
}
