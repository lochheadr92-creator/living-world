// Explicit rules-83 next-gap diagnostic; real accepted roof request and physical requester discovery.
import {targetPromiseScene} from '../tests/helpers/promise_targets';
import {destroyBuilding} from '../src/sim/buildings';
import {newActivity,startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {stepWorld} from '../src/sim/world';
import {generateOptions} from '../src/sim/decision';
import {personalRequests} from '../src/sim/promise_expectations';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=targetPromiseScene(83),before={tick:f.w.tick,belief:structuredClone(f.parent.beliefs[f.hut.id]),expectation:structuredClone(f.parent.socialMemory?.find(m=>m.requestId===f.request.id))};destroyBuilding(f.w,f.hut,'collapsed in a staged requester discovery');
f.parent.cooldowns.pause=0;startActivity(f.w,f.parent,newActivity(f.w,f.parent,{kind:'wander',label:'Staged return to own damaged home',goal:'staged requester inspection',tx:60,ty:41,spotX:60,spotY:41,minCommit:700,maxTicks:1000,duration:1,data:{sticky:true}}));if(!f.parent.activity)throw new Error('Actual return did not start');
const restore=setExternalController({controls:(_w,p)=>p.id===f.parent.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<900&&f.parent.beliefs[f.hut.id];n++)stepWorld(f.w);}finally{restore();}
const raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.parent,true,true);console.log(JSON.stringify({rules:83,staged:true,before,after:{tick:f.w.tick,requester:{x:f.parent.x,y:f.parent.y,stillBelievesBuilding:!!f.parent.beliefs[f.hut.id],request:personalRequests(f.w,f.parent).find(r=>r.id===f.request.id)},helper:{x:f.helper.x,y:f.helper.y,stillBelievesBuilding:!!f.helper.beliefs[f.hut.id],commitment:f.c},cancellationOptions:ctx.options.filter(o=>o.key.includes('cancel')).map(o=>o.key)},observerPure:serializeWorld(f.w)===raw,saveEqual:serializeWorld(deserializeWorld(raw))===raw,conserved:conservationReport(f.w).ok},null,2));
