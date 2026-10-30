// STAGED need, supplies, known destination and an accepted future duty; engine chooses the amount/spell.
import {stage,addPerson,building,site,done,give,pin} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {generateOptions} from '../../src/sim/decision';
import type {Commitment} from '../../src/sim/types';
export function actionScopeScene(version=71,workshop=false){
 const s=stage('action-scope'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Mara',40,40,{age:35,inv:{bread:1,water:1},hunger:100,thirst:100,energy:100,traits:{diligence:0.8,caution:0.5}});
 const home=building(s,'hut',36,34,p.hhId,{grain:12});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const target=site(s,workshop?'house':'storehouse',52,42,p.hhId,p.id),tree=makeSource(w,'tree',44,40,12);give(w,p,'axe');
 const yard=workshop?building(s,'timber_yard',44,44,0,{wood:8}):undefined;
 if(workshop)target.delivered={wood:6,bricks:6};
 const recipient=addPerson(s,'Oren',38,40,{age:36,hh:p.hhId,hunger:100,thirst:100,energy:100});pin(recipient);
 done(s);for(const e of [home,target,tree,...(yard?[yard]:[])])observe(w,p,e);perceive(w,p);
 const key=`gather:${tree.id}`;
 const addDuty=(remaining:number)=>{const c:Commitment={id:w.nextId++,requestId:0,kind:'deliver',to:recipient.id,item:'clay',amount:1,siteId:0,made:w.tick,deadline:w.tick+remaining,status:'active'};p.commitments.push(c);return c;};
 const option=()=>generateOptions(w,p,true,true).options.find(o=>o.key===key);
 w.sceneLabel='STAGED material demand and accepted future duty; the engine estimates the work amount and physical actions execute normally';
 return {s,w,p,home,target,tree,yard,recipient,key,addDuty,option};
}
