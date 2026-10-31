// Frozen rules-107 checked accounts: ordinary river, and the staged account told, checked and the ask weighed, then the later sight adopted.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {observe} from '../../src/sim/knowledge';
import {tellBelief} from '../../src/sim/news';
import {checkedAccountsScene} from './checked_accounts';
import type {World} from '../../src/sim/types';
export function v107Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-107 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:107});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=checkedAccountsScene(107);const told=advance(f.w,30);
 f.goCheck();if(f.ada.relations[f.ben.id].accounts?.checked!==1)throw new Error('Not checked');
 f.ada.cooldowns.pause=0;f.ada.nextThink=f.w.tick;stepWorld(f.w);if(!/^Ask Cara where to find (food|wood)$/.test(f.ada.lastDecision?.chosen?.label??''))throw new Error('Not asked Cara: '+f.ada.lastDecision?.chosen?.label); /* which lead she lacks depends on the walk; that she asks Cara and not Ben is the contract */const asked=advance(f.w,60);
 f.goHome();for(let n=0;n<1000;n++)stepWorld(f.w);observe(f.w,f.cara,f.bush);if(!tellBelief(f.w,f.cara,f.ada,f.cara.beliefs[f.bush.id]))throw new Error('Not retold');const retold=advance(f.w,60);
 return {ordinary,told,asked,retold};
}
