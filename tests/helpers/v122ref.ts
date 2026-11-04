// Rules-122 predecessor reference: ordinary continuation plus paid preservation
// through work, rain-paused drying, smoking and output. Never re-record for a successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {startJob,workJob,facilityTick} from '../../src/sim/facilities';
import {RECIPE_BY_ID} from '../../src/sim/recipes';
import {stage,addPerson,building,done,learn,pin} from './kit';
import type {Building,World} from '../../src/sim/types';

const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
const phase=(b:Building)=>b.ops?.job?.phase;
function continuation(w:World,ticks:number){
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-122 continuation');
  return {saved,uninterrupted,continued};
}
export function v122Continuation(){
  const natural=createWorld({...currentWorldSettings('normal','meadow',{immigration:true}),rulesVersion:122});
  for(let n=0;n<3000;n++)stepWorld(natural);
  const ordinary=continuation(natural,120);
  const s=stage('v122-paid-preservation');
  s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:122};
  const p=addPerson(s,'Ada',40.5,43.5,{hunger:100,thirst:100,energy:100});
  const q=addPerson(s,'Bram',50.5,43.5,{hunger:100,thirst:100,energy:100});
  const dry=building(s,'food_rack',40,40,p.hhId,{fish:6});
  const smoke=building(s,'food_rack',50,40,q.hhId,{meat:6,wood:2});
  done(s);learn(s.w,p,dry);learn(s.w,q,smoke);pin(p);pin(q);
  s.w.weather.rain=1;
  if(startJob(s.w,dry,p,RECIPE_BY_ID.dry_fish,p.id,'reference')||startJob(s.w,smoke,q,RECIPE_BY_ID.smoke_meat,q.id,'reference'))throw new Error('Missing reference prerequisites');
  // Explicit staged labour at the facility boundary; the ordinary fixture above
  // runs autonomous decisions. These checkpoints isolate paid process state.
  for(let n=0;n<10;n++){s.w.tick++;workJob(s.w,dry,p);workJob(s.w,smoke,q);}
  if(phase(dry)!=='work'||phase(smoke)!=='work')throw new Error('Reference did not capture paid work');
  const work=continuation(s.w,120);
  for(let n=0;n<100&&(dry.ops?.job?.phase==='work'||smoke.ops?.job?.phase==='work');n++){
    s.w.tick++;workJob(s.w,dry,p);workJob(s.w,smoke,q);
  }
  if(phase(dry)!=='burn'||phase(smoke)!=='burn')throw new Error('Reference did not capture passive processing');
  s.w.weather.rain=1;facilityTick(s.w,dry);
  if(dry.ops?.job?.blocked!=='rain pauses drying')throw new Error('Reference did not capture rain pause');
  const processing=continuation(s.w,400);
  // Explicit staged weather change, shared before the next save/copy boundary.
  s.w.weather.rain=0;
  const drying=continuation(s.w,800);
  const output={driedFish:dry.store.items.dried_fish??0,smokedMeat:smoke.store.items.smoked_meat??0};
  if(output.driedFish!==2||output.smokedMeat!==2)throw new Error('Reference did not finish both preservation processes');
  return {ordinary,work,processing,drying,output};
}
