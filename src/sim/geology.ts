// Generation-owned finite deposits. This field is never consulted by inhabitant decisions.
import type {World,SourceType} from './types';
import {hashString,hashUnit} from './rng';
import {runsRulesVersion} from './rulesversion';
let enabled=true;
export function setDepositGeology(on:boolean):void{enabled=on;}
export function depositGeologyOn():boolean{return enabled;}
export function depositRichness(w:World,type:SourceType,x:number,y:number):number{
 if(!enabled||w.settings.dynamics!=='rich'||!runsRulesVersion(w,26)||!['clay_pit','ore_vein','outcrop'].includes(type))return 1;
 const seed=hashString(w.settings.seed+'|geology|'+type),scale=48;
 const gx=x/scale,gy=y/scale,ix=Math.floor(gx),iy=Math.floor(gy);
 const smooth=(t:number)=>t*t*(3-2*t),u=smooth(gx-ix),v=smooth(gy-iy);
 const a=hashUnit(ix,iy,seed),b=hashUnit(ix+1,iy,seed),c=hashUnit(ix,iy+1,seed),d=hashUnit(ix+1,iy+1,seed);
 // Independent, smoothly varying mineral layers; no camp labels or forced missing resources.
 return .55+1.1*(a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v);
}
