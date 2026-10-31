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

/** Finite one-adult fixture. The diagnostic's invalid `berry` spelling is corrected to the real source type. */
export function observedReplacementScene(version=CURRENT_RULES_VERSION){
 const s=stage('observed-home-collapse'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40,40,{age:35,hunger:95,thirst:95,energy:95,inv:{bread:3,water:3},traits:{diligence:0.8}});
 const home=building(s,'hut',42,40,p.hhId,{grain:8}),hh=w.households.find(h=>h.id===p.hhId)!;hh.homeId=home.id;
 const resources=[makeSource(w,'tree',36,40,20),makeSource(w,'tree',39,46,20),makeSource(w,'tree',46,36,20),makeSource(w,'rock',38,44,20),makeSource(w,'berry_bush',35,44,12)];
 done(s);observe(w,p,home);for(const resource of resources)observe(w,p,resource);
 w.sceneLabel='STAGED one adult, observed home collapse, known sources and finite supplies; subsequent replacement decisions are autonomous. Later survival is not established.';
 return {s,w,p,home,hh,resources};
}
