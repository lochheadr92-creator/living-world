import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 163 releases a dissolved household's estate parcels. 11.3 days of the ordinary econ-cc3 world (a famine: 22 of 28 die in 14 days) include the first
 * releases: households whose last member died at ticks 26,275 and 26,969, and a child taken into another household at 27,043. */
export function v163Continuation(){
 const w=createWorld({...currentWorldSettings('normal','econ-cc3',{immigration:true}),rulesVersion:163});
 for(let i=0;i<27120;i++)stepWorld(w);
 if(!w.piles.some(p=>p.estate&&p.estate.hhId===0))throw Error('Rules163 reference world holds no released parcel');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules163 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
