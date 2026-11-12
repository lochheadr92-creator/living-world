import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';

const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const make=(seed:string,rules:number):World=>createWorld({...currentWorldSettings('normal',seed,{immigration:true}),rulesVersion:rules});
const FOOD=['berry_bush','fruit_tree','fish_spot','wild_grain'];
/** Wild food standing at every place in the world. */
export function regrown226(w:World):number{
 let n=0;
 for(const s of w.sources)if(FOOD.includes(s.type))n+=s.amount;
 return n;
}
export const V226_SEED='aspen';
export const V226_TICK=2400;
/** Rules 226 (plenty.ts). Ordinary Normal aspen (arrivals on) stepped one day beside its rules-225 twin, by when wild food has
 * come back twice as fast in the one as in the other; the wild food standing in the two worlds must differ there (the food rule
 * is the only difference between them), then 120 more after a save and load. If the standing food is equal the function throws
 * rather than recording a pin that does not exercise the rule. */
export function v226Continuation(){
 const w=make(V226_SEED,226),old=make(V226_SEED,225);
 while(w.tick<V226_TICK){stepWorld(w);stepWorld(old);}
 const wild=regrown226(w),wildAt225=regrown226(old);
 if(wild===wildAt225)throw Error('Rules226 reference world has the same wild food standing as its rules-225 twin');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules226 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120,wild,wildAt225};
}
