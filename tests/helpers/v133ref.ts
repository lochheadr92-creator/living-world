import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {startActivity,stepActivity,newActivity} from '../../src/sim/activities';
import {stage,addPerson,done,learn} from './kit';
import {makeSource} from '../../src/sim/sources';
import {makeWolf} from '../../src/sim/wildlife';
import {mintTool} from '../../src/sim/tools';
import {generateOptions} from '../../src/sim/decision';
import {gearTick} from '../../src/sim/passive_gear';
import {carcassTick,CARCASS_LIFETIME} from '../../src/sim/carcass';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
export function v133Continuation(){
 const ordinary=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:133});
 for(let n=0;n<3000;n++)stepWorld(ordinary);
 const saved=digest(ordinary),copy=deserializeWorld(serializeWorld(ordinary));
 for(let n=0;n<120;n++){stepWorld(ordinary);stepWorld(copy);}
 if(serializeWorld(ordinary)!==serializeWorld(copy)||!conservationReport(ordinary).ok)throw Error('Invalid ordinary133 continuation');
 const s=stage('trap-window'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:133};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:65,thirst:90,energy:90}),ground=makeSource(w,'tree',41,40,5),deer=makeWolf(w,42.5,41.5,'deer');
 const t=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'staged initial gear',false);done(s);learn(w,p,ground,deer);
 startActivity(w,p,generateOptions(w,p,true,true).options.find(o=>o.key===`gear:place:${t.id}:${ground.id}`)!.make!()!);
 while(p.activity){w.tick++;stepActivity(w,p);}
 const pile=w.piles.find(b=>b.gear)!;w.tick++;gearTick(w);const body=w.piles.find(b=>b.carcass)!;
 w.tick=body.since+CARCASS_LIFETIME;carcassTick(w);w.tick+=120;carcassTick(w);
 startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:'Check trap',goal:'inspect catch',here:true,targetId:pile.id,targetType:'pile',data:{op:'check'}}));
 for(let n=0;n<20;n++){w.tick++;stepActivity(w,p);}
 const midCheck=digest(w),twin=deserializeWorld(serializeWorld(w)),q=twin.persons.find(q=>q.id===p.id)!;
 for(let n=0;n<40;n++){w.tick++;twin.tick++;stepActivity(w,p);stepActivity(twin,q);}
 if(serializeWorld(w)!==serializeWorld(twin)||!conservationReport(w).ok)throw Error('Invalid paid133 check continuation');
 return {ordinary:{saved,continued:digest(ordinary)},midCheck,checked:digest(w),log:p.log.at(-1)};
}
