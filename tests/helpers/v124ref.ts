// Record only after accepting rules 124 and before adding any successor behaviour.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {clothingScene} from './clothing';
import {learn,pin} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules-124 continuation');
 return {saved,uninterrupted,continued};
}
export function v124Continuation(){
 const natural=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:124});
 for(let n=0;n<3000;n++)stepWorld(natural);
 const ordinary=continuation(natural,120);
 const {w,p,b}=clothingScene();
 const start=(key:string)=>{const o=generateOptions(w,p,true,true).options.find(o=>o.key===key);if(!o)throw Error('Missing '+key);startActivity(w,p,o.make!()!);};
 const finish=()=>{for(let n=0;n<800&&p.activity;n++){w.tick++;stepActivity(w,p);}if(p.activity)throw Error('Unfinished textile work');learn(w,p,b);};
 start(`operate:${b.id}:strip_fibre`);finish();
 start(`operate:${b.id}:weave_garment`);
 for(let n=0;n<400&&(p.activity?.phase!=='work'||p.activity.progress<25);n++){w.tick++;stepActivity(w,p);}
 const weaving=continuation(w,30);finish();
 start(`collect:${b.id}:garment`);finish();
 const t=w.tools.find(t=>t.kind==='garment'&&t.holder===p.id);if(!t)throw Error('Missing paid garment');
 start(`dress:${t.id}`);for(let n=0;n<8;n++){w.tick++;stepActivity(w,p);}
 const dressing=continuation(w,20);pin(p);
 w.weather.rain=1;const exposed=continuation(w,300);
 return {ordinary,weaving,dressing,exposed,paidWood:w.ledger.consumed.wood,paidFibre:w.ledger.consumed.fibre,garment:{wear:t.wear,textile:t.textile}};
}
