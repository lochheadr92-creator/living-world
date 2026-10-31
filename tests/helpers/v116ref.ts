// Frozen rules-116 continuation: the ordinary river world through the first paused-activity ending review 2 found lost at rules
// 115 (a gather around tick 2,959), saved and continued. The count of paused activities that ended through the common path is part
// of the record, so the reference discriminates 116 from 115 instead of passing on either.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import type {Activity,World} from '../../src/sim/types';
export function v116Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:116});
 const ended=new Set<number>();w.hooks={onActivityEnd:(_p,a)=>ended.add(a.id)};
 let pausedEndings=0;
 for(let n=0;n<3000;n++){
  const paused=new Map<number,Activity>();for(const p of w.persons)if(p.suspended)paused.set(p.id,p.suspended);
  stepWorld(w);
  for(const p of w.persons){const a=paused.get(p.id);if(a&&p.activity?.id!==a.id&&p.suspended?.id!==a.id){if(!ended.has(a.id))throw new Error('Paused activity lost without an ending at rules 116');pausedEndings++;}}
 }
 delete w.hooks;
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}
 const uninterrupted=digest(w),continued=digest(copy);
 if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok||serializeWorld(deserializeWorld(serializeWorld(w)))!==serializeWorld(w))throw new Error('Invalid rules-116 continuation');
 return {ordinary:{pausedEndings,saved,uninterrupted,continued}};
}
