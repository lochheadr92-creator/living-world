import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {councilFor} from '../../src/sim/civic_decision';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {heardHelpers} from '../../src/sim/heard_helpers';
import {beliefsByKind} from '../../src/sim/optutil';
import {stageOf} from '../../src/sim/people';
import {currentWorldSettings} from '../../src/sim/profiles';
import {helpersOn} from '../../src/sim/social';
import {projectAt} from '../../src/sim/townships';
import {stepWorld} from '../../src/sim/world';
import type {World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** The live helper count and the heard count sit on opposite sides of the recruit cap. */
export function capWouldDiffer(w:World):boolean{
 for(const p of w.persons){
  if(!p.alive||stageOf(w,p)==='child')continue;
  for(const b of beliefsByKind(p,['site'])){
   const project=projectAt(w,b.id);
   if(project&&councilFor(w,project))continue;
   const ent=w.byId.get(b.id);
   const cap=(ent&&ent.ent==='site'?ent.maxWorkers:3)+1;
   const limit=Math.min(2,cap);
   if((helpersOn(w,b.id)>=limit)!==(heardHelpers(w,p,b.id)>=limit))return true;
  }
 }
 return false;
}
/** Rules 172 counts help the asker has heard, not every living commitment.
 * Ordinary Normal aspen (arrivals on) first differs at tick 3001 when sampled every 50 ticks:
 * two people are committed and the asker has heard of none.
 * Birch, forest, meadow, river and cedar did not differ inside 12,000 ticks.
 * 8000 ticks include the aspen case, then 120 more after a save and load. */
export function v172Continuation(){
 const w=createWorld({...currentWorldSettings('normal','aspen',{immigration:true}),rulesVersion:172});
 let seen=false;
 for(let i=0;i<8000;i++){
  stepWorld(w);
  if(!seen&&i%50===0&&capWouldDiffer(w))seen=true;
 }
 if(!seen)throw Error('Rules172 reference world never has a recruit cap the heard count would decide differently');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules172 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
