import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {generateOptions} from '../src/sim/decision';
import {batchWanted} from '../src/sim/batch_plan';
import {demandsOf} from '../src/sim/production';
const out='survival_evidence/plan-diagnosis.json';if(existsSync(out))throw new Error('preserve evidence');
const rows=[];
for(const input of ['survival_evidence/rack-diagnosis-v3-final.json','survival_evidence/rack-diagnosis-v4-final.json']){
 const w=deserializeWorld(readFileSync(input,'utf8')),before=serializeWorld(w);
 for(const p of w.persons){if(!p.alive)continue;
  const ctx=generateOptions(w,p,true,true),demands=demandsOf(ctx).filter(d=>String(d.item).match(/dried|smoked/));
  if(!demands.length)continue;
  rows.push({input,tick:w.tick,id:p.id,name:p.name,criticals:ctx.criticals,demands,want:batchWanted(ctx),plans:p.intentions.filter(i=>i.status==='active').map(i=>({kind:i.kind,makes:i.makes,step:i.step,until:i.until,blocked:i.blocked}))});
 }
 if(serializeWorld(w)!==before)throw new Error('impure diagnosis');
}
writeFileSync(out,JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(r=>({tick:r.tick,id:r.id,want:r.want?.item,criticals:r.criticals,plans:r.plans}))));
