// Immutable rules-86 ordinary pressure, real sowing, partial rest work and recovery continuations.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {conditionAt,fieldResting} from '../../src/sim/ecology';
import {ecologyScene,doEcologyOption} from './ecology';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {observe} from '../../src/sim/knowledge';
import {setExternalController} from '../../src/sim/external';
import type {World} from '../../src/sim/types';
export function v86Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-86 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:86});while(w.tick<900)stepWorld(w);if(w.persons.find(p=>p.id===1147)?.activity?.targetId!==1091)throw new Error('Missing ordinary Faye fishing');const ordinary=advance(w,300);
 const seed=ecologyScene(86);doEcologyOption(seed.w,seed.p,`plant:${seed.a.id}`);if(seed.a.state!=='growing'||conditionAt(seed.w,seed.a.x,seed.a.y)!==0.84)throw new Error('Missing actual sowing');const sowing=advance(seed.w,150);
 const rest=ecologyScene(86);rest.w.ecology={[rest.a.y*rest.w.W+rest.a.x]:{condition:0.4,lastUse:rest.w.tick}};observe(rest.w,rest.p,rest.a);rest.p.cooldowns.pause=0;const o=generateOptions(rest.w,rest.p,true,true).options.find(o=>o.kind==='tend'&&o.targetId===rest.a.id);if(!o)throw new Error('Missing field-rest offer');startActivity(rest.w,rest.p,o.make!()!);const release=setExternalController({controls:(_w,p)=>p.id===rest.p.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<400&&!(rest.p.activity?.phase==='work'&&rest.p.activity.progress>=5);n++)stepWorld(rest.w);if(!rest.p.activity||rest.p.activity.phase!=='work'||rest.p.activity.progress<5)throw new Error('Missing partial rest work');
 const partialRest=advance(rest.w,150);if(!fieldResting(rest.w,rest.a)||rest.p.inv.water!==3||rest.p.inv.seeds!==6)throw new Error('Missing paid rest');while(rest.w.tick<1180)stepWorld(rest.w);const before=conditionAt(rest.w,rest.a.x,rest.a.y),recovery=advance(rest.w,150);if(conditionAt(rest.w,rest.a.x,rest.a.y)<=before)throw new Error('No actual environmental recovery');
 return {ordinary,sowing,partialRest,recovery};}finally{release();}
}
