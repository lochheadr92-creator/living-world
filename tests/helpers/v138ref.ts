import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';import {currentWorldSettings} from '../../src/sim/profiles';import {serializeWorld,deserializeWorld} from '../../src/app/save';import {stepWorld} from '../../src/sim/world';import {conservationReport} from '../../src/sim/economy';
import {stage,addPerson,building,done,give} from './kit';import {generateOptions} from '../../src/sim/decision';import {startActivity} from '../../src/sim/activities';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v138Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:138});for(let i=0;i<6000;i++)stepWorld(w);
 const s=stage('reference-recovered-workshops');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:138};const p=addPerson(s,'Ada',40.5,26.5,{hunger:95,thirst:95,energy:95});const dep=makeSource(s.w,'ore_vein',43,24,9),mine=building(s,'mine',40,24,p.hhId),mill=building(s,'mill',46,24,p.hhId,{grain:6});mine.ops!.depositId=dep.id;give(s.w,p,'pick');done(s);if(startJob(s.w,mine,p,RECIPE_BY_ID.mine_ore,p.id,'reference')||startJob(s.w,mill,p,RECIPE_BY_ID.mill_flour_separate,p.id,'reference'))throw Error('Missing staged batches');workJob(s.w,mine,p);
 function check(w:typeof s.w){const raw=serializeWorld(w),copy=deserializeWorld(raw);for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}const after=serializeWorld(w);if(after!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Continuation or conservation failed');return {saved:digest(raw),continued:digest(after)};}
 return {ordinary:check(w),staged:check(s.w)};
}

import {makeSource} from '../../src/sim/sources';import {startJob,workJob} from '../../src/sim/facilities';import {RECIPE_BY_ID} from '../../src/sim/recipes';
