// A conversation pauses participation; an occasion id is not an entity id.
import {runsRulesVersion} from './rulesversion';
import {hyp} from './util';
import type {Activity,Person,World} from './types';
let enabled=true;
export const occasionRecoveryOn=()=>enabled;
export function setOccasionRecovery(on:boolean):void{enabled=on;}
export const hasOccasionRecovery=(w:World,a:Activity)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,112)&&a.kind==='attend';
/** Execution revalidation only. No extra time, admission, reward or route knowledge is granted. */
export function occasionResumeFailure(w:World,p:Person,a:Activity):string|null{
 if(w.tick>a.expire)return 'the gathering trip has taken too long';
 const o=w.occasions?.find(o=>o.id===a.data.occasion&&o.id===a.targetId);
 if(!o||o.status==='done'||w.tick>=o.until)return 'the occasion is over';
 const place=w.byId.get(o.placeId);
 if(!place||place.ent!=='building'||place.condition<=0)return 'the gathering place is gone';
 if(a.phase==='work'){
  if(p.indoors||p.pose==='sleep'||hyp(p.x-o.x,p.y-o.y)>8)return 'I am no longer at the gathering';
  if(a.progress>=a.duration)return 'the visit has already run its course';
 }else if(o.attended.includes(p.id))return 'I already left this occasion';
 return null;
}
