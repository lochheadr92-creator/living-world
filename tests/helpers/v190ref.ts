import {createHash} from 'node:crypto';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {createWorld} from '../../src/sim/factory';
import {isDoorTile} from '../../src/sim/grave_site';
import {currentWorldSettings} from '../../src/sim/profiles';
import type {World} from '../../src/sim/types';
import {stepWorld} from '../../src/sim/world';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
/** A grave sits next to a home's door tile and not on it: at 190 a death on a doorstep is buried beside the door. */
export function aGraveBesideADoor(w:World):boolean{
 return w.graves.some(g=>!isDoorTile(w,g.x,g.y)&&w.buildings.some(b=>(b.type==='hut'||b.type==='house')&&Math.abs(b.doorX-g.x)<=1&&Math.abs(b.doorY-g.y)<=1));
}
/** Rules 190 never digs a grave in a doorway. Ordinary Normal birch (arrivals on): at rules 188 Hugo dies of exposure at the door of a hut at
 * tick 55,027 and his grave takes the door tile; at 190 it is marked beside it (sampled every 25 ticks). 55,200 ticks include that, then
 * 120 more after a save and load. */
export function v190Continuation(){
 const w=createWorld({...currentWorldSettings('normal','birch',{immigration:true}),rulesVersion:190});
 let reached=false;
 for(let i=0;i<55200;i++){
  stepWorld(w);
  if(!reached&&i%25===0&&aGraveBesideADoor(w))reached=true;
 }
 if(!reached)throw Error('Rules190 reference world never buries anyone beside a door');
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules190 ordinary continuation failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w))};
}
