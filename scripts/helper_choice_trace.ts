import {helperLearningScene} from '../tests/helpers/helper_learning';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {setHelperLearning} from '../src/sim/helper_learning';
import {setExternalController} from '../src/sim/external';
import {rankOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
const f=await helperLearningScene(),decisions:any[]=[];
console.log(JSON.stringify({phase:'second workload',tick:f.w.tick,plans:f.ada.intentions,trust:f.ada.relations,options:generateOptions(f.w,f.ada,true,true).options.map(o=>({key:o.key,label:o.label,reason:o.selectionReason})),receipt:f.receipt}));
const restore=setExternalController({controls:(_w,p)=>p.id===f.ada.id,choose:(w,p,ctx,ranked)=>{
 const asks=ranked.filter(o=>o.kind==='socialize'&&o.label.endsWith('for stone'));
 if(asks.length){setHelperLearning(false);const off=rankOptions(generateOptions(w,p,true,true)).filter(o=>o.kind==='socialize'&&o.label.endsWith('for stone'));setHelperLearning(true);decisions.push({tick:w.tick,on:asks.map(o=>({target:o.targetId,util:o.util,reason:o.selectionReason})),off:off.map(o=>({target:o.targetId,util:o.util}))});}
 const chosen=ranked.find(o=>o.need&&ctx.criticals.includes(o.need))??asks[0]??ranked.find(o=>o.kind==='craft')??ranked[0];return {kind:'pick',key:chosen.key};
}});try{while(f.w.tick<4000)stepWorld(f.w);}finally{restore();setHelperLearning(true);}
console.log(JSON.stringify({decisions,requests:f.w.requests.filter(r=>r.from===f.ada.id),people:f.w.persons.map(p=>({name:p.name,inv:p.inv,x:p.x,y:p.y,plans:p.intentions,receipt:p.socialMemory})),conserved:conservationReport(f.w).ok},null,2));
