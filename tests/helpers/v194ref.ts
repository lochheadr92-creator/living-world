import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody holds an argument paused under another argument: the nesting rules 194 refuses (it happens at 193 in ordinary gen-2 at tick 252). */
export function anArgumentPausedUnderAnArgument(w:World):boolean{
 return w.persons.some(p=>p.alive&&p.activity?.kind==='argue'&&p.suspended?.kind==='argue');
}
/** Rules 194 never starts an argument on somebody already arguing. Ordinary Normal gen-2 (arrivals on): at rules 193 an argument is paused under
 * another at tick 252, so the 194 trajectory parts from 193 there. 2,400 ticks, checked every tick for the nesting (which must never occur),
 * then 120 more after a save and load. */
export function v194Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:194});
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(anArgumentPausedUnderAnArgument(w))throw Error('Rules194 reference world nested an argument at tick '+w.tick);
 }
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules194 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
