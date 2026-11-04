// Read-only ordinary-world diagnostic: no actions or resources are injected.
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {facilitiesOf,preservationSurplus} from '../src/sim/production';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {gitProvenance,sourceManifest} from '../scripts/observers/provenance';
const out='survival_evidence/rack-diagnosis-v4';
if(existsSync(out+'.json'))throw new Error('preserve existing diagnosis');
const source=sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f));
const input='survival_evidence/rack-diagnosis-v3-final.json';
const w=deserializeWorld(readFileSync(input,'utf8'));
const rows:unknown[]=[],counts:Record<string,number>={};
const inc=(key:string)=>counts[key]=(counts[key]??0)+1;
const began=performance.now();
while(w.tick<38400&&performance.now()-began<180000){
 stepWorld(w);
 if(w.tick%240===0&&w.buildings.some(b=>b.type==='food_rack')){
  const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;
   const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),surplus=preservationSurplus(ctx);
   const known=Object.values(p.beliefs).filter(b=>b.btype==='food_rack');
   if(!known.length){inc('no remembered rack');continue;}
   const usable=facilitiesOf(ctx,'food_rack');
   inc(usable.length?'known accessible rack':'known rack without access');
   if(surplus)inc('known rack with surplus');
   if(usable.some(f=>w.tick-f.b.seen<=2400)&&surplus){
    inc('fresh accessible rack with surplus');
    if(rows.length<160)rows.push(JSON.parse(JSON.stringify({tick:w.tick,person:p.id,hh:p.hhId,stage:ctx.stage,health:p.health,drives:ctx.drives,inv:p.inv,
     foodBeliefs:Object.values(p.beliefs).filter(b=>b.items&&((b.items.fish??0)>0||(b.items.meat??0)>0)).map(b=>({id:b.id,hh:b.hh,kind:b.kind,type:b.btype,age:w.tick-b.seen,items:b.items})),
     racks:usable.map(f=>({id:f.b.id,hh:f.b.hh,age:w.tick-f.b.seen,items:f.b.items,ops:f.b.ops,eta:f.e})),
     offers:ctx.options.filter(o=>usable.some(f=>o.targetId===f.b.id)||/preserv|drying|smoking|keep spare food/i.test(o.goal+' '+o.label)),blocked:ctx.blocked.filter(o=>usable.some(f=>o.targetId===f.b.id)||/preserv|drying|smoking/i.test(o.label)),best:ranked.slice(0,3).map(o=>({key:o.key,util:o.util}))})));
   }
  }
  if(serializeWorld(w)!==before)throw new Error('impure diagnostic');
 }
}
writeFileSync(out+'.json',JSON.stringify({...gitProvenance(),source,input,tick:w.tick,settings:w.settings,counts,rows,conservation:conservationReport(w)},null,2));
writeFileSync(out+'-final.json',serializeWorld(w));
console.log(JSON.stringify({tick:w.tick,counts,seconds:(performance.now()-began)/1000}));
if(w.tick!==38400)process.exitCode=1;
