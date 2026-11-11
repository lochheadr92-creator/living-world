import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {AGE_CHILD,isHomeType} from '../../src/sim/constants';
import {conservationReport,foodUnits} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {ageYears} from '../../src/sim/people';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {Items,World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** An under-twelve is carrying food to their own household's home on a trip that does not bear the ration's mark: at rules 205 to 207
 * every such trip by somebody who knows their home store bore it. */
export function aChildsOrdinaryTripHome(w:World):boolean{
 return w.persons.some(p=>{
  const a=p.activity;if(!p.alive||ageYears(w,p)>=AGE_CHILD||a?.kind!=='deposit'||a.data.ration===true||!a.data.items)return false;
  const b=w.byId.get(a.targetId);
  return !!b&&b.ent==='building'&&b.hhId===p.hhId&&isHomeType(b.type)&&foodUnits(a.data.items as Items)>=1;
 });
}
/** Rules 208 (light_pack.ts). Ordinary Normal gen-2 (arrivals on), stepped until such a trip is under way (checked every 25 ticks, at
 * most 40,000 ticks), then to the next multiple of 100 ticks, then 120 more after a save and load. If the world never shows it the
 * function throws rather than recording a pin that does not exercise the rule. */
export function v208Continuation(){
 const w=createWorld({...currentWorldSettings('normal','gen-2',{immigration:true}),rulesVersion:208});
 let reached=false;
 for(let i=0;i<40000&&!reached;i++){stepWorld(w);if(i%25===0&&aChildsOrdinaryTripHome(w))reached=true;}
 if(!reached)throw Error('Rules208 reference world never shows a child carrying food home without the ration mark');
 while(w.tick%100!==0)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules208 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),tick:w.tick-120};
}
