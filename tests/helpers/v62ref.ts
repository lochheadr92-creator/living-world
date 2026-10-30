// Frozen rules-62 ordinary, indoor hand-over and full-pack care before successor behaviour.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {produce} from '../../src/sim/economy';
import {carryCap} from '../../src/sim/people';
import {indoorCareScene} from './indoor_care';
import type {World} from '../../src/sim/types';
export function v62Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:62});
 while(w.tick<6000)stepWorld(w);
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 while(w.tick<9600){stepWorld(w);stepWorld(copy);}
 const care=[];
 for(const full of [false,true]){
  const f=indoorCareScene(62);
  if(full){const cap=carryCap(f.w,f.elder);produce(f.w,f.elder.inv,cap,'wood',100,'reference full pack');produce(f.w,f.elder.inv,cap,'seeds',100,'reference full pack');}
  f.helper.cooldowns.pause=0;f.helper.nextThink=f.w.tick;stepWorld(f.w);
  const saved=digest(f.w),copy=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<600;n++){stepWorld(f.w);stepWorld(copy);}
  care.push({full,saved,uninterrupted:digest(f.w),continued:digest(copy)});
 }
 return {saved,uninterrupted:digest(w),continued:digest(copy),care};
}
