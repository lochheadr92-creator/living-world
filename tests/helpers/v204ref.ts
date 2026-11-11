import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {AGE_CHILD} from '../../src/sim/constants';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {ageYears} from '../../src/sim/people';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** A grown person who has gathered six units or fewer means to make a basket: what rules 203 and earlier never allowed (the want
 * needed more than six units gathered). */
export function aBasketMeantFromTheStart(w:World):boolean{
 return w.persons.some(p=>p.alive&&ageYears(w,p)>=AGE_CHILD&&p.stats.gathered<=6&&p.intentions.some(i=>i.status==='active'&&i.kind==='tool'&&i.makes==='basket'));
}
/** Rules 204 (carry_more.ts). Ordinary Normal gen-2 (arrivals on), stepped until a grown person who has gathered six units or fewer
 * means to make a basket (checked every 25 ticks, at most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a
 * save and load. If the world never shows it the function throws rather than recording a pin that does not exercise the rule. */
export function v204Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:204});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&aBasketMeantFromTheStart(w))reached=true;}
 if(!reached)throw Error('Rules204 reference world never shows a basket meant by someone who has gathered six units or fewer');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules204 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
