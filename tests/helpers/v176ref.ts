import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {EMPTY_NEWS_HORIZON,isEmptyFood} from '../../src/sim/empty_news';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** A living person holds an empty food belief whose sighting is still inside the telling horizon. */
export function freshEmptyHeld(w:World):boolean{
 for(const p of w.persons){
  if(!p.alive)continue;
  for(const b of Object.values(p.beliefs))if(isEmptyFood(b)&&w.tick-b.seen<EMPTY_NEWS_HORIZON)return true;
 }
 return false;
}
/** Rules 176 lets a fresh empty food sighting be told and relayed with no personal failure of the teller's own.
 * Ordinary Normal birch (arrivals on): a fresh empty belief is held from tick 51 (sampled every 50 ticks) and the first
 * accepted empty report is at tick 422. 2400 ticks include both, then 120 more after a save and load.
 * This pin does not isolate the 176-versus-175 difference; the version label is part of the saved state. */
export function v176Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:176});
 let accepted=0,fresh=false;
 w.hooks={onNews:e=>{if(e.kind==='accepted')accepted++;}};
 for(let i=0;i<2400;i++){
  stepWorld(w);
  if(!fresh&&i%50===0&&freshEmptyHeld(w))fresh=true;
 }
 delete w.hooks;
 if(!fresh||accepted===0)throw Error('Rules176 reference world never holds a fresh empty sighting or accepts an empty report');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules176 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
