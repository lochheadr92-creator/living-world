// Read-only diagnosis of the remaining ordinary carcass-to-product route.
import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {demandsOf,preservationSurplus} from '../src/sim/production';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {labProvenance,assertLabSourceUnchanged} from './observers/provenance';
const [seed,out,days='25']=process.argv.slice(2);if(!seed||!out||existsSync(out))throw Error('seed and fresh output required');
mkdirSync(out,{recursive:true});const source=labProvenance(),w=createWorld(currentWorldSettings('normal',seed)),samples:unknown[]=[],events:unknown[]=[];
const relevant=(p:typeof w.persons[number])=>!!(p.inv.hide||p.inv.fat||p.inv.meat)||Object.values(p.beliefs).some(b=>b.carcassParts&&Object.values(b.carcassParts).some(n=>n>0));
w.hooks={onActivityEnd(p,a,outcome,detail){if(events.length<1000&&(a.kind==='butcher'||/hide|fat|meat/.test(String(a.data.recipe))))events.push({tick:w.tick,person:p.id,kind:a.kind,goal:a.goal,part:a.data.part,recipe:a.data.recipe,outcome,detail,inv:{...p.inv}});}};
for(let n=0;n<Number(days)*2400;n++){
 if(w.tick%240===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive||!relevant(p)||samples.length>=3000)continue;const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
  samples.push(structuredClone({tick:w.tick,person:p.id,inv:p.inv,needs:p.needs,x:p.x,y:p.y,activity:p.activity?{kind:p.activity.kind,goal:p.activity.goal}:null,
   bodies:Object.values(p.beliefs).filter(b=>b.carcassParts),yards:Object.values(p.beliefs).filter(b=>b.btype==='timber_yard'||b.btype==='food_rack'),surplus:preservationSurplus(ctx),demands:demandsOf(ctx),
   top:ranked.slice(0,5).map(o=>({key:o.key,util:o.util,goal:o.goal})),offers:ctx.options.filter(o=>o.kind==='butcher'||/hide|fat|meat/.test(o.label+' '+o.goal+' '+o.key)).map(o=>({key:o.key,util:o.util,goal:o.goal,blocked:o.blocked}))}));
 }if(serializeWorld(w)!==before)throw Error('Impure carcass trace');}
 stepWorld(w);
}
assertLabSourceUnchanged(source);if(!conservationReport(w).ok)throw Error('Conservation');writeFileSync(out+'/trace.json',JSON.stringify({source,settings:w.settings,samples,events,deaths:w.deceased},null,2));console.log(JSON.stringify({samples:samples.length,events:events.length}));
