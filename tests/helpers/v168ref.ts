import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {generateOptions} from '../../src/sim/decision';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {childrenNeedingWatch} from '../../src/sim/responsibilities';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 168 offers a watch ask only to a neighbour who has seen the child or been told where they are.
 * The ordinary Normal 'birch' world (arrivals on) generates that ask by tick 8600, sampled every 200 ticks.
 * 12,000 ticks include it, then 120 more after a save and load.
 * A probe of this checkout ran forest, birch, meadow, river, aspen and cedar for 72,000 ticks: no watch was
 * requested, and every nearby adult at a watch moment had already seen the child. */
export function v168Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:168});
 let offered=false;
 for(let i=0;i<12000;i++){
  stepWorld(w);
  if(!offered&&w.tick%200===0){
   for(const p of w.persons){
    if(!p.alive||!childrenNeedingWatch(w,p).length) continue;
    if(generateOptions(w,p,true,true).options.some((o)=>o.label.includes('keep an eye'))) offered=true;
   }
  }
 }
 if(!offered) throw Error('Rules168 reference world generates no watch ask');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok) throw Error('Rules168 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
