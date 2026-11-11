import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {earnedAccess} from '../../src/sim/facilities';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody is at work at a workplace they have no earned access to (not their household's, not one they built a fifth of, no
 * friend among its owners, not communal): a guest, whom rules 206 and earlier never let begin. */
export function aGuestAtWork(w:World):boolean{
 return w.persons.some(p=>{
  const a=p.activity;if(!p.alive||a?.kind!=='operate')return false;
  const b=w.byId.get(a.targetId);
  return !!b&&b.ent==='building'&&earnedAccess(w,p,b)==='none';
 });
}
/** Rules 207 (open_workplaces.ts). Ordinary Normal world (arrivals on), stepped until a guest is at work at a workplace (checked every
 * 25 ticks, at most 60,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world never
 * shows it the function throws rather than recording a pin that does not exercise the rule. */
export function v207Continuation(seed='gen-2'){
 const w=createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:207});
 let reached=false;
 for(let i=0;i<60000&&!reached;i++){stepWorld(w);if(i%25===0&&aGuestAtWork(w))reached=true;}
 if(!reached)throw Error('Rules207 reference world never shows a guest at work at a workplace');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules207 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
