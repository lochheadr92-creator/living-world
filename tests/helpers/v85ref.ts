// Immutable rules-85 ordinary building settlement, unfinished site, and heard-before-answer continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {repairDelayScene,watchDelayScene,contributedBuildScene} from './promise_delays';
import {setExternalController} from '../../src/sim/external';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import type {World} from '../../src/sim/types';
export function v85Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-85 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:85});while(w.tick<6800)stepWorld(w);const ordinary=advance(w,500);if(w.persons.find(p=>p.id===1135)?.commitments.find(c=>c.id===3814)?.status!=='done'||w.byId.get(3650)?.ent!=='site')throw new Error('Missing ordinary completed share at unfinished site');
 const b=contributedBuildScene(85);if(b.c.status!=='done'||!b.w.byId.has(b.target.id))throw new Error('Missing staged real completed share');const building=advance(b.w,150);
 const negotiation=(care:boolean)=>{const f=care?watchDelayScene(85):repairDelayScene(85);f.helper.cooldowns.pause=0;const o=rankOptions(generateOptions(f.w,f.helper,true,true)).find(o=>o.tag==='delay');if(!o)throw new Error('Missing offered delay explanation');startActivity(f.w,f.helper,o.make!()!);
  const restore=setExternalController({controls:(_w,p)=>[f.parent.id,f.helper.id].includes(p.id),choose:()=>({kind:'defer'})});try{for(let n=0;n<400&&!f.c.delay;n++)stepWorld(f.w);if(!f.c.delay||f.c.delay.response!==undefined)throw new Error('Missing heard-before-answer state');const saved=advance(f.w,150);if(f.c.delay.response!==(care?'refused':'accepted'))throw new Error('Missing actual personal answer');return saved;}finally{restore();}
 };
 return {ordinary,building,accepted:negotiation(false),refused:negotiation(true)};
}
