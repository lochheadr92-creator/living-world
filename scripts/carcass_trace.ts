import {mkdirSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
const out=process.argv.at(-1)!;mkdirSync(out,{recursive:true});
const w=createWorld(currentWorldSettings('normal','fern')),events:unknown[]=[],samples:unknown[]=[];
w.hooks={onActivityEnd(p,a,outcome,detail){if(a.kind==='hunt'||a.kind==='butcher'||a.data.recipe==='sew_hide_garment'||a.data.recipe==='render_fat')events.push({tick:w.tick,id:p.id,name:p.name,kind:a.kind,recipe:a.data.recipe,part:a.data.part,outcome,detail,inv:{...p.inv}});}};
for(let n=0;n<24000;n++){
 if(w.tick%120===0&&w.piles.some(b=>b.carcass)){
  const before=serializeWorld(w);
  for(const b of w.piles.filter(b=>b.carcass))for(const p of w.persons.filter(p=>p.alive&&p.hhId===b.carcass!.hhId)){
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
   samples.push({tick:w.tick,body:b.id,carcass:structuredClone(b.carcass),person:p.id,name:p.name,inv:{...p.inv},needs:{...p.needs},activity:p.activity?{kind:p.activity.kind,phase:p.activity.phase,target:p.activity.targetId}:null,bodyBelief:structuredClone(p.beliefs[b.id]),offers:ranked.slice(0,5).map(o=>({key:o.key,util:o.util,label:o.label})),cuts:ctx.options.filter(o=>o.kind==='butcher').map(o=>({key:o.key,util:o.util}))});
  }
  if(serializeWorld(w)!==before)throw Error('Impure trace');
 }
 stepWorld(w);
}
writeFileSync(out+'/trace.json',JSON.stringify({events,samples,ledger:w.ledger},null,2));writeFileSync(out+'/final.json',serializeWorld(w));console.log(JSON.stringify({events,ledger:w.ledger}));
