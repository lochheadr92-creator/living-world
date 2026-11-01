// Staged project input fixture, copied from the F1 contract; no policy/controller intervention.
import {stage,addPerson,building,done} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {proposeProject} from '../../src/sim/proposals';
import {generateOptions} from '../../src/sim/decision';
import {nextProjectStep} from '../../src/sim/project_step';
import {stepWorld} from '../../src/sim/world';
import {deserializeWorld,serializeWorld} from '../../src/app/save';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import {conservationReport,invRoom} from '../../src/sim/economy';

export function projectAcquireScene(stone:number,pack:'ordinary'|'light'='ordinary',version=CURRENT_RULES_VERSION){
 const s=stage(`review-acquire-${stone}-${pack}`),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 // ordinary pack: bread 2 + water 2 + wood 1 = 7 of 12 weight, room for ONE stone (3); light pack: room for two
 const p=addPerson(s,'Lena',40,20,{age:35,inv:{wood:1,stone,...(pack==='ordinary'?{water:2,bread:2}:{water:1,bread:1})},hunger:100,thirst:100,energy:100,traits:{diligence:1}});p.needs.warmth=95;p.needs.safety=95;
 p.stats.gathered=-1e6; // no basket want during the window (options_work.ts wantedTool), so no sibling tool plan competes for wood
 const home=building(s,'hut',36,20,p.hhId,{grain:12});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const yard=building(s,'timber_yard',46,20,0,{planks:4,handles:2,wood:2});
 const rock=makeSource(w,'rock',43,26,10),tree=makeSource(w,'tree',38,26,10);
 // four known food sources, so that the staged person does not spend the day exploring for food (options_work.ts optExplore)
 const food=[makeSource(w,'berry_bush',34,24,6),makeSource(w,'berry_bush',35,25,6),makeSource(w,'berry_bush',48,25,6),makeSource(w,'berry_bush',49,24,6)];
 done(s);for(const e of [home,yard,rock,tree,...food])observe(w,p,e);perceive(w,p);
 const r=proposeProject(generateOptions(w,p,true,true),{item:'cart',quantity:1,tier:0});if(!r.ok)throw new Error(r.reason);
 return {w,p,plan:r.plan,rock,yard};
}
