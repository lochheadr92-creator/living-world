// Saving a seed is the existing grain-to-seed conversion, and must pay its grain input.
import {consume,produce} from './economy';
import {carryCap} from './people';
import {runsRulesVersion} from './rulesversion';
import type {Person,World} from './types';
let enabled=true;
export const wildSeedInputOn=()=>enabled;
export function setWildSeedInput(on:boolean):void{enabled=on;}
const requiresInput=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,113);
/** Called after the unchanged seed-chance draw. Returns the harvest units no longer retained as food. */
export function saveSeedFromGrain(w:World,p:Person):number{
 const checked=requiresInput(w);
 if(checked&&(p.inv.grain??0)<1)return 0;
 const paid=consume(w,p.inv,'grain',1,'saved as seed');
 if(!checked||paid===1)produce(w,p.inv,carryCap(w,p),'seeds',1,'seed saved from wild grain');
 return checked?paid:1;
}
