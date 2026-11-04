// Read-only diagnosis of the ordinary meat-preservation opportunity chain.
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {preservationSurplus} from '../src/sim/production';
import {sourceManifest} from './observers/provenance';
const [reference,out]=process.argv.slice(2);if(!reference||!out||existsSync(out))throw Error('Ordinary reference and fresh output required');
const expected=JSON.parse(readFileSync(reference+'/report.json','utf8'));
const files=['src','scripts'].flatMap(d=>readdirSync(d,{recursive:true}).map(String).filter(f=>/\.(ts|mjs)$/.test(f)).map(f=>d+'/'+f.replaceAll('\\','/'))).sort();
const source=sourceManifest(files),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const w=createWorld({...currentWorldSettings('normal',expected.seed,{immigration:true}),rulesVersion:132});
if(sha(serializeWorld(w))!==expected.initialHash)throw Error('Different initial state');
const samples:unknown[]=[],events:unknown[]=[];let eligibleSamples=0,pureChecks=0;
const related=(a:any)=>a.kind==='butcher'||a.kind==='operate'&&/meat|fat/.test(String(a.data.recipe));
w.hooks={onActivityStart(p,a){if(related(a))events.push({tick:w.tick,person:p.id,start:a.kind,target:a.targetId,data:structuredClone(a.data),needs:{...p.needs},inv:{...p.inv}});},onActivityEnd(p,a,outcome,detail){if(related(a))events.push({tick:w.tick,person:p.id,end:a.kind,target:a.targetId,data:structuredClone(a.data),outcome,detail,needs:{...p.needs},inv:{...p.inv}});}};
mkdirSync(out,{recursive:true});
while(w.tick<expected.tick){
 if(w.tick%120===0){const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive)continue;const ctx=generateOptions(w,p,true,true);if(preservationSurplus(ctx)!=='meat')continue;eligibleSamples++;
   if(samples.length<2000)samples.push({tick:w.tick,person:p.id,needs:{...p.needs},inv:{...p.inv},activity:p.activity&&{kind:p.activity.kind,target:p.activity.targetId,data:structuredClone(p.activity.data)},
    ranked:rankOptions(ctx).slice(0,4).map(o=>({key:o.key,util:o.util,label:o.label,blocked:o.blocked})),
    preservation:ctx.options.filter(o=>o.preservesFood||o.key.includes('butcher:')).map(o=>({key:o.key,util:o.util,label:o.label,blocked:o.blocked,goal:o.goal})),
    bodies:Object.values(p.beliefs).filter(b=>b.state==='carcass').map(b=>({id:b.id,seen:b.seen,hh:b.hh,parts:structuredClone(b.carcassParts)})),
    racks:Object.values(p.beliefs).filter(b=>b.btype==='food_rack').map(b=>({id:b.id,seen:b.seen,hh:b.hh,items:structuredClone(b.items),ops:structuredClone(b.ops)}))});
  }if(serializeWorld(w)!==before)throw Error('Impure diagnosis');pureChecks++;
 }
 stepWorld(w);if(w.tick%2400===0)writeFileSync(out+'/progress.json',JSON.stringify({tick:w.tick,eligibleSamples}));
}
delete w.hooks;const final=serializeWorld(w),original=readFileSync(reference+'/final.json','utf8');if(final!==original)throw Error('Observer replay differs from ordinary reference');
const copy=deserializeWorld(final);for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Continuation or conservation failed');
if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw Error('Source changed');
writeFileSync(out+'/report.json',JSON.stringify({reference,source,exactReference:true,pureChecks,eligibleSamples,samples,events,conservation:true,continuationEqual:true,limits:'Samples are repeated opportunities, capped at2000. No work or supplies assigned.'},null,2)+'\n');
console.log(JSON.stringify({exactReference:true,pureChecks,eligibleSamples}));
