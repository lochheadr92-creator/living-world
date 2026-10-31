// Frozen rules-105 location question: ordinary river and a staged failed hand-over answered by a bystander, then delivered.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {setExternalController} from '../../src/sim/external';
import {hashUnit} from '../../src/sim/rng';
import {locationQuestionScene} from './location_question';
import type {World} from '../../src/sim/types';
export function v105Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-105 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:105});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=locationQuestionScene(105);const setAside=advance(f.w,30);
 for(let n=0;n<400&&hashUnit(f.cara.id,f.ben.id,f.w.tick>>4)>=0.9;n++)stepWorld(f.w);
 f.ben.cooldowns.pause=0;f.cara.nextThink=f.w.tick+600;const o=generateOptions(f.w,f.ben,true,true).options.find(o=>o.label==='Ask Cara where Ada is');if(!o)throw new Error('No question offered');startActivity(f.w,f.ben,o.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<400;n++){stepWorld(f.w);const r=f.w.requests.find(r=>r.kind==='info'&&r.from===f.ben.id);if(r&&r.status!=='pending'&&!f.ben.convId)break;}}finally{release();}
 if(f.ben.whereabouts[f.ada.id]?.from!==f.cara.id)throw new Error('No told note');const told=advance(f.w,60);
 f.ben.cooldowns.pause=0;for(let n=0;n<2500&&f.request.status==='promised';n++)stepWorld(f.w);if((f.request.status as string)!=='fulfilled')throw new Error('No delivery');const delivered=advance(f.w,60);
 return {ordinary,setAside,told,delivered};
}
