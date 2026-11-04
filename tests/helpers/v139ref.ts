import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';import {currentWorldSettings} from '../../src/sim/profiles';import {serializeWorld,deserializeWorld} from '../../src/app/save';import {stepWorld} from '../../src/sim/world';import {conservationReport} from '../../src/sim/economy';
import {stage,addPerson,building,done,give} from './kit';import {generateOptions} from '../../src/sim/decision';import {startActivity} from '../../src/sim/activities';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v139Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:139});for(let i=0;i<6000;i++)stepWorld(w);
 const s=stage('reference-brewing');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:139};const p=addPerson(s,'Ada',40.5,26.5,{hunger:95,thirst:95,energy:95});const b=building(s,'brewery',40,24,p.hhId,{grain:6,water:4,wood:1});done(s);if(startJob(s.w,b,p,RECIPE_BY_ID.brew_beer,p.id,'reference'))throw Error('Missing staged brew');while(b.ops!.job?.phase==='work'){s.w.tick++;workJob(s.w,b,p);}
 function check(w:typeof s.w){const raw=serializeWorld(w),copy=deserializeWorld(raw);for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}const after=serializeWorld(w);if(after!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Continuation or conservation failed');return {saved:digest(raw),continued:digest(after)};}
 return {ordinary:check(w),staged:check(s.w)};
}

import {makeSource} from '../../src/sim/sources';import {startJob,workJob} from '../../src/sim/facilities';import {RECIPE_BY_ID} from '../../src/sim/recipes';
