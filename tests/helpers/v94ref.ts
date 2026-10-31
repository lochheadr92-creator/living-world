// Frozen rules-94 offered handover, saved acceptance, actual cover work and agreed return.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,snapshotInitial} from '../../src/sim/economy';
import {setExternalController} from '../../src/sim/external';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {observe} from '../../src/sim/knowledge';
import {perceive} from '../../src/sim/perception';
import {makeSource} from '../../src/sim/sources';
import {computeWaterDist,computeAccessCells} from '../../src/sim/worldgen';
import {initializeWater} from '../../src/sim/hydrology';
import {personalHandovers} from '../../src/sim/handover_state';
import {continuityScene} from './continuity';
import {T,type World} from '../../src/sim/types';
export function v94Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-94 continuation');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:94});for(let n=0;n<600;n++)stepWorld(w);const ordinary=advance(w,120);
 const f=continuityScene(94,true);f.w.terrain[38*f.w.W+40]=T.SHALLOW;delete f.w.waterBodies;initializeWater(f.w);computeWaterDist(f.w);computeAccessCells(f.w);observe(f.w,f.b,makeSource(f.w,'berry_bush',43,39,12));snapshotInitial(f.w);
 f.a.injury={kind:'sprain',since:0,until:2400,how:'declared staged incapacity'};f.a.cooldowns.pause=0;f.b.cooldowns.pause=0;f.b.nextThink=600;perceive(f.w,f.a);perceive(f.w,f.b);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  const offer=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('handover_work'));if(!offer)throw new Error('Missing offered handover');startActivity(f.w,f.a,offer.make!()!);
  for(let n=0;n<300&&!personalHandovers(f.b).length;n++)stepWorld(f.w);
  if(personalHandovers(f.b)[0]?.state!=='proposed')throw new Error('Missing hearing boundary');
  const hearing=advance(f.w,35);if(personalHandovers(f.b)[0].state!=='accepted'||f.plan.status!=='dropped')throw new Error('Missing actual acceptance');
  for(let n=0;n<70;n++)stepWorld(f.w);
  const helper=setExternalController({controls:(_w,p)=>p.id!==f.b.id,choose:()=>({kind:'defer'})});try{for(let n=0;n<1800&&(f.st.delivered.wood??0)<1;n++)stepWorld(f.w);}finally{helper();}
  const plan=f.b.intentions.find(i=>i.handoverId)!;if((f.st.delivered.wood??0)<1||plan?.status!=='active'||plan.worked<1)throw new Error('Missing retained-plan useful work');
  const delivery=advance(f.w,4);delete f.a.injury;perceive(f.w,f.a);const back=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('handover_work')&&o.targetId===f.b.id);if(!back)throw new Error('Missing handback conversation');startActivity(f.w,f.a,back.make!()!);
  const handback=advance(f.w,120);if(personalHandovers(f.a)[0].state!=='returned'||String(plan.status)!=='dropped'||!f.a.intentions.some(i=>i.status==='active'&&i.kind==='shelter'&&i.worked===0))throw new Error('Missing informed handback');
  return {ordinary,hearing,delivery,handback};
 }finally{release();}
}
