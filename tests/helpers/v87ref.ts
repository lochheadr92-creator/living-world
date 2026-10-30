// Frozen rules-87 physical water draws, changed access and pending rain continuation.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,ledgerConsume} from '../../src/sim/economy';
import {drawWater} from '../../src/sim/hydrology';
import {setExternalController} from '../../src/sim/external';
import {waterScene,startWaterOption,finishWaterOption} from './water';
import type {World} from '../../src/sim/types';
export function v87Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-87 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:87});
 while(w.tick<800){const a=w.persons.find(p=>p.id===1134)?.activity;if(a?.kind==='drink'&&a.phase==='work'&&a.progress>=3)break;stepWorld(w);}
 if(w.tick>=800)throw new Error('Missing ordinary Yan partial sip');const ordinary=advance(w,120);
 const dry=waterScene(87),b=Object.values(dry.p.beliefs).filter(b=>b.kind==='water').sort((a,b)=>Math.hypot(a.x-42,a.y-40)-Math.hypot(b.x-42,b.y-40))[0];
 finishWaterOption(dry.w,dry.p,'drink:'+b.id);if(dry.small.drawn!==2||dry.small.amount!==0)throw new Error('Missing physical depletion');const depleted=advance(dry.w,120);
 const travelling=waterScene(87),lead=Object.values(travelling.p.beliefs).filter(b=>b.kind==='water').sort((a,b)=>Math.hypot(a.x-42,a.y-40)-Math.hypot(b.x-42,b.y-40))[0];
 startWaterOption(travelling.w,travelling.p,'drink:'+lead.id);ledgerConsume(travelling.w,'water',drawWater(travelling.w,travelling.small,2),'staged competing draw');
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});let changedAccess;
 try{changedAccess=advance(travelling.w,150);if(travelling.p.beliefs[lead.id].waterSupply!=='dry')throw new Error('Missing local discovery');}finally{release();}
 const rain=waterScene(87);ledgerConsume(rain.w,'water',drawWater(rain.w,rain.small,2),'staged prior draw');rain.w.tick=59;rain.w.weather.rain=1;rain.small.rainAcc=0.99;
 const recovery=advance(rain.w,120);if(rain.small.replenished<1)throw new Error('Missing captured rain');
 return {ordinary,depleted,changedAccess,recovery};
}
