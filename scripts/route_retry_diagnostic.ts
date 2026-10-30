// Rules-75 staged inaccessible remembered source: count real repeat attempts without changing cooldowns or needs.
import {sourceContactScene} from '../tests/helpers/source_contact';
import {stepWorld} from '../src/sim/world';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=sourceContactScene(75,true,false),{w,p}=f,from=w.tick,failures:any[]=[],starts:any[]=[];
w.hooks={onActivityStart:(who,a)=>{if(who.id===p.id&&a.targetId===f.tree.id)starts.push({tick:w.tick,id:a.id,key:a.data.optKey,kind:a.kind});},onActivityEnd:(who,a,outcome,detail)=>{if(who.id===p.id&&a.targetId===f.tree.id)failures.push({tick:w.tick,id:a.id,phase:a.phase,outcome,detail});}};
while(w.tick<from+1200)stepWorld(w);delete w.hooks;const raw=serializeWorld(w),ctx=generateOptions(w,p,true,true);
const report={rules:75,staged:true,from,to:w.tick,person:p.id,source:f.tree.id,initialFailure:f.departure.id,starts,failures,memory:p.failures[f.tree.id],belief:p.beliefs[f.tree.id],offer:ctx.options.filter(o=>o.key===f.key).map(o=>({key:o.key,utility:o.util,reason:o.selectionReason})),pure:serializeWorld(w)===raw,conserved:conservationReport(w).ok,interpretation:'A physical staged barrier and positive remembered source. This does not establish ordinary frequency. Repeat attempts use the normal decision path and timers; no cooldown is cleared.'};if(!report.pure||!report.conserved)throw new Error('Invalid route-retry diagnostic');console.log(JSON.stringify(report,null,2));
