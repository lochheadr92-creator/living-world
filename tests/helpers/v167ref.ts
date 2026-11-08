import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 167 takes a carerless child in only when an adult has seen them or been told where they are. The ordinary Normal
 * 'forest' world (arrivals on) records its first such taking at tick 30643; 33,000 ticks include it, then 120 more after a save and load. */
export function v167Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:167});
 let took=false; let last=0;
 for(let i=0;i<33000;i++){
  stepWorld(w);
  for(const e of w.events) if(e.id>last && /took in/.test(e.text)) took=true;
  last=w.events.at(-1)?.id ?? last;
 }
 if(!took) throw Error('Rules167 reference world holds no adoption');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok) throw Error('Rules167 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
