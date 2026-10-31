import {projectInputsScene} from '../tests/helpers/project_inputs';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
const {w,p,plan}=projectInputsScene();w.hooks={onActivityStart:(p,a)=>console.log(JSON.stringify({tick:w.tick,event:'start',kind:a.kind,data:a.data,goal:a.goal})),onActivityEnd:(p,a,outcome,detail)=>console.log(JSON.stringify({tick:w.tick,event:'end',kind:a.kind,progress:a.progress,outcome,detail}))};
for(let n=0;n<1200&&!(p.inv.hammer??0);n++){stepWorld(w);if(w.tick%30===0){const ctx=generateOptions(w,p,true,true);console.log(JSON.stringify({tick:w.tick,kind:p.activity?.kind,need:p.needs,inv:p.inv,plan:plan.step,wants:plan.wants,plans:p.intentions.map(i=>({id:i.id,kind:i.kind,makes:i.makes,status:i.status,wants:i.wants})),craft:ctx.options.filter(o=>o.kind==='craft').map(o=>({key:o.key,util:o.util,goal:o.goal})),top:rankOptions(ctx).slice(0,2).map(o=>({key:o.key,util:o.util}))}));}}
console.log(JSON.stringify({tick:w.tick,inv:p.inv,plan:plan.status,reasons:w.ledger.reasons}));
