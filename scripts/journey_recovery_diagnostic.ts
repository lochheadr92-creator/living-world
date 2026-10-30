// Rules-72 read-only staged gap: a retained exact source remains blocked although a known substitute is legal.
import {journeyScene} from '../tests/helpers/journey';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {ledgerCreate,ledgerConsume,conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {finishPrerequisite} from '../tests/helpers/tool_prerequisite';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {journeyStep} from '../src/sim/journey_state';
const f=journeyScene(72),alt=makeSource(f.w,'tree',70,58,8);ledgerCreate(f.w,'wood',alt.amount,'staged known alternative');observe(f.w,f.p,alt);
const prep=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor?.key===f.key);if(!prep)throw new Error('Missing staged preparation');
finishPrerequisite(f.w,f.p,prep.key);f.p.nextThink=f.w.tick;f.p.cooldowns.pause=0;
for(let n=0;n<1200&&f.p.activity?.data.optKey!==f.key;n++)stepWorld(f.w);const a=f.p.activity;if(a?.data.optKey!==f.key)throw new Error('Missing intended work trip');
ledgerConsume(f.w,'wood',f.tree.amount,'staged source lost after departure');f.tree.amount=0;
for(let n=0;n<1200&&f.p.activity?.id===a.id;n++)stepWorld(f.w);
const raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true),i=f.p.intentions.find(i=>i.journey)!;
const report={rules:72,staged:true,tick:f.w.tick,lastResult:f.p.lastResult,intention:i,derivedStep:journeyStep(ctx,i),knownAlternative:alt.id,alternative:ctx.options.filter(o=>o.key===`gather:${alt.id}`).map(o=>({key:o.key,label:o.label,util:o.util,scope:o.scopeEstimate})),conserved:conservationReport(f.w).ok,pure:serializeWorld(f.w)===raw};
if(!report.pure||!report.conserved)throw new Error('Invalid diagnostic');console.log(JSON.stringify(report,null,2));
