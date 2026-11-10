import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {HUNGER_RATE_195,THIRST_RATE_195,hungerRate,thirstRate} from '../../src/sim/metabolism';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 195 drains hunger and thirst at the manageable base rates from the first tick, so the 195 trajectory parts from 194 at once.
 * Ordinary Normal gen-2 (arrivals on): 2,400 ticks under the 195 rates, then 120 more after a save and load. */
export function v195Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:195});
 if(hungerRate(w)!==HUNGER_RATE_195||thirstRate(w)!==THIRST_RATE_195)throw Error('Rules195 reference world does not run the 195 rates');
 for(let i=0;i<2400;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules195 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
