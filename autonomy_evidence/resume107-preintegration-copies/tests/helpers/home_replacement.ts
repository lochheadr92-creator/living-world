// STAGED housing knowledge, finite supplies and sources; not an ordinary-world sample.
import {stage,addPerson,building,done} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
export function homeReplacementScene(version=CURRENT_RULES_VERSION,remote=true){
 const s=stage('unseen-home-collapse'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',30,30,{age:35,hunger:95,thirst:95,energy:95,inv:{bread:3,water:3}});
 const home=building(s,'hut',remote?70:32,remote?65:30,p.hhId,{grain:8});
 const hh=w.households.find(h=>h.id===p.hhId)!;hh.homeId=home.id;
 const trees=[makeSource(w,'tree',26,30,20),makeSource(w,'tree',32,34,20),makeSource(w,'tree',34,29,20)];
 done(s);observe(w,p,home);for(const tree of trees)observe(w,p,tree);
 return {s,w,p,home,hh,trees};
}
