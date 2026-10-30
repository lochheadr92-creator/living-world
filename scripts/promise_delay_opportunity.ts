// Explicit rules-85 opportunity diagnostic: first ordinary sampled active-delay opportunity, within five days.
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {pendingDelayProposals} from '../src/sim/promise_delays';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:85});let found=false;const began=performance.now();
while(w.tick<12000&&!found){
 if(w.tick%120===0)for(const p of w.persons){if(!p.alive)continue;const c=pendingDelayProposals(w,p)[0];if(!c)continue;
  const raw=serializeWorld(w),ctx=generateOptions(w,p,true,true),q=w.persons.find(q=>q.id===c.to);console.log(JSON.stringify({rules:85,seed:'river',staged:false,tick:w.tick,helper:{id:p.id,name:p.name,x:p.x,y:p.y,needs:p.needs,commitment:c,requesterSeen:p.seen.find(s=>s.id===c.to),rememberedRequester:p.whereabouts[c.to],talkCooldown:p.cooldowns['talk'+c.to],relationship:p.relations[c.to]},observerOnlyRequesterTruth:q?{id:q.id,x:q.x,y:q.y,alive:q.alive,pose:q.pose,activity:q.activity?.kind}:null,critical:ctx.criticals,delayOffers:ctx.options.filter(o=>o.tag==='delay').map(o=>o.key),top:rankOptions(ctx).slice(0,5).map(o=>({key:o.key,label:o.label,util:o.util})),observerPure:serializeWorld(w)===raw,saveEqual:serializeWorld(deserializeWorld(raw))===raw,conserved:conservationReport(w).ok,seconds:(performance.now()-began)/1000},null,2));found=true;break;
 }
 if(!found)stepWorld(w);if(performance.now()-began>170000)throw new Error('Diagnostic budget exhausted');
}
if(!found)console.log(JSON.stringify({rules:85,seed:'river',tick:w.tick,found:false}));
