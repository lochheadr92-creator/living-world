// One-tick matched decision from an unmodified ordinary save. No forced activity or altered needs.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {setSourceLearning} from '../src/sim/source_learning';
import {conservationReport} from '../src/sim/economy';
const [input,out]=process.argv.slice(2).filter(a=>a!=='--');if(!input||!out||existsSync(out))throw new Error('Input save and fresh output required');
const w=deserializeWorld(readFileSync(input,'utf8')),from=w.tick;let result:any;
for(let n=0;n<1200&&!result;n++){
 for(const p of w.persons){
  if(!p.alive||p.activity||p.nextThink>w.tick||!Object.values(p.payoff??{}).some(e=>e.sources?.length))continue;
  const raw=serializeWorld(w),on=rankOptions(generateOptions(w,p,true,true));let off;
  try{setSourceLearning(false);off=rankOptions(generateOptions(w,p,true,true));}finally{setSourceLearning(true);}
  if(raw!==serializeWorld(w))throw new Error('Impure inspection');if(on[0]?.key===off[0]?.key)continue;
  const a=deserializeWorld(raw),b=deserializeWorld(raw);stepWorld(a);try{setSourceLearning(false);stepWorld(b);}finally{setSourceLearning(true);}
  const pa=a.persons.find(q=>q.id===p.id)!,pb=b.persons.find(q=>q.id===p.id)!;
  if(!pa.activity||!pb.activity||pa.activity.data.optKey===pb.activity.data.optKey)continue;
  result={input,seed:w.settings.seed,from,tick:w.tick,person:p.id,name:p.name,learned:pa.activity.data.optKey,plain:pb.activity.data.optKey,because:pa.lastDecision?.because,plainBecause:pb.lastDecision?.because,experience:p.payoff,conserved:conservationReport(a).ok&&conservationReport(b).ok,limits:'Ordinary accumulated history, one-tick whole-world isolated removal at a naturally idle decision. This establishes a changed actual start, not a long-run welfare effect.'};
  if(!result.conserved)throw new Error('Conservation failed');mkdirSync(out,{recursive:true});writeFileSync(out+'/before.json',raw);writeFileSync(out+'/on.json',serializeWorld(a));writeFileSync(out+'/off.json',serializeWorld(b));writeFileSync(out+'/report.json',JSON.stringify(result,null,2));break;
 }
 if(!result)stepWorld(w);
}
if(!result)throw new Error('No naturally due changed start within predeclared 1200-tick window');console.log(JSON.stringify(result));
