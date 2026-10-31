// Physical belongings retain custody after death. This does not transfer skills, plans or promises.
import {runsRulesVersion} from './rulesversion';
import {dropNear} from './buildings';
import {retagTools,toolsHeldBy} from './toolreg';
import type {Items,Person,Pile,World} from './types';
let enabled=true;
export const estateCustodyOn=()=>enabled;
export const setEstateCustody=(on:boolean):void=>{enabled=on;};
export const hasEstateCustody=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,93);
/** Called once after loan settlement, before the deceased pack is cleared. Separate parcels
 * keep borrowed/public tool identities with their actual owners rather than laundering them
 * into the deceased's household. No goods move to a survivor or a distant home. */
export function dropEstate(w:World,p:Person):Pile|null{
 const ownItems={...p.inv},parcels=new Map<number,Items>();parcels.set(p.hhId,ownItems);
 const tools=toolsHeldBy(w,p.id);
 for(const t of tools)if(t.ownerHh!==p.hhId){
  if((ownItems[t.kind]??0)<1)throw new Error('Estate tool record has no physical item');
  ownItems[t.kind]=(ownItems[t.kind]??0)-1;
  const items=parcels.get(t.ownerHh)??{};items[t.kind]=(items[t.kind]??0)+1;parcels.set(t.ownerHh,items);
 }
 let own:Pile|null=null;
 for(const [hhId,items] of [...parcels].sort(([a],[b])=>a-b)){
  const pile=dropNear(w,p.x,p.y,items,`${p.name}'s belongings`,0,undefined,{personId:p.id,hhId,deathTick:w.tick});if(!pile)continue;
  for(const t of tools)if(t.ownerHh===hhId)retagTools(w,t.kind,1,p.id,pile.id,t.id);
  if(hhId===p.hhId)own=pile;
 }
 return own;
}
export function validateEstateCustody(w:World):void{
 const allowed=w.settings.dynamics==='rich'&&runsRulesVersion(w,93),id=(n:unknown,min=1)=>Number.isSafeInteger(n)&&Number(n)>=min;
 for(const pile of w.piles){const e=pile.estate;if(e===undefined)continue;
  if(!allowed||!e||pile.mealFood||!id(e.personId)||!id(e.hhId,0)||!id(e.deathTick,0)||e.deathTick>w.tick||e.deathTick!==pile.since)throw new Error('Invalid estate custody');
  for(const t of toolsHeldBy(w,pile.id))if(t.ownerHh!==e.hhId)throw new Error('Estate tool owner mismatch');
 }
}
