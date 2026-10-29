// Personal use of a public project. Attribution is captured at witnessed completion,
// never reconstructed from the world's current coordinator or another person's memory.
import type { Building, ItemKind, Person, World } from './types';
import { runsRulesVersion } from './rulesversion';
import { addLog } from './events';
let enabled=true;
export const civicBenefitOn=()=>enabled;
export function setCivicBenefit(on:boolean):void{enabled=on;}
export const hasCivicBenefit=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,42);
export const receivedCivicBenefit=(w:World,p:Person,id:number)=>hasCivicBenefit(w)&&!!p.civicOutcomes?.some(m=>m.organiserId===id&&m.success&&m.benefit);

/** Called only after the physical transfer has succeeded. One receipt per project. */
export function recordCivicBenefit(w:World,p:Person,b:Building,item:ItemKind,amount:number):void{
 if(!hasCivicBenefit(w)||b.hhId!==0||b.type!=='storehouse'||amount<=0)return;
 const memory=p.civicOutcomes?.find(m=>m.success&&m.buildingId===b.id);
 if(!memory||memory.benefit)return;
 memory.benefit={tick:w.tick,item,amount};
 addLog(w,p,'social',`The shared storehouse from project #${memory.projectId} helped me: I collected ${amount} ${item}. I remember who coordinated it.`);
}
/** Keep the existing total bound. Repeated use cannot accumulate political credit. */
export function civicExperience(p:Person,id:number,w?:World):number{
 return Math.max(-0.12,Math.min(0.12,(p.civicOutcomes??[]).filter(m=>m.organiserId===id)
  .reduce((n,m)=>n+(m.success?0.04:-0.04)+(w&&hasCivicBenefit(w)&&m.success&&m.benefit?0.04:0),0)));
}
