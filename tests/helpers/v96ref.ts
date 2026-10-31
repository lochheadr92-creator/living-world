// Frozen rules-96 personally heard fire duties and actual fuel work.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,produce} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {destroyBuilding} from '../../src/sim/buildings';
import {warmthDutyScene,requestWarmth} from './warmth_duty';
import type {World} from '../../src/sim/types';
export function v96Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-96 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:96});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=warmthDutyScene(96);requestWarmth(f);if(f.helper.beliefs[f.fire.id]?.src!=='told')throw new Error('Missing heard fire');const heard=advance(f.w,30);
 for(let n=0;n<400&&!(f.helper.activity?.kind==='gather'&&f.helper.activity.progress>4);n++)stepWorld(f.w);
 if(f.helper.activity?.kind!=='gather'||f.helper.activity.progress<=4)throw new Error('Missing paid fuel acquisition');const paid=advance(f.w,400);
 if(f.helper.commitments.find(c=>c.milestone==='fire kept')?.status!=='done')throw new Error('No actual fuel completion');
 const loss=warmthDutyScene(96);requestWarmth(loss);produce(loss.w,loss.helper.inv,12,'wood',1,'declared carried fuel');const o=generateOptions(loss.w,loss.helper,true,true).options.find(o=>o.kind==='fuel_fire');if(!o)throw new Error('No legal fuel offer');startActivity(loss.w,loss.helper,o.make!()!);destroyBuilding(loss.w,loss.fire,'declared target loss after departure');const missing=advance(loss.w,80);
 if(loss.helper.commitments.find(c=>c.milestone==='fire kept')?.status!=='moot')throw new Error('Missing personally learned target absence');
 return {ordinary,heard,paid,missing};
}
