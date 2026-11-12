import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {JOBS} from '../../src/sim/finish_job';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V227_SEED='aspen';
export const V227_TICK=2400;
const DROPPED='something better came up';
/** An ordinary world and a running count of jobs dropped at the work because something better came up (what the hold part ends). */
function counted(rules:number):{w:World;dropped:()=>number}{
 const w=createWorld({...currentWorldSettings('normal',V227_SEED,{immigration:true}),rulesVersion:rules});
 let n=0;
 w.hooks={onActivityEnd:(_p,a,outcome,detail)=>{if(outcome==='interrupted'&&a.phase==='work'&&JOBS.has(a.kind)&&detail===DROPPED)n++;}};
 return {w,dropped:()=>n};
}
/** Rules 227 (finish_job.ts). Ordinary Normal aspen (arrivals on) stepped one day beside its rules-226 twin, counting in each the
 * jobs dropped at the work because something better came up; the rules-227 world must have dropped fewer than half as many (the
 * rule is the only difference between them), then 120 more after a save and load. If it has not, the function throws rather
 * than recording a pin that does not exercise the rule. */
export function v227Continuation(){
 const now=counted(227),old=counted(226);
 while(now.w.tick<V227_TICK){stepWorld(now.w);stepWorld(old.w);}
 const dropped=now.dropped(),droppedAt226=old.dropped();
 if(!(droppedAt226>=10&&dropped*2<droppedAt226))throw Error('Rules227 reference world has not dropped fewer jobs than its rules-226 twin');
 const w=now.w;w.hooks=undefined;
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules227 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,dropped,droppedAt226};
}
