// STAGED one physical grain harvest; supplied pack, source and hunger are explicit.
import {stage,addPerson,done} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import type {Items,Person,World} from '../../src/sim/types';
export function wildSeedScene(version=CURRENT_RULES_VERSION,inv:Items={wood:5,seeds:6},seed=0){
 const s=stage('full-pack-grain-'+seed),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40,40,{age:35,hunger:10,thirst:95,energy:95,inv}),source=makeSource(w,'wild_grain',40,42,2);done(s);observe(w,p,source);
 const o=generateOptions(w,p,true,true).options.find(o=>o.kind==='gather'&&o.targetId===source.id);if(!o?.make)throw new Error('No offered grain harvest');
 const a=o.make();if(!a)throw new Error('No physical standing place');a.amount=1;p.x=a.spotX;p.y=a.spotY;a.phase='work';startActivity(w,p,a);
 w.sceneLabel='STAGED one offered wild-grain harvest. Hunger and pack are supplied. Grain eaten at its source cannot also pay for a seed unless a separate carried grain exists.';
 return {w,p,source,a};
}
/** Exercise only the accepted activity boundary; this is not an autonomous-world run. */
export function finishWildHarvest(w:World,p:Person,id:number){for(let n=0;n<200&&p.activity?.id===id;n++){w.tick++;stepActivity(w,p);}}
