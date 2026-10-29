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
export function recordCivicBenefit(w:World,p:Person,b:Building,item:ItemKind,amount:number,how:'collected'|'ate'='collected'):void{
 if(!hasCivicBenefit(w)||b.hhId!==0||b.type!=='storehouse'||amount<=0)return;
 const memory=p.civicOutcomes?.find(m=>m.success&&m.buildingId===b.id);
 if(!memory||memory.benefit)return;
 memory.benefit={tick:w.tick,item,amount};
 addLog(w,p,'social',`The shared storehouse from project #${memory.projectId} helped me: I ${how} ${amount} ${item}. I remember who coordinated it.`);
}
// Rules 49: public food counts too. Ordinary public food use runs through `eat_store`, not `withdraw` (43 meals against 5
// withdrawals in 30 days of a rules-43 river world), so a witnessed storehouse that fed somebody earned them nothing. The
// event boundary is exact: food that actually left the public store into this person's pack during a meal there, or was eaten
// at the store because the pack was full, counted once when that meal ends. Arriving, trying an empty store, and food that
// never moved count nothing; the one-receipt-per-project bound and the ±0.12 experience bound are unchanged.
let foodEnabled=true;
export const civicFoodBenefitOn=()=>foodEnabled;
export function setCivicFoodBenefit(on:boolean):void{foodEnabled=on;}
export const hasCivicFoodBenefit=(w:World)=>foodEnabled&&hasCivicBenefit(w)&&runsRulesVersion(w,49);
/** Called when a meal at a public storehouse ends, with what actually left the store for this person. */
export function recordCivicFoodBenefit(w:World,p:Person,b:Building,item:ItemKind,units:number):void{
 if(!hasCivicFoodBenefit(w))return;
 recordCivicBenefit(w,p,b,item,units,'ate');
}
/** Keep the existing total bound. Repeated use cannot accumulate political credit. */
export function civicExperience(p:Person,id:number,w?:World):number{
 return Math.max(-0.12,Math.min(0.12,(p.civicOutcomes??[]).filter(m=>m.organiserId===id)
  .reduce((n,m)=>n+(m.success?0.04:-0.04)+(w&&hasCivicBenefit(w)&&m.success&&m.benefit?0.04:0),0)));
}
