import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {APPROACH_COMMIT_BEFORE} from '../../src/sim/company';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody is walking up to another person on an approach committed for longer than the 40 ticks every approach had before rules 200. */
export function anApproachCommittedForItsWalk(w:World):boolean{
 return w.persons.some(p=>p.alive&&p.activity?.kind==='socialize'&&p.activity.minCommit-p.activity.start>APPROACH_COMMIT_BEFORE);
}
/** Rules 200 (company.ts). Ordinary Normal gen-2 (arrivals on), 2,400 ticks, in which an approach committed for its walk must be seen
 * (checked every tick), then 120 more after a save and load. NOT YET RUN when written: if the world never shows such an approach the
 * function throws rather than recording a pin that does not exercise the rule. */
export function v200Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:200});
 let reached=false;
 for(let i=0;i<2400;i++){stepWorld(w);if(!reached&&anApproachCommittedForItsWalk(w))reached=true;}
 if(!reached)throw Error('Rules200 reference world never shows an approach committed for its walk');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules200 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
