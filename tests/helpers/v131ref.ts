import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {makeWolf} from '../../src/sim/wildlife';
import {makeSource} from '../../src/sim/sources';
import {mintTool} from '../../src/sim/tools';
import {gearTick} from '../../src/sim/passive_gear';
import {stage,addPerson,done,learn} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules131 continuation');
 return {saved,uninterrupted,continued};
}
export function v131Continuation(){
 const natural=createWorld({...currentWorldSettings('normal','meadow',{immigration:true}),rulesVersion:131});
 for(let n=0;n<3000;n++)stepWorld(natural);
 const ordinary=continuation(natural,120);
 const s=stage('trap-window'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:131};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:65,thirst:90,energy:90}),ground=makeSource(w,'tree',41,40,5),deer=makeWolf(w,42.5,41.5,'deer');
 const t=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'staged initial gear',false);done(s);learn(w,p,ground,deer);
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:place:${t.id}:${ground.id}`)!;startActivity(w,p,o.make!()!);
 for(let n=0;n<500&&p.activity;n++){w.tick++;stepActivity(w,p);}
 const pile=w.piles.find(b=>b.gear)!;w.tick++;gearTick(w);
 if(!pile.gear!.bodyId||pile.gear!.state==='armed'||w.tick>=pile.gear!.readyAt)throw Error('No early captured body');
 const caught=continuation(w,120);learn(w,p,pile);
 const check=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:check:${pile.id}`);
 if(check){startActivity(w,p,check.make!()!);for(let n=0;n<20&&p.activity;n++){w.tick++;stepActivity(w,p);}}
 const checking=continuation(w,180),later=continuation(w,700);
 return {ordinary,caught,checking,later,consumed:w.ledger.consumed,created:w.ledger.created};
}
