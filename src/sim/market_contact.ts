// Physical admission boundary for an occasion. Attendance history is not presence.
import type { World,Person,Occasion } from './types';
import { runsRulesVersion } from './rulesversion';
import { hyp } from './util';
let enabled=true;
export const localMarketOn=()=>enabled;
export function setLocalMarket(on:boolean):void{enabled=on;}
export const hasLocalMarket=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,16);
export function presentAt(w:World,p:Person,o:Occasion):boolean{
 const place=w.byId.get(o.placeId);
 return p.alive&&!p.indoors&&p.pose!=='sleep'&&o.status==='gathering'&&w.tick>=o.at&&w.tick<o.until&&place?.ent==='building'&&place.condition>0&&hyp(p.x-o.x,p.y-o.y)<=8;
}
export const togetherAt=(w:World,a:Person,b:Person,o:Occasion)=>presentAt(w,a,o)&&presentAt(w,b,o)&&hyp(a.x-b.x,a.y-b.y)<=3;
