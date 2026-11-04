// Record after accepting rules 125 and before adding any successor behaviour.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {makeCarcass} from '../../src/sim/carcass';
import {makeWolf} from '../../src/sim/wildlife';
import {stage,addPerson,building,done,learn} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules-125 continuation');
 return {saved,uninterrupted,continued};
}
export function v125Continuation(){
 const natural=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:125});
 for(let n=0;n<3000;n++)stepWorld(natural);
 const ordinary=continuation(natural,120);
 const s=stage('carcass-reference'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:125};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:65,thirst:90,energy:90});
 const yard=building(s,'timber_yard',43,40,p.hhId,{fibre:1});
 const rack=building(s,'food_rack',43,43,p.hhId,{wood:1});
 const deer=makeWolf(w,41.5,40.5,'deer');done(s);
 p.needs.warmth=40;w.weather.temp=0;const body=makeCarcass(w,deer,p)!;
 const start=(key:string)=>{const o=generateOptions(w,p,true,true).options.find(o=>o.key===key);if(!o)throw Error('Missing '+key);startActivity(w,p,o.make!()!);};
 const finish=()=>{for(let n=0;n<900&&p.activity;n++){w.tick++;stepActivity(w,p);}if(p.activity)throw Error('Unfinished carcass work');};
 start(`butcher:${body.id}:meat`);for(let n=0;n<25;n++){w.tick++;stepActivity(w,p);}
 const partial=continuation(w,30);finish();
 start(`butcher:${body.id}:hide`);finish();
 learn(w,p,yard);const giveHide=generateOptions(w,p,true,true).options.find(o=>o.kind==='deposit'&&o.targetId===yard.id&&o.make?.()?.data.items?.hide);
 if(!giveHide)throw Error('Missing hide delivery');startActivity(w,p,giveHide.make!()!);finish();learn(w,p,yard);
 start(`operate:${yard.id}:sew_hide_garment`);finish();learn(w,p,yard);start(`collect:${yard.id}:garment`);finish();
 const garment=w.tools.find(t=>t.holder===p.id&&t.kind==='garment')!;start(`dress:${garment.id}`);finish();
 const dressed=continuation(w,30);
 start(`butcher:${body.id}:fat`);finish();learn(w,p,rack);
 const giveFat=generateOptions(w,p,true,true).options.find(o=>o.kind==='deposit'&&o.targetId===rack.id&&o.make?.()?.data.items?.fat);
 if(!giveFat)throw Error('Missing fat delivery');startActivity(w,p,giveFat.make!()!);finish();learn(w,p,rack);
 start(`operate:${rack.id}:render_fat`);finish();
 const rendering=continuation(w,200);
 return {ordinary,partial,dressed,rendering,remaining:body.carcass!.remaining,recovered:body.carcass!.recovered,garment:garment.textile,consumed:w.ledger.consumed};
}
