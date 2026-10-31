// STAGED interrupted near-complete lean-to. Prior labour is staged; wood is explicitly consumed and accounted.
import {stage,addPerson,site,done} from './kit';
import {consume} from '../../src/sim/economy';
import {observe} from '../../src/sim/knowledge';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
export function constructionFinishScene(version=CURRENT_RULES_VERSION){
 const s=stage('interrupted-final-construction'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40,43,{age:35,hunger:95,thirst:95,energy:95,inv:{bread:2,water:2}}),target=site(s,'lean_to',40,40,p.hhId,p.id,{wood:4});
 done(s);consume(w,target.delivered,'wood',4,'staged prior construction');target.used.wood=4;target.work=199;observe(w,p,target);
 return {w,p,target,hh:w.households.find(h=>h.id===p.hhId)!};
}
