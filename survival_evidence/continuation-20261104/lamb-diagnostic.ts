// STAGED opportunity, ordinary decisions thereafter; no assigned mating or care.
import {stage,addPerson,building,done,learn} from '../../tests/helpers/kit';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import {makeSheep} from '../../src/sim/livestock';
import {makeSource} from '../../src/sim/sources';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {conservationReport} from '../../src/sim/economy';
import {livestockObserver} from '../../scripts/observers/livestock';
import {writeFileSync} from 'node:fs';
const s=stage('lamb-autonomy'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION};
const p=addPerson(s,'Ada',42.5,15.5,{hunger:90,thirst:100,energy:100,inv:{grain:5,wood:4,fibre:3,water:2}});
const home=building(s,'hut',44,16,p.hhId);w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
const ewe=makeSheep(w,40.5,15.5,'f'),ram=makeSheep(w,41.5,15.5,'m');
const fields=[makeSource(w,'wild_grain',40,16,12),makeSource(w,'wild_grain',41,16,12),makeSource(w,'berry_bush',39,16,12)];
done(s);learn(w,p,home,ewe,ram,...fields);
const twin=deserializeWorld(serializeWorld(w)),observer=livestockObserver(w),events:unknown[]=[],samples:unknown[]=[],old=w.hooks;
w.hooks={...old,onActivityStart(p,a){old?.onActivityStart?.(p,a);events.push({tick:w.tick,kind:a.kind,op:a.data.op,target:a.targetId,goal:a.goal,inv:{...p.inv}});}};
for(let n=0;n<19200;n++){
 observer.tick();
 if(n%240===0){const before=serializeWorld(w),ctx=generateOptions(w,p,true,true);observer.sample(ctx,rankOptions(ctx));samples.push({tick:w.tick,inv:{...p.inv},sheep:w.animals.filter(a=>a.sheep).map(a=>({id:a.id,x:a.x,y:a.y,state:structuredClone(a.sheep)})),best:rankOptions(ctx).slice(0,3).map(o=>({key:o.key,util:o.util})),offers:ctx.options.filter(o=>o.kind==='animal_work').map(o=>o.key)});if(serializeWorld(w)!==before)throw Error('Impure sample');}
 stepWorld(w);stepWorld(twin);
}
delete w.hooks;if(serializeWorld(w)!==serializeWorld(twin)||!conservationReport(w).ok)throw Error('Twin or conservation failed');
const report={version:CURRENT_RULES_VERSION,staged:true,events,samples,livestock:observer.report(),conservation:conservationReport(w),exactTwin:true};
writeFileSync('survival_evidence/continuation-20261104/lamb-diagnostic-'+CURRENT_RULES_VERSION+'.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.livestock));
