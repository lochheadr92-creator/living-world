// Frozen-rules activation search. No jobs, locations, stock or priorities are staged.
import {existsSync,mkdirSync,writeFileSync,readdirSync,appendFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from './lab/lab';
import {gearObserver} from './observers/gear';
import {sourceManifest,gitProvenance} from './observers/provenance';
const [seed,out,nudgeText='0',daysText='100']=process.argv.slice(2),nudge=Number(nudgeText),days=Number(daysText);
if(!seed||!out||existsSync(out)||!Number.isInteger(nudge)||nudge<0||!Number.isInteger(days)||days<25||days>150)throw Error('seed, fresh output, nudge>=0 and days25..150 required');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/trap_activation_scan.ts','scripts/observers/gear.ts','scripts/lab/lab.ts'),source=sourceManifest(files);
let w=createWorld(currentWorldSettings('normal',seed));if(w.settings.rulesVersion!==128)throw Error('This search is pinned to the frozen rules128 source');
mkdirSync(out,{recursive:true});let gear=gearObserver(w);const bodies=new Set<number>(),cuts:unknown[]=[];
const attach=()=>{const previous=w.hooks;w.hooks={...previous,onActivityEnd(p,a,outcome,detail){previous?.onActivityEnd?.(p,a,outcome,detail);if(a.kind==='butcher'&&bodies.has(a.targetId))cuts.push({tick:w.tick,person:p.id,body:a.targetId,part:a.data.part,outcome,detail});}};};attach();
for(let n=0;n<days*2400;n++){
 if(w.tick===4*2400&&nudge)parseIntervention(`nudge:${nudge}`).apply?.(w);
 gear.tick();for(const p of w.piles)if(p.gear?.bodyId)bodies.add(p.gear.bodyId);
 stepWorld(w);if(w.tick%2400===0){if(!conservationReport(w).ok)throw Error('Conservation');appendFileSync(out+'/progress.jsonl',JSON.stringify({tick:w.tick,population:w.persons.filter(p=>p.alive).length,bodies:[...bodies],cuts,gear:gear.report().counts})+'\n');}
}
delete w.hooks;const final=serializeWorld(w),copy=deserializeWorld(final);if(serializeWorld(copy)!==final)throw Error('Invalid save');
const report={...gitProvenance(),source,settings:w.settings,seed,nudge,fork:4,tick:w.tick,population:w.persons.filter(p=>p.alive).length,gear:gear.report(),bodies:[...bodies],cuts,conservation:conservationReport(w),limits:'Unstaged activation search, no every-tick twin or decision samples. A recovered trap body is not proof its meat was eaten.'};
for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}if(serializeWorld(w)!==serializeWorld(copy))throw Error('Continuation differs');
if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw Error('Source changed');writeFileSync(out+'/final.json',final);writeFileSync(out+'/report.json',JSON.stringify({...report,exactContinuation:true},null,2));console.log(JSON.stringify({seed,nudge,bodies:[...bodies],cuts}));
