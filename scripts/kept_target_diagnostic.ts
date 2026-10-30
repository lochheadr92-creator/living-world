// Diagnosis of rules-64 planning/review; staged geometry and initial selection, actual travel/perception/review.
// Related candidate c9c5dcf uses a conflicting rules-60 meaning and is not imported here.
import {stage,addPerson,site,done,pin} from '../tests/helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {generateOptions,reviewActivity,rankOptions} from '../src/sim/decision';
import {selectPrerequisite} from '../tests/helpers/tool_prerequisite';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const s=stage('kept-target'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=64;w.tick=1000;
const p=addPerson(s,'Hana',40.5,40.5,{age:30,hunger:100,thirst:100,energy:100,traits:{diligence:.9}});
const target=site(s,'hut',44,34,p.hhId,p.id);target.required.wood=12;
const far=makeSource(w,'tree',40,58,8),nearA=makeSource(w,'tree',41,53,8),nearB=makeSource(w,'tree',42,52,8);
done(s);observe(w,p,target);observe(w,p,far);pin(p);p.cooldowns.trade=1e12;
const selected=selectPrerequisite(w,p,`gather:${far.id}`);
// Keep the initial external controller only until the comparison: unlike pin(), it allows real walking.
try{for(let i=0;i<85;i++)stepWorld(w);}finally{selected.restore();}
const before=serializeWorld(w),ctx=generateOptions(w,p,true,true),key=selected.act.data.optKey,ranked=rankOptions(ctx);
const result={rules:64,tick:w.tick,person:p.id,phase:p.activity?.phase,oldKey:key,oldOffered:ctx.options.some(o=>o.key===key),believedAmount:p.beliefs[far.id].amount,
  actualPosition:{x:p.x,y:p.y},nearSourcesSeen:[p.beliefs[nearA.id]?.seen,p.beliefs[nearB.id]?.seen],best:ranked[0]?{key:ranked[0].key,utility:ranked[0].util}:null,
  candidates:ctx.options.filter(o=>o.kind==='gather'&&o.yields==='wood').map(o=>({key:o.key,utility:o.util})),pure:serializeWorld(w)===before};
p.cooldowns.pause=0;reviewActivity(w,p);
console.log(JSON.stringify({...result,held:p.activity?.id===selected.act.id,afterKey:p.activity?.data.optKey,lastResult:p.lastResult,conservation:conservationReport(w)},null,2));
