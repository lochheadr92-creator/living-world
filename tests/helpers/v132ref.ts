import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {startActivity,stepActivity,newActivity} from '../../src/sim/activities';
import {updateNeeds} from '../../src/sim/needs';
import {stage,addPerson,done} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules132 continuation');
 return {saved,uninterrupted,continued};
}
export function v132Continuation(){
 const natural=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:132});
 for(let n=0;n<3000;n++)stepWorld(natural);
 const ordinary=continuation(natural,120);
 const s=stage('paid-nourishment'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:132};
 const p=addPerson(s,'Ada',40.5,40.5,{age:28,hunger:50,thirst:90,energy:90,inv:{berries:2}});done(s);w.weather.temp=20;p.needs.warmth=90;
 startActivity(w,p,newActivity(w,p,{kind:'eat',label:'Eat',goal:'eat',here:true,data:{limit:{portions:1}}}));
 for(let n=0;n<10;n++){w.tick++;stepActivity(w,p);}
 const midMeal=continuation(w,40);
 if(!(p.nourishment!>0))throw Error('No paid nourishment');
 p.health=50;p.pose='sleep';for(let n=0;n<30;n++){w.tick++;updateNeeds(w,p);}
 const recovery=continuation(w,10);
 p.needs.hunger=0;const shortage=continuation(w,200);
 return {ordinary,midMeal,recovery,shortage,nourishment:p.nourishment,health:p.health,consumed:w.ledger.consumed};
}
