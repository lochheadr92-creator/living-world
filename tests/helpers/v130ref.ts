import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {compileProject} from '../../src/sim/project_compile';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {makeWolf} from '../../src/sim/wildlife';
import {makeCarcass} from '../../src/sim/carcass';
import {stage,addPerson,building,done,learn} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules130 continuation');
 return {saved,uninterrupted,continued};
}
export function v130Continuation(){
 const natural=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:130});
 for(let n=0;n<3000;n++)stepWorld(natural);
 const ordinary=continuation(natural,120);
 const s=stage('carcass-supply-reference'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:130};w.weather.temp=0;
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:70,thirst:90,energy:90,inv:{fibre:1,berries:3}}),yard=building(s,'timber_yard',43,40,0),deer=makeWolf(w,41.5,40.5,'deer');
 done(s);const body=makeCarcass(w,deer,p)!;learn(w,p,yard,body);
 const ctx=generateOptions(w,p,true,true),plan=compileProject(ctx,{item:'garment',quantity:1,tier:0});if(!plan.ok)throw Error('No body supply plan');
 const o=ctx.options.find(o=>o.key===`butcher:${body.id}:hide`)!;startActivity(w,p,o.make!()!);
 for(let n=0;n<25;n++){w.tick++;stepActivity(w,p);}
 const cutting=continuation(w,180),later=continuation(w,1200);
 return {ordinary,plan:plan.graph,cutting,later,consumed:w.ledger.consumed,created:w.ledger.created};
}
