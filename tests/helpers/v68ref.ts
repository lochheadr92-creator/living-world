// Freeze rules-68 ordinary and physical water-care recovery before its successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,produce} from '../../src/sim/economy';
import {leaveHome} from '../../src/sim/habitation';
import {abortActivity} from '../../src/sim/activities';
import {careWaterScene} from './care_water';
import {selectPrerequisite} from './tool_prerequisite';
import type {World} from '../../src/sim/types';

export function v68Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-68 reference');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:68});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=careWaterScene(68);f.failGift();f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;stepWorld(f.w);
 if(!f.helper.activity?.data.careWaterStore)throw new Error('Missing autonomous water provision');
 const provision=advance(f.w,800);
 const g=careWaterScene(68);g.failGift();const selected=selectPrerequisite(g.w,g.helper,g.key);selected.restore();
 produce(g.w,g.home.store.items,g.home.store.cap,'seeds',1000,'staged competing storage');
 const fullStore=advance(g.w,400);
 const mixed=careWaterScene(68);mixed.elder.needs.hunger=20;mixed.failGift();const mixedFailure=advance(mixed.w,800);
 const h=careWaterScene(68);h.failGift();if(leaveHome(h.w,h.helper))throw new Error('Cannot leave');
 const departure=selectPrerequisite(h.w,h.helper,'explore');
 try{for(let n=0;n<100;n++)stepWorld(h.w);}finally{departure.restore();}
 abortActivity(h.w,h.helper,'staged exploration departure completed');
 const returning=selectPrerequisite(h.w,h.helper,h.key);returning.restore();
 for(let n=0;n<200&&h.helper.activity?.kind!=='converse';n++)stepWorld(h.w);
 if(h.helper.activity?.kind!=='converse')throw new Error('Missing real conversation suspension');
 const suspendedReturn=advance(h.w,1000);
 if(returning.act.cycle!==1)throw new Error('Suspended provision did not resume');
 return {ordinary,provision,fullStore,mixedFailure,suspendedReturn};
}
