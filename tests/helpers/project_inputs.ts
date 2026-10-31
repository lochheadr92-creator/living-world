import {stage,addPerson,building,site,done} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import {proposeProject} from '../../src/sim/proposals';
import {generateOptions} from '../../src/sim/decision';
export function projectInputsScene(version=CURRENT_RULES_VERSION,stone=2){
 const s=stage('project-hand-inputs'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Lena',40,40,{age:35,inv:{wood:1,stone,water:1,berries:1},hunger:100,thirst:100,energy:100,traits:{diligence:1}});p.needs.warmth=95;p.needs.safety=95;
 const home=building(s,'hut',38,40,p.hhId,{grain:12});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const yard=building(s,'timber_yard',45,40,0,{planks:4,handles:2,wood:6});
 const target=site(s,'kiln',44,46,p.hhId,p.id),rock=makeSource(w,'rock',42,44,10),tree=makeSource(w,'tree',38,45,10);
 done(s);for(const e of [home,yard,target,rock,tree])observe(w,p,e);
 w.sceneLabel='STAGED cart proposal, supplied workshop inputs and held hammer ingredients; physical crafting must pay its inputs. Competing kiln site must not take the reserved stone.';
 const result=proposeProject(generateOptions(w,p,true,true),{item:'cart',quantity:1,tier:0});if(!result.ok)throw new Error(result.reason);
 return {s,w,p,home,yard,target,rock,tree,plan:result.plan};
}
