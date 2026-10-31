// Option eligibility from remembered progress/materials; physical work remains in act_build.
import {runsRulesVersion} from './rulesversion';
import type {World} from './types';
let enabled=true;
export const constructionFinishOn=()=>enabled;
export function setConstructionFinish(on:boolean):void{enabled=on;}
export function knownConstructionWork(w:World,progress:number,available:number):boolean{
 if(enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,109)&&available>=1)return progress<1;
 // Preserve the historical headroom at partial-material boundaries and in old worlds.
 return progress<Math.min(1,0.06+available)-0.02;
}
