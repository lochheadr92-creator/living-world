import type {Belief,ItemKind,Person,World} from './types';
import {runsRulesVersion} from './rulesversion';
import {toolsHeldBy} from './toolreg';
export const ownedGearRules=(w:World,k:ItemKind)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,126)&&(k==='net'||k==='trap');
/** Deployment is household work: shelf stock belonging to somebody else cannot supply it. */
export const ownedGearAt=(w:World,p:Person,id:number,k:ItemKind)=>toolsHeldBy(w,id).filter(t=>t.kind===k&&t.ownerHh===p.hhId&&!t.loan);
export function knownGearStock(w:World,p:Person,b:Belief|undefined,k:ItemKind):number|undefined{
 if(!ownedGearRules(w,k))return undefined;
 return b?.gearStock?.observer===p.id?b.gearStock.items[k]??0:0;
}
