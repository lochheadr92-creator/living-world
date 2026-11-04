// Fresh ordinary replay across the reporting-only rules132 -> 133 change.
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from './lab/lab';
import {sourceManifest} from './observers/provenance';
const [reference,out]=process.argv.slice(2);if(!reference||!out||existsSync(out))throw Error('Completed132 reference and fresh output required');
const expected=JSON.parse(readFileSync(reference+'/report.json','utf8'));
if(expected.settings.rulesVersion!==132)throw Error('Expected132 reference');
const files=['src','scripts'].flatMap(dir=>readdirSync(dir,{recursive:true}).map(String).filter(f=>/\.(ts|mjs)$/.test(f)).map(f=>dir+'/'+f.replaceAll('\\','/'))).sort();
const source=sourceManifest(files),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const original=readFileSync(reference+'/final.json','utf8');if(sha(original)!==expected.finalSaveHash)throw Error('Reference save differs');
let w=createWorld({...currentWorldSettings('normal',expected.seed,{immigration:true}),rulesVersion:133});
const normalization='Only world.settings.rulesVersion and the two specified trap-check log strings are normalized. All other saved bytes must match.';
function normalized(raw:string){const s=JSON.parse(raw);s.world.settings.rulesVersion=132;for(const p of s.world.persons)for(const log of p.log)if(['Checked the trap: a body needs butchering.','Checked the trap: no recoverable catch remains.'].includes(log.text))log.text='Checked the trap: [catch report]';return JSON.stringify(s);}
const checks:unknown[]=[];let forked=false;mkdirSync(out,{recursive:true});
while(w.tick<expected.tick){
 if(!forked&&w.tick===expected.fork*2400){w=deserializeWorld(serializeWorld(w));parseIntervention(expected.nudge?`nudge:${expected.nudge}`:'control').apply?.(w);forked=true;}
 w.hooks={onActivityEnd(p,a,outcome){if(a.kind==='gear_work'&&a.data.op==='check')checks.push({tick:w.tick,person:p.id,outcome,log:p.log.at(-1)});}};
 stepWorld(w);if(w.tick%2400===0){if(!conservationReport(w).ok)throw Error('Conservation failed');writeFileSync(out+'/progress.json',JSON.stringify({tick:w.tick}));}
}
delete w.hooks;const final=serializeWorld(w);if(normalized(final)!==normalized(original))throw Error('Reporting change altered other final state');
const copy=deserializeWorld(final);if(serializeWorld(copy)!==final)throw Error('Save changed');
for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}if(serializeWorld(w)!==serializeWorld(copy))throw Error('Continuation changed');
if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw Error('Source changed');
writeFileSync(out+'/final.json',final);writeFileSync(out+'/report.json',JSON.stringify({reference,source,settings:expected.settings,newRules:133,normalization,normalizedFinalEqual:true,finalHash:sha(final),checks,exactSave:true,continuationEqual:true,conservation:true},null,2)+'\n');
console.log(JSON.stringify({normalizedFinalEqual:true,checks}));
