// Record once after rules 127 acceptance, before successor behaviour.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {makeWolf} from '../../src/sim/wildlife';
import {perceive} from '../../src/sim/perception';
import {rebuildMobileGrid} from '../../src/sim/registry';
import {makeSource} from '../../src/sim/sources';
import {stage,addPerson,building,done,learn} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules-127 continuation');
 return {saved,uninterrupted,continued};
}
export function v127Continuation(){
 const natural=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:127});
 for(let n=0;n<3000;n++)stepWorld(natural);
 const ordinary=continuation(natural,120);
 const memoryScene=stage('deer-memory-reference'), mw=memoryScene.w; mw.settings={...mw.settings,dynamics:'rich',rulesVersion:127};
 const observer=addPerson(memoryScene,'Bea',40.5,40.5,{hunger:70,thirst:90,energy:90});
 const tree=makeSource(mw,'tree',45,40,5); makeWolf(mw,44.5,40.5,'deer'); done(memoryScene); learn(mw,observer,tree); rebuildMobileGrid(mw); perceive(mw,observer);
 const sighting=continuation(mw,80);
 const s=stage('gear-reference'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:127};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:65,thirst:90,energy:90});
 const yard=building(s,'timber_yard',43,40,0,{fibre:3,wood:2}),fish=makeSource(w,'fish_spot',41,40,6);done(s);learn(w,p,yard);learn(w,p,fish);
 const start=(key:string)=>{const o=generateOptions(w,p,true,true).options.find(o=>o.key===key);if(!o)throw Error('Missing '+key);startActivity(w,p,o.make!()!);};
 const finish=()=>{for(let n=0;n<900&&p.activity;n++){w.tick++;stepActivity(w,p);}if(p.activity)throw Error('Unfinished gear work');};
 start(`operate:${yard.id}:make_net`);for(let n=0;n<30;n++){w.tick++;stepActivity(w,p);}
 const manufacture=continuation(w,30);finish();learn(w,p,yard);start(`collect:${yard.id}:net`);finish();
 const t=w.tools.find(t=>t.holder===p.id&&t.kind==='net')!;if(!t)throw Error('No physical net');
 start(`gear:place:${t.id}:${fish.id}`);for(let n=0;n<20;n++){w.tick++;stepActivity(w,p);}
 const placing=continuation(w,20);finish();
 const waiting=continuation(w,700);
 return {ordinary,sighting,manufacture,placing,waiting,gear:w.piles.filter(b=>b.gear).map(b=>({id:b.id,items:b.items,gear:b.gear})),tool:t,consumed:w.ledger.consumed};
}
