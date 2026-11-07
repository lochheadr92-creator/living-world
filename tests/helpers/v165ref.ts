import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 165 makes a fever a visible sign. In the ordinary Normal 'gen-6' world (arrivals on) Zed's fever reaches severity 0.5 at tick 49,020, the first
 * moment the world differs from the same world at rules 164; 49,500 ticks include that sign being seen, then 120 more after a save and load. */
export function v165Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-6',{immigration:true}),rulesVersion:165});
 let signSeen=false;
 for(let i=0;i<49500;i++){stepWorld(w);if(!signSeen&&w.tick>=49020&&w.persons.some(p=>p.seen.some(s=>s.feverish===true)))signSeen=true;}
 if(!signSeen)throw Error('Rules165 reference world shows no fever sign');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules165 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
