import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {compileProject} from '../src/sim/project_compile';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {labProvenance,assertLabSourceUnchanged} from './observers/provenance';
const [seed,out]=process.argv.slice(2);if(!seed||!out||existsSync(out))throw Error('seed and fresh output required');
mkdirSync(out,{recursive:true});const source=labProvenance(),w=createWorld(currentWorldSettings('normal',seed)),samples:unknown[]=[],events:unknown[]=[];
w.hooks={onActivityEnd(p,a,outcome,detail){if((p.inv.wool??0)>0||String(a.data.recipe).includes('wool'))events.push({tick:w.tick,person:p.id,kind:a.kind,goal:a.goal,recipe:a.data.recipe,outcome,detail});}};
for(let n=0;n<60000;n++){
 if(w.tick%240===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive||!p.inv.wool)continue;const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
  samples.push(structuredClone({tick:w.tick,person:p.id,inv:{...p.inv},needs:{...p.needs},x:p.x,y:p.y,activity:p.activity?{kind:p.activity.kind,goal:p.activity.goal}:null,plans:p.intentions,
   yards:Object.values(p.beliefs).filter(b=>b.btype==='timber_yard'),top:ranked.slice(0,5).map(o=>({key:o.key,util:o.util,goal:o.goal})),
   woolOffers:ctx.options.filter(o=>/wool/.test(o.label+' '+o.goal+' '+o.key)).map(o=>({key:o.key,util:o.util,goal:o.goal})),
   garment:compileProject(ctx,{item:'garment',quantity:1,tier:0}),blanket:compileProject(ctx,{item:'blanket',quantity:1,tier:0})}));
 }if(serializeWorld(w)!==before)throw Error('Impure wool trace');}
 stepWorld(w);
}
assertLabSourceUnchanged(source);if(!conservationReport(w).ok)throw Error('Conservation');writeFileSync(out+'/trace.json',JSON.stringify({source,settings:w.settings,samples,events,deaths:w.deceased},null,2));console.log(JSON.stringify({samples:samples.length,events:events.length}));
