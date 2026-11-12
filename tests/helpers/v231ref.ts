import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {SourceType,World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const V231_SEED='aspen';
export const V231_TICK=2400;
const make=(version:number):World=>createWorld({...currentWorldSettings('normal',V231_SEED,{immigration:true}),rulesVersion:version});
const holding=(w:World,type:SourceType):number=>w.sources.reduce((n,s)=>n+(s.type===type?s.amount:0),0);
/** Rules 231 (deposit_plenty.ts). Ordinary Normal aspen (arrivals on), whose outcrops and ore veins are laid down holding ten
 * times what the same world holds at rules 230, stepped one day, then 120 ticks more after a save and load. If the deposits are
 * not about ten times those of rules 230 the function throws rather than recording a pin that does not exercise the rule. */
export function v231Continuation(){
 const before=make(230),w=make(231);
 const stone=[holding(before,'outcrop'),holding(w,'outcrop')],ore=[holding(before,'ore_vein'),holding(w,'ore_vein')];
 if(!(stone[0]>0&&ore[0]>0&&Math.abs(stone[1]-10*stone[0])<=5*4&&Math.abs(ore[1]-10*ore[0])<=5*4))throw Error('Rules231 reference world does not hold ten times the deposits of rules 230');
 while(w.tick<V231_TICK)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules231 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,outcropStoneAtStart:stone[1],outcropStoneAt230:stone[0],veinOreAtStart:ore[1],veinOreAt230:ore[0]};
}
