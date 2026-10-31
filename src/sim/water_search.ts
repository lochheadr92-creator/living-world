// A personally motivated water search: no source location or future supply is supplied here.
import {runsRulesVersion} from './rulesversion';
import type {Ctx} from './optutil';
let enabled=true;
export const waterSearchOn=()=>enabled;
export function setWaterSearch(on:boolean):void{enabled=on;}
export function waterSearchPurpose(ctx:Ctx,noWaterLead:boolean){
 if(!enabled||ctx.world.settings.dynamics!=='rich'||!runsRulesVersion(ctx.world,110)||!noWaterLead)return null;
 return {x:ctx.p.x,y:ctx.p.y,label:'Searching for water',goal:'to find water',need:'thirst' as const,afterDark:ctx.criticals.includes('thirst')};
}
