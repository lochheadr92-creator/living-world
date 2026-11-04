import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
const out=process.argv.at(-1)!;if(existsSync(out))throw Error('fresh output required');mkdirSync(out,{recursive:true});
const w=createWorld(currentWorldSettings('normal','forest')),events:unknown[]=[],samples:unknown[]=[];
w.hooks={onTransfer(e){if(e.item==='net'||e.item==='trap')events.push({tick:w.tick,...e});},onActivityEnd(p,a,outcome,detail){if(a.kind==='gear_work'||/^make_(net|trap)$/.test(String(a.data.recipe)))events.push({tick:w.tick,person:p.id,kind:a.kind,data:{...a.data},outcome,detail});}};
for(let n=0;n<36000;n++){
 if(w.tick%120===0)for(const p of w.persons.filter(p=>(p.inv.net??0)+(p.inv.trap??0)>0)){
  const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx);
  samples.push({tick:w.tick,person:p.id,inv:{...p.inv},hh:p.hhId,dangers:ctx.dangers.map(b=>({id:b.id,age:w.tick-b.seen,distance:Math.hypot(p.x-b.x,p.y-b.y)})),tools:w.tools.filter(t=>t.holder===p.id&&(t.kind==='net'||t.kind==='trap')).map(t=>({...t})),offers:ranked.slice(0,4).map(o=>({key:o.key,util:o.util})),gear:ctx.options.filter(o=>o.kind==='gear_work').map(o=>({key:o.key,util:o.util}))});
 }
 stepWorld(w);
}
writeFileSync(out+'/trace.json',JSON.stringify({events,samples},null,2));writeFileSync(out+'/final.json',serializeWorld(w));console.log(JSON.stringify({events,samples:samples.length}));
