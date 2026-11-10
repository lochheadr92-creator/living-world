import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody's answer to a help-build ask is kept with the term that decided it. */
export function someAnswerKeepsItsCause(w:World):boolean{
 return (w.civicProjects??[]).some(q=>q.participants.some(m=>m.answerWhy!==undefined));
}
/** Rules 187 keeps the deciding term of a help-build answer. Ordinary Normal gen-2 (arrivals on): the first such answer is given at tick 7,135
 * (sampled every 25 ticks). 7,400 ticks include that, then 120 more after a save and load. */
export function v187Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:187});
 let recorded=false;
 for(let i=0;i<7400;i++){
  stepWorld(w);
  if(!recorded&&i%25===0&&someAnswerKeepsItsCause(w))recorded=true;
 }
 if(!recorded)throw Error('Rules187 reference world never holds an answer with its cause');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules187 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
