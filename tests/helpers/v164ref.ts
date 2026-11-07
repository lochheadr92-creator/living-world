import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Rules 164 makes a proposal from the proposer's own feelings and beliefs. The ordinary Normal 'birch' world (arrivals on) has a person ask another to
 * share a life at tick 16,251, so 18,000 ticks include one real proposal conversation; then 120 more after a save and load. */
export function v164Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:164});
 const asked=new Set<number>();
 for(let i=0;i<18000;i++){stepWorld(w);for(const c of w.conversations)if(c.purpose==='propose')asked.add(c.id);}
 if(!asked.size)throw Error('Rules164 reference world holds no proposal');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules164 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
