import { hyp } from './util';
// A bounded durable receipt of an answered request. Requests/commitments still own
// execution; this retains the known outcome after those operational records expire.
import type { World, Request } from './types';
import { runsRulesVersion } from './rulesversion';
import {taskReceipt} from './helper_learning';
import {hasPromiseKnowledge,completionContact,canWitnessCompletion} from './promise_knowledge';
export function rememberRequest(w: World, r: Request): void {
 if (w.settings.dynamics !== 'rich' || !runsRulesVersion(w,13) || !['declined','fulfilled','partial','broken','interrupted','failed'].includes(r.status)) return;
 for(const [id,otherId,role] of [[r.from,r.to,'asker'],[r.to,r.from,'helper']] as const){
  const p=w.byId.get(id);if(!p||p.ent!=='person'||!p.alive)continue;
  const other=w.byId.get(otherId);
  if(role==='asker' && (!other || other.ent!=='person' || p.indoors!==other.indoors || hyp(p.x-other.x,p.y-other.y)>3))continue;
  if(role==='asker'&&hasPromiseKnowledge(w)&&other?.ent==='person'&&(!completionContact(w,p,other)||(r.commitmentId&&['fulfilled','partial'].includes(r.status)&&!canWitnessCompletion(w,p,other,r))))continue;
  const memories=p.socialMemory??=[];
  if(memories.some(m=>m.requestId===r.id))continue;
  const task=taskReceipt(w,r,role);
  memories.push({requestId:r.id,otherId,siteId:r.siteId,tick:w.tick,outcome:r.status,reason:r.note||'reason not recorded',role,...(task?{task}:{})});
  if(memories.length>32)memories.shift();
 }
}
