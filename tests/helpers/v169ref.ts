import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import type {ItemKind, Items, World} from '../../src/sim/types';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
function liveItems(w:World,id:number):Items|null{
 const e=w.byId.get(id);
 if(!e)return null;
 if(e.ent==='building')return e.store.items;
 if(e.ent==='cart')return e.load;
 if(e.ent==='pile')return e.items;
 return null;
}
/** A belief holds one of a kind the container really holds more of. That is the glance, not an exact copy. */
export function sawCoarseStock(w:World):boolean{
 for(const p of w.persons){
  if(!p.alive)continue;
  for(const b of Object.values(p.beliefs)){
   if(b.kind!=='building'&&b.kind!=='cart'&&b.kind!=='pile')continue;
   const live=liveItems(w,b.id);
   if(!live||!b.items)continue;
   for(const k in live){
    const have=live[k as ItemKind]??0;
    if(have>1&&(b.items[k as ItemKind]??0)===1)return true;
   }
  }
 }
 return false;
}
/** Rules 169 remembers a store, cart or pile as a glance. The ordinary Normal 'birch' world (arrivals on)
 * has such a belief by tick 12000, sampled every 200 ticks. 12000 ticks include it, then 120 more after a save and load. */
export function v169Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:169});
 let glanced=false;
 for(let i=0;i<12000;i++){
  stepWorld(w);
  if(!glanced&&w.tick%200===0&&sawCoarseStock(w))glanced=true;
 }
 if(!glanced)throw Error('Rules169 reference world never remembers one of a kind the container holds more of');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules169 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
