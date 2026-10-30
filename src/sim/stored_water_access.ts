import {runsRulesVersion} from './rulesversion';
import {isSolidHome} from './constants';
import type {Activity,Building,Person,World} from './types';
let enabled=true;
export const storedWaterOn=()=>enabled;
export function setStoredWater(on:boolean):void{enabled=on;}
export const hasStoredWater=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,67);
export const isStoredDrink=(w:World,a:Activity)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,67)&&a.kind==='drink'&&a.data.fromStore===true;
export function storedWaterSource(w:World,p:Person,a:Activity):Building|null{
 if(!isStoredDrink(w,a))return null;
 const b=w.byId.get(a.targetId);
 return b?.ent==='building'&&isSolidHome(b.type)&&b.condition>0&&p.hhId!==0&&b.hhId===p.hhId&&p.indoors===b.id?b:null;
}
