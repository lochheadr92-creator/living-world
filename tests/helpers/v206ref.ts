import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport,foodUnits} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Somebody is on the way home with food beyond the ration, and what the trip leaves in their pack is two portions: the ration of
 * rules 206 (at 205 the same trip leaves one). */
export function aTripThatLeavesTwo(w:World):boolean{
 return w.persons.some(p=>{
  const a=p.activity;if(!p.alive||a?.kind!=='deposit'||a.data.ration!==true)return false;
  const going=Object.values(a.data.items as Record<string,number>).reduce((n,x)=>n+(x??0),0);
  return going>=1&&foodUnits(p.inv)-going===2;
 });
}
/** Rules 206 (light_pack.ts). Ordinary Normal gen-2 (arrivals on), stepped until such a trip is under way (checked every 25 ticks, at
 * most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world never shows it the
 * function throws rather than recording a pin that does not exercise the rule. */
export function v206Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:206});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&aTripThatLeavesTwo(w))reached=true;}
 if(!reached)throw Error('Rules206 reference world never shows a trip home that leaves two portions');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules206 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
