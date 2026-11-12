import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {DAY,DAYS_PER_YEAR} from '../../src/sim/constants';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {DRY_CHANCE,LEAN_CHANCE} from '../../src/sim/hardship';
import {currentWorldSettings} from '../../src/sim/profiles';
import {hashString,hashUnit} from '../../src/sim/rng';
import {stepWorld} from '../../src/sim/world';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The first day on which the daily roll of rules 219 and earlier begins a lean season in this seed's world (no dry spell before it). */
export function firstOldLeanDay(seed:string):number{
 const key=hashString(seed);
 for(let day=2;day<DAYS_PER_YEAR;day++){
  const into=day%DAYS_PER_YEAR;
  if(into>=4&&into<8&&hashUnit(key,day,0xd217)<DRY_CHANCE)break;
  if(hashUnit(key,day,0x1ea7)<LEAN_CHANCE)return day;
 }
 throw Error('Rules220 reference seed has no early lean season under the old daily roll');
}
/** Rules 220 (lean_years.ts). Ordinary Normal aspen (arrivals on), stepped past the morning on which the old daily roll would have
 * begun a lean season (day 3 of the first year, which is never a lean year), where the world must be in no hardship; then to the
 * next multiple of 100 ticks, then 120 more after a save and load. If the world is in a hardship there the function throws rather
 * than recording a pin that does not exercise the rule. */
export function v220Continuation(){
 const w=createWorld({...currentWorldSettings('normal','aspen',{immigration:true}),rulesVersion:220});
 const day=firstOldLeanDay('aspen');
 while(w.tick<day*DAY+6)stepWorld(w);
 if(w.hardship)throw Error('Rules220 reference world is in a hardship on the morning the old daily roll began a lean season');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules220 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,day};
}
