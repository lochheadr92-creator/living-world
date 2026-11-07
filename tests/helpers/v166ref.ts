import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 166 weighs a spontaneous offer of food or water by how needy a stranger looks (hungry, starving; thirsty, parched). The ordinary Normal 'birch' world
 * (arrivals on) opens its first offer at tick 959; 6,000 ticks include several offers and the new signs being seen, then 120 more after a save and load. */
export function v166Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:166});
 const offers=new Set<number>();let sign=false;
 for(let i=0;i<6000;i++){stepWorld(w);for(const c of w.conversations)if(c.purpose==='offer')offers.add(c.id);if(!sign&&w.persons.some(p=>p.seen.some(s=>s.starving===true||s.parched===true)))sign=true;}
 if(!offers.size||!sign)throw Error('Rules166 reference world holds no offer or no need sign');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules166 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
