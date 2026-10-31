import{readFileSync,writeFileSync}from'node:fs';
import{deserializeWorld}from'../src/app/save';
import{stepWorld}from'../src/sim/world';
import{generateOptions,rankOptions}from'../src/sim/decision';
const w=deserializeWorld(readFileSync('C:/dev/Claude Experiment/living-world-integrate/autonomy_evidence/resume107-cart-meadow-45/final.json','utf8')),end=w.tick+12000,rows:any[]=[];
w.hooks={onActivityEnd:(p,a,result,detail)=>{if(a.kind!=='attend')return;const o=w.occasions?.find(o=>o.id===a.data.occasion),ctx=generateOptions(w,p,true,true);rows.push({tick:w.tick,person:p.id,name:p.name,result,detail,phase:a.phase,progress:a.progress,duration:a.duration,age:w.tick-a.start,attended:o?.attended.includes(p.id),occasionStatus:o?.status,offered:ctx.options.some(x=>x.key===a.data.optKey),critical:ctx.criticals,top:rankOptions(ctx).slice(0,2).map(x=>({kind:x.kind,label:x.label,util:x.util}))});}};
while(w.tick<end)stepWorld(w);writeFileSync('autonomy_evidence/occasion107-probe.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({endings:rows.length,arrived:rows.filter(x=>x.attended).length,arrivedInterrupted:rows.filter(x=>x.attended&&x.result==='interrupted').length,examples:rows.filter(x=>x.attended).slice(0,3)}));
