// Attendance history prevents a second visit; it must not erase the value of the visit still underway.
import {presentAt} from './market_contact';
import {runsRulesVersion} from './rulesversion';
import type {Ctx} from './optutil';
import type {Occasion} from './types';
let enabled=true;
export const occasionParticipationOn=()=>enabled;
export function setOccasionParticipation(on:boolean):void{enabled=on;}
/** Only the same physically admitted, unfinished activity. No admission, reward or sticky commitment here. */
export function continuingOccasion(ctx:Ctx,o:Occasion):boolean{
 const {world,p}=ctx,a=p.activity;
 return enabled&&world.settings.dynamics==='rich'&&runsRulesVersion(world,111)&&
  !!a&&a.kind==='attend'&&a.targetId===o.id&&a.data.occasion===o.id&&a.phase==='work'&&
  a.progress<a.duration&&o.attended.includes(p.id)&&presentAt(world,p,o);
}
