// Frozen rules-92 communication and informed succession, before estate custody.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {perceive} from '../../src/sim/perception';
import {killPerson} from '../../src/sim/lifecycle';
import {reviewIntentions} from '../../src/sim/intent';
import {continuityScene} from './continuity';
import type {World} from '../../src/sim/types';
export function v92Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-92 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:92});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 const f=continuityScene(92,true);let hearing;
 try{
  f.a.cooldowns.pause=0;f.b.cooldowns.pause=0;f.b.nextThink=600;perceive(f.w,f.a);perceive(f.w,f.b);
  const offered=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('share_work'));if(!offered)throw new Error('Missing work-sharing offer');startActivity(f.w,f.a,offered.make!()!);
  for(let n=0;n<300&&!f.b.relations[f.a.id]?.workHeard?.length;n++)stepWorld(f.w);
  if(!f.b.relations[f.a.id]?.workHeard?.length||f.a.relations[f.b.id].workTold![0].acknowledgedAt!==undefined)throw new Error('Missing heard-before-acknowledged boundary');
  hearing=advance(f.w,30);if(f.a.relations[f.b.id].workTold![0].acknowledgedAt===undefined)throw new Error('Missing actual acknowledgement');
  f.plan.worked=37;killPerson(f.w,f.a,'declared staged loss after communication');reviewIntentions(generateOptions(f.w,f.b,true));
  if(!f.b.intentions.some(i=>i.succeeding?.from===f.a.id&&i.succeeding.worked===0))throw new Error('Missing informed successor');
 }finally{release();}
 const succession=advance(f.w,1500);if((f.st.delivered.wood??0)<1||!f.b.intentions.some(i=>i.succeeding&&i.status==='active'))throw new Error('Missing physical successor delivery under the retained plan');
 const uninformed=continuityScene(92);killPerson(uninformed.w,uninformed.a,'declared uncommunicated work');const privateWork=advance(uninformed.w,100);
 if(uninformed.b.intentions.some(i=>i.succeeding))throw new Error('Unheard private undertaking leaked');
 return {ordinary,hearing,succession,privateWork};
}
