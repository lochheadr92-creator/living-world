import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';import {currentWorldSettings} from '../../src/sim/profiles';import {serializeWorld,deserializeWorld} from '../../src/app/save';import {stepWorld} from '../../src/sim/world';import {conservationReport} from '../../src/sim/economy';
import {stage,addPerson,building,done} from './kit';import {generateOptions} from '../../src/sim/decision';import {startActivity} from '../../src/sim/activities';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v136Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:136});for(let i=0;i<6000;i++)stepWorld(w);
 const s=stage('reference-communal-stock');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:136};const p=addPerson(s,'Ada',40.5,26.5,{hunger:95,thirst:95,energy:95,inv:{wood:8}});const b=building(s,'storehouse',40,24,0);done(s);const o=generateOptions(s.w,p,true,true).options.find(o=>o.key===`communal_stock:${b.id}`);if(!o)throw Error('Missing staged stock offer');startActivity(s.w,p,o.make!()!);
 function check(w:typeof s.w){const raw=serializeWorld(w),copy=deserializeWorld(raw);for(let i=0;i<240;i++){stepWorld(w);stepWorld(copy);}const after=serializeWorld(w);if(after!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Continuation or conservation failed');return {saved:digest(raw),continued:digest(after)};}
 return {ordinary:check(w),staged:check(s.w)};
}
