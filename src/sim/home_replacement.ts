// Housing intention uses personal knowledge; layout allocation remains an execution check.
import {isHomeType} from './constants';
import {ownHomeBeliefFor} from './shelter';
import {runsRulesVersion} from './rulesversion';
import type {Ctx} from './optutil';
import type {BuildingType,World} from './types';

let enabled=true;
export const homeReplacementOn=()=>enabled;
export function setHomeReplacement(on:boolean):void{enabled=on;}
export const hasHomeReplacement=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,108);
/** Coordinates are the remembered centre, not a fabricated live Building. */
export function layoutHome(ctx:Ctx):{type:BuildingType;x:number;y:number}|null{
 if(hasHomeReplacement(ctx.world)){
  const b=ownHomeBeliefFor(ctx.p);
  return b?{type:b.btype as BuildingType,x:b.x,y:b.y}:null;
 }
 const b=ctx.home;return b?{type:b.type,x:b.x+b.w/2,y:b.y+b.h/2}:null;
}
/** A stale/unknown home may motivate an attempt, but cannot allocate a second home. No belief is written. */
export function homeLayoutConflict(w:World,type:BuildingType,household:number,upgradeOf=0):string|null{
 if(!hasHomeReplacement(w)||upgradeOf||!isHomeType(type))return null;
 const hh=w.households.find(h=>h.id===household),home=hh?.homeId?w.byId.get(hh.homeId):undefined;
 if(!home||home.ent!=='building'||!isHomeType(home.type))return null;
 if(home.type==='lean_to'&&type!=='lean_to')return null;
 return 'the household already has housing allocated';
}
