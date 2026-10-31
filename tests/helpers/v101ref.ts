// Frozen rules-101 promised supply: ordinary river, a heard haul promise covering the site, the delivery, the spoken hour passing.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {promisedSupplyScene,askWood} from './promised_supply';
import type {World} from '../../src/sim/types';
export function v101Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-101 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:101});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=promisedSupplyScene(101);if(askWood(f).status!=='promised')throw new Error('No haul promise');
 if(generateOptions(f.w,f.ada,true,true).options.some(o=>(o.kind==='gather'||o.kind==='withdraw')&&o.tag==='site'&&/wood/i.test(o.label)))throw new Error('Promised wood fetched');const covered=advance(f.w,60);
 f.ada.cooldowns.pause=0;f.ben.cooldowns.pause=0;for(let n=0;n<2500&&(f.st.delivered.wood??0)<3;n++)stepWorld(f.w);if((f.st.delivered.wood??0)<3)throw new Error('No delivery');const delivered=advance(f.w,100);
 const g=promisedSupplyScene(101);askWood(g);const e=g.ada.socialMemory!.find(m=>m.expectation)!.expectation!;g.w.tick=e.deadline+1;
 if(!generateOptions(g.w,g.ada,true,true).options.some(o=>(o.kind==='gather'||o.kind==='withdraw')&&o.tag==='site'&&/wood/i.test(o.label)))throw new Error('Coverage did not end');const expired=advance(g.w,120);
 return {ordinary,covered,delivered,expired};
}
