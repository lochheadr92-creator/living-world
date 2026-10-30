// Staged preparation/need-break diagnostic; subsequent decisions are autonomous.
import {journeyScene} from '../tests/helpers/journey';
import {generateOptions} from '../src/sim/decision';
import {finishPrerequisite} from '../tests/helpers/tool_prerequisite';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {setActionScope,workWindow} from '../src/sim/action_scope';
const f=journeyScene();const events:any[]=[];
f.w.hooks={onActivityStart:(p,a)=>events.push({tick:f.w.tick,kind:a.kind,key:a.data.optKey,need:p.needs.thirst,inv:{...p.inv},plan:structuredClone(p.intentions.find(i=>i.journey))}),onActivityEnd:(_p,a,outcome,detail)=>events.push({tick:f.w.tick,kind:a.kind,outcome,detail,cycle:a.cycle})};
const prep=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor)!;finishPrerequisite(f.w,f.p,prep.key);f.p.nextThink=f.w.tick;f.p.cooldowns.pause=0;
setActionScope(false);const ctx=generateOptions(f.w,f.p,true,true),work=ctx.options.find(o=>o.key===f.key)!;console.log(JSON.stringify({rawWork:work,windows:[0,1,2].map(n=>workWindow(ctx,work,work.scopeEstimate!,n))}));setActionScope(true);
console.log(JSON.stringify({afterPrep:f.w.tick,needs:f.p.needs,inv:f.p.inv,options:generateOptions(f.w,f.p,true,true).options.map(o=>({key:o.key,util:o.util,bounds:o.bounds})),blocked:generateOptions(f.w,f.p,true,true).blocked.map(o=>({key:o.key,reason:o.blocked})),plans:f.p.intentions}));
for(let t=0;t<2400;t++)stepWorld(f.w);
console.log(JSON.stringify({events,final:f.p.intentions,conserved:conservationReport(f.w).ok},null,2));
