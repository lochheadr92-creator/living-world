import {stage,addPerson,building,site,done,give} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
export function journeyScene(version=72){
 const s=stage('trip-preparation-gap'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Mara',40,17,{age:35,inv:{bread:1},hunger:100,thirst:70,energy:100,traits:{diligence:0.8,caution:0.5}});
 const home=building(s,'hut',36,20,p.hhId,{grain:12}),target=site(s,'storehouse',52,42,p.hhId,p.id),tree=makeSource(w,'tree',65,55,12);give(w,p,'axe');w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 done(s);for(const e of [home,target,tree])observe(w,p,e);perceive(w,p);
 w.sceneLabel='STAGED distant useful work, known nearby provisions and starting needs; actual preparation, travel, consumption and work use registered actions';
 return {s,w,p,home,target,tree,key:`gather:${tree.id}`};
}
