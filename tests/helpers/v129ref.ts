// Record after rules129 acceptance, before successor behavior.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,consume} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {makeSheep,updateSheep} from '../../src/sim/livestock';
import {stage,addPerson,done,learn} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules129 continuation');
 return {saved,uninterrupted,continued};
}
export function v129Continuation(){
 const natural=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:129});
 for(let n=0;n<3000;n++)stepWorld(natural);
 const ordinary=continuation(natural,120);
 const s=stage('sheep-reference'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:129};w.weather.temp=10;
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:80,thirst:90,energy:90,inv:{wood:2,fibre:1,grain:4,water:2}}),a=makeSheep(w,42.5,40.5,'f');done(s);learn(w,p,a);
 const start=(op:string)=>{learn(w,p,a);const key=`sheep:${op}:${a.id}`,o=generateOptions(w,p,true,true).options.find(o=>o.key===key);if(!o)throw Error('Missing '+key);startActivity(w,p,o.make!()!);};
 const steps=(n:number)=>{for(let k=0;k<n&&p.activity;k++){w.tick++;stepActivity(w,p);}};
 const finish=()=>{steps(1200);if(p.activity)throw Error('Unfinished reference work');};
 start('acquire');steps(40);const acquisition=continuation(w,20);finish();
 start('feed');finish();start('water');finish();start('water');finish();
 for(let n=0;n<4800;n++){w.tick++;updateSheep(w,a);}
 if(a.sheep!.wool!==1)throw Error('Paid fleece not grown');
 start('shear');steps(30);const shearing=continuation(w,20);finish();
 consume(w,p.inv,'grain',p.inv.grain??0,'reference empty food pack');p.needs.hunger=35;
 start('slaughter');steps(30);const slaughter=continuation(w,20);finish();
 const body=continuation(w,120);
 return {ordinary,acquisition,shearing,slaughter,body,consumed:w.ledger.consumed,created:w.ledger.created};
}
