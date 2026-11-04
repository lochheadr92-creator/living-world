import {mkdirSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {sourceManifest} from './observers/provenance';
const [seed,out,daysArg='25']=process.argv.slice(2).filter(x=>x!=='--'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/carcass_source_replay.ts'),source=sourceManifest(files);
const ticks=Number(daysArg)*2400;
if(!Number.isSafeInteger(ticks)||ticks<2400||ticks>876000)throw Error('Invalid replay horizon');
if(!seed||!out||existsSync(out))throw Error('Seed and fresh output required');mkdirSync(out,{recursive:true});
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),w=createWorld(currentWorldSettings('normal',seed)),initialHash=hash(serializeWorld(w));
for(let n=0;n<ticks;n++){stepWorld(w);if(w.tick%2400===0&&!conservationReport(w).ok)throw Error('Conservation');}
const final=serializeWorld(w),copy=deserializeWorld(final);if(serializeWorld(copy)!==final)throw Error('Save changed');
for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}if(serializeWorld(w)!==serializeWorld(copy))throw Error('Continuation changed');
if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw Error('Source changed');
writeFileSync(out+'/final.json',final);writeFileSync(out+'/report.json',JSON.stringify({seed,tick:ticks,settings:w.settings,source,initialHash,finalHash:hash(final),exactContinuation:true,conservation:conservationReport(w)},null,2));
