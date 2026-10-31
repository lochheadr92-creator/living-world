// Frozen rules-115 ordinary and physically accepted project-handcraft continuation.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {projectInputsScene} from './project_inputs';
import type {World} from '../../src/sim/types';
export function v115Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const check=(w:World,copy:World)=>{const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-115 continuation');return {uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:115});for(let n=0;n<600;n++)stepWorld(w);const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}const ordinary={saved,...check(w,copy)};
 const f=projectInputsScene(115);for(let n=0;n<180&&!(f.p.activity?.kind==='craft'&&f.p.activity.progress>0);n++)stepWorld(f.w);
 if(f.p.activity?.kind!=='craft'||f.p.activity.data.tool!=='hammer'||f.p.activity.progress<=0)throw new Error('Project handcraft did not physically begin');
 const craftingSaved=digest(f.w),other=deserializeWorld(serializeWorld(f.w));for(let n=0;n<160;n++){stepWorld(f.w);stepWorld(other);}
 if((f.p.inv.hammer??0)!==1||f.w.ledger.reasons['-crafting: hammer']!==3||(f.plan.wants.stone??0)!==0)throw new Error('No paid project hammer/released input claim');
 return {ordinary,projectHandcraft:{saved:craftingSaved,...check(f.w,other)}};
}
