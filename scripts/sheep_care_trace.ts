import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {livestockMaterials} from '../src/sim/livestock';
import {reservedFor} from '../src/sim/reserved_goods';
import {serializeWorld} from '../src/app/save';
import {labProvenance,assertLabSourceUnchanged} from './observers/provenance';
const [seed,out]=process.argv.slice(2);if(!seed||!out||existsSync(out))throw Error('seed and fresh output required');mkdirSync(out,{recursive:true});
const source=labProvenance(),w=createWorld(currentWorldSettings('normal',seed)),counts:Record<string,number>={},samples:unknown[]=[],events:unknown[]=[];
const inc=(key:string)=>counts[key]=(counts[key]??0)+1;
w.hooks={onActivityEnd(p,a,outcome,detail){if(a.kind==='animal_work'||/sheep/.test(a.goal))events.push({tick:w.tick,person:p.id,kind:a.kind,goal:a.goal,outcome,detail});}};
for(let n=0;n<14400;n++){
 if(w.tick%240===0){const before=serializeWorld(w);for(const p of w.persons){if(!p.alive)continue;inc('person samples');const known=Object.values(p.beliefs).filter(b=>b.sheep);if(!known.length)continue;inc('knows sheep');
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),materials=livestockMaterials(ctx),offers=ctx.options.filter(o=>o.tag==='animals');
  for(const k of ['wood','fibre','grain'] as const)if((p.inv[k]??0)-reservedFor(w,p,k)>=(k==='wood'?2:1))inc('has free '+k);
  if(offers.length)inc('has animal or supply offer');if(ranked[0]?.tag==='animals')inc('animal or supply ranked first');
  if(samples.length<600&&w.tick%720===0)samples.push({tick:w.tick,id:p.id,inv:{...p.inv},needs:{...p.needs},materials,known:known.map(b=>({id:b.id,x:b.x,y:b.y,seen:b.seen,sheep:b.sheep})),offers:offers.map(o=>({key:o.key,util:o.util})),top:ranked.slice(0,4).map(o=>({key:o.key,util:o.util})),activity:p.activity?{kind:p.activity.kind,goal:p.activity.goal}:null});
 }if(serializeWorld(w)!==before)throw Error('impure trace');}
 stepWorld(w);
}
assertLabSourceUnchanged(source);writeFileSync(out+'/trace.json',JSON.stringify({source,settings:w.settings,counts,samples,events},null,2));console.log(JSON.stringify(counts));
