// Creation-time personal experience. No global assignment, extra RNG draws, or later
// birthday grants: the existing skills and held techniques carry all consequences.
import type {Person,SkillKey,Skills,World} from './types';
import {hashString,hashUnit} from './rng';
import {runsRulesVersion} from './rulesversion';
import {SKILL_MAX} from './constants';
export interface Background {kind:'inexperienced'|'specialist'|'generalist'|'experienced';specialty:SkillKey|null}
const KEYS:SkillKey[]=['forage','fish','wood','stone','build','farm','craft','carpentry','kiln','smith','bake'];
let enabled=true;
export const backgroundsOn=()=>enabled;
export function setBackgrounds(on:boolean):void{enabled=on;}
export const variedBackgrounds=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,44);
const draw=(w:World,id:number,salt:number)=>hashUnit(hashString(w.seed),id,4400+salt);
export function backgroundFor(w:World,id:number):Background{
 const u=draw(w,id,0);
 const kind=u<.22?'inexperienced':u<.70?'specialist':u<.90?'generalist':'experienced';
 return {kind,specialty:kind==='specialist'?KEYS[Math.floor(draw(w,id,1)*KEYS.length)]:null};
}
/** Existing random skill draws still happen in people.ts, preserving all other draws. */
export function backgroundSkills(w:World,id:number,drawn:Skills):Skills{
 if(!variedBackgrounds(w))return drawn;
 const b=backgroundFor(w,id),skills={...drawn};
 for(let i=0;i<KEYS.length;i++){
  const key=KEYS[i],u=draw(w,id,10+i);
  const value=b.kind==='inexperienced'?.35+.4*u:b.kind==='generalist'?.85+.4*u:b.kind==='experienced'?1.2+.5*u:b.specialty===key?1.55+.25*u:.5+.5*u;
  skills[key]=Math.min(SKILL_MAX,value);
 }
 return skills;
}
/** Knowing the firing procedure and being quick at kiln work remain separate facts. */
export function backgroundKnowsCharcoal(w:World,id:number):boolean{
 const b=backgroundFor(w,id);
 return b.specialty==='kiln'||draw(w,id,30)<(b.kind==='inexperienced'?.05:b.kind==='experienced'?.75:b.kind==='generalist'?.3:.15);
}
/** Rules 52: the smithy's procedures at creation, from the same background with their own salts; forging only with smelting. */
export function backgroundKnows(w:World,id:number,kind:'smelting'|'forging'):boolean{
 const b=backgroundFor(w,id);
 if(kind==='smelting')return b.specialty==='smith'||draw(w,id,31)<(b.kind==='inexperienced'?0:b.kind==='experienced'?.35:b.kind==='generalist'?.1:.04);
 return b.specialty==='smith'||draw(w,id,32)<.6;
}
export function backgroundDescription(p:Person):string{
 const b=p.background;if(!b)return '';
 return b.kind==='inexperienced'?'Started with little practical experience.':b.kind==='experienced'?'Started with broad practical experience.':b.kind==='generalist'?'Started with a general practical background.':`Started with a specialty in ${b.specialty}; other skills may be much less developed.`;
}
