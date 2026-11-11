import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody is on their way home with food beyond the one portion they keep, or with wood or stone nothing of theirs needs: trips
 * that rules 204 and earlier never made for those reasons (the deposit carries the mark of rules 205). */
export function aPackBeingPutDown(w:World):boolean{
 return w.persons.some(p=>p.alive&&p.activity?.kind==='deposit'&&(p.activity.data.ration===true||p.activity.data.packMaterials===true));
}
/** Rules 205 (light_pack.ts). Ordinary Normal gen-2 (arrivals on), stepped until such a trip is under way (checked every 25 ticks, at
 * most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world never shows it the
 * function throws rather than recording a pin that does not exercise the rule. */
export function v205Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:205});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&aPackBeingPutDown(w))reached=true;}
 if(!reached)throw Error('Rules205 reference world never shows a pack being put down');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules205 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
