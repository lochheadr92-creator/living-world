// Immutable predecessor fixture: record only before adding rules 124.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,stepActivity} from '../../src/sim/activities';
import {stage,addPerson,building,done,learn,pin} from './kit';
import type {World} from '../../src/sim/types';
const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
function continuation(w:World,ticks:number){
  const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
  for(let n=0;n<ticks;n++){stepWorld(w);stepWorld(copy);}
  const uninterrupted=digest(w),continued=digest(copy);
  if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw Error('Invalid rules-123 continuation');
  return {saved,uninterrupted,continued};
}
export function v123Continuation(){
  const natural=createWorld({...currentWorldSettings('normal','river',{immigration:true}),rulesVersion:123});
  for(let n=0;n<3000;n++)stepWorld(natural);
  const ordinary=continuation(natural,120);
  const s=stage('v123-paid-hearth');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:123};
  const p=addPerson(s,'Ada',40.5,43.5,{inv:{wood:2},hunger:100,thirst:100,energy:100});
  const b=building(s,'hut',40,40,p.hhId);b.hearth={fuel:0,heat:0};done(s);learn(s.w,p,b);s.w.weather.temp=-8;
  const option=generateOptions(s.w,p,true,true).options.find(o=>o.key===`hearth_fuel:${b.id}`);
  if(!option)throw Error('Missing hearth option');
  startActivity(s.w,p,option.make!()!);
  for(let n=0;n<400&&(!p.indoors||p.activity!.progress<5);n++){s.w.tick++;stepActivity(s.w,p);}
  const working=continuation(s.w,80);
  if(!b.hearth.fuel)throw Error('No paid hearth fuel');
  pin(p);const burning=continuation(s.w,400),cooling=continuation(s.w,1000);
  if(b.hearth.fuel!==0)throw Error('Fuel did not expire');
  return {ordinary,working,burning,cooling,heat:b.hearth.heat,fuelUsed:s.w.ledger.consumed.wood};
}
