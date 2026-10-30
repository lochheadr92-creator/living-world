import {completionReportScene} from '../tests/helpers/promise_knowledge';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {pendingCompletionReports} from '../src/sim/promise_knowledge';
import {senseRadius} from '../src/sim/perception';
import {startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
const f=completionReportScene(),ctx=generateOptions(f.w,f.helper,true,true);
console.log(JSON.stringify({tick:f.w.tick,parent:{id:f.parent.id,x:f.parent.x,y:f.parent.y,pose:f.parent.pose,activity:f.parent.activity},helper:{x:f.helper.x,y:f.helper.y,needs:f.helper.needs,seen:f.helper.seen,radius:senseRadius(f.w,f.helper),memory:f.helper.socialMemory},pending:pendingCompletionReports(f.w,f.helper),options:ctx.options.map(o=>({key:o.key,util:o.util,reason:o.selectionReason})),ranked:rankOptions(ctx).map(o=>o.key)},null,2));
const option=rankOptions(ctx).find(o=>o.tag==='report');if(option){f.helper.cooldowns.pause=0;const a=option.make!()!;startActivity(f.w,f.helper,a);for(let n=0;n<500;n++)stepWorld(f.w);console.log(JSON.stringify({after:f.w.tick,activity:f.helper.activity,result:f.helper.lastResult,interaction:f.helper.lastInteraction,helperMemory:f.helper.socialMemory,parentMemory:f.parent.socialMemory},null,2));}
