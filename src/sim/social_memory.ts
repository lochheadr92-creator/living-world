import {hasPromiseTargets} from './promise_targets';
import {hasPromiseExpectations,endExpectation} from './promise_expectations';
import {hasPromiseOutcomes,unresolvedOutcome} from './promise_outcomes';
import { hyp } from './util';
// A bounded durable receipt of an answered request. Requests/commitments still own
// execution; this retains the known outcome after those operational records expire.
import type { World, Request } from './types';
import { runsRulesVersion } from './rulesversion';
import {taskReceipt} from './helper_learning';
import {hasPromiseKnowledge,completionContact,canWitnessCompletion} from './promise_knowledge';
export function rememberRequest(w: World, r: Request): void {
 if (w.settings.dynamics !== 'rich' || !runsRulesVersion(w,13) || !(['declined','fulfilled','partial','broken','interrupted','failed'].includes(r.status)||hasPromiseOutcomes(w)&&!!r.commitmentId&&r.status==='expired'||hasPromiseTargets(w)&&r.status==='cancelled'&&w.persons.find(p=>p.id===r.to)?.commitments.some(c=>c.requestId===r.id&&!!c.targetEvidence))) return;
 for(const [id,otherId,role] of [[r.from,r.to,'asker'],[r.to,r.from,'helper']] as const){
  const p=w.byId.get(id);if(!p||p.ent!=='person'||!p.alive)continue;
  const other=w.byId.get(otherId);
  if(role==='asker'&&hasPromiseExpectations(w)&&r.commitmentId&&!['fulfilled','partial'].includes(r.status))continue;
  if(role==='asker'&&hasPromiseOutcomes(w)&&r.commitmentId&&unresolvedOutcome(r.status))continue;
  if(role==='asker' && (!other || other.ent!=='person' || p.indoors!==other.indoors || hyp(p.x-other.x,p.y-other.y)>3))continue;
  if(role==='asker'&&hasPromiseKnowledge(w)&&other?.ent==='person'&&(!completionContact(w,p,other)||(r.commitmentId&&['fulfilled','partial'].includes(r.status)&&!canWitnessCompletion(w,p,other,r))))continue;
  const memories=p.socialMemory??=[];
  const existing=memories.find(m=>m.requestId===r.id);
  const task=taskReceipt(w,r,role);
  if(existing){if(hasPromiseExpectations(w)&&existing.expectation&&role==='asker'){existing.tick=w.tick;existing.outcome=r.status;existing.reason=r.note||'reason not recorded';existing.task=task;endExpectation(w,existing,'observed completion');}
   // A handback proposal creates a helper receipt before the watch ends. If the
   // discussion is refused or interrupted, later actual work still owns its outcome.
   if(runsRulesVersion(w,97)&&role==='helper'&&existing.careHandback){existing.tick=w.tick;existing.outcome=r.status;existing.reason=r.note||'reason not recorded';existing.task=task;}
   continue;}
  memories.push({requestId:r.id,otherId,siteId:r.siteId,tick:w.tick,outcome:r.status,reason:r.note||'reason not recorded',role,...(task?{task}:{})});
  if(memories.length>32)memories.shift();
 }
}
