// Freeze rules-70 ordinary and earned-preference behavior before its successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,consume,ledgerConsume} from '../../src/sim/economy';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {DAY} from '../../src/sim/constants';
import {dailyRoutineScene} from './daily_routine';
import {selectPrerequisite} from './tool_prerequisite';
import type {World} from '../../src/sim/types';
export function v70Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-70 reference');
  return {saved,uninterrupted,continued};
 };
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:70});
 while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const trained=()=>{const f=dailyRoutineScene(70);for(let d=0;d<3;d++)f.practice(d);return f;};
 const f=trained();consume(f.w,f.p.inv,'wood',f.p.inv.wood??0,'staged use');f.p.x=40;f.p.y=40;
 let changed=false;const learned=f.p.dailyRoutines;
 for(let offset=0;offset<480;offset+=32){f.w.tick=3*DAY+offset;f.p.dailyRoutines=undefined;const before=rankOptions(generateOptions(f.w,f.p,true,true));f.p.dailyRoutines=learned;const after=rankOptions(generateOptions(f.w,f.p,true,true));if(before[0]?.key!==f.key&&after[0]?.key===f.key){changed=true;break;}}
 if(!changed)throw new Error('Missing matched preference choice');f.p.nextThink=f.w.tick;stepWorld(f.w);
 if(f.p.activity?.targetId!==f.a.id||!f.p.lastDecision?.because.includes('learned morning preference'))throw new Error('Missing learned trip');
 const chosenTrip=advance(f.w,1200);
 const g=dailyRoutineScene(70),choice=selectPrerequisite(g.w,g.p,g.key);choice.restore();const firstTrip=advance(g.w,600);
 const h=trained();consume(h.w,h.p.inv,'wood',h.p.inv.wood??0,'staged use');h.p.x=40;h.p.y=40;h.w.tick=3*DAY;
 const doomed=selectPrerequisite(h.w,h.p,h.key);doomed.restore();ledgerConsume(h.w,'wood',h.a.amount,'staged depletion');h.a.amount=0;
 const depleted=advance(h.w,600);
 if(!h.p.dailyRoutines?.entries.some(e=>e.key===h.key&&e.failures>0))throw new Error('Missing failed-trip evidence');
 const r=trained();r.p.injury={kind:'sprain',since:r.w.tick,until:r.w.tick+DAY,how:'staged injury'};
 const changedContext=advance(r.w,1200);
 return {ordinary,firstTrip,chosenTrip,depleted,changedContext};
}
