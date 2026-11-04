import {writeFileSync,readdirSync} from 'node:fs';
import {lfHash,sourceManifest} from './observers/provenance';
import {createWorld} from '../src/sim/factory';import {currentWorldSettings} from '../src/sim/profiles';import {stepWorld} from '../src/sim/world';import {DAY} from '../src/sim/constants';import {conservationReport} from '../src/sim/economy';import {serializeWorld} from '../src/app/save';
const run=process.argv[4]??'initial';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??10),w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
console.log(JSON.stringify({event:'source',hash:lfHash(JSON.stringify(sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort())))}));
let coached=0,peer=0;const seen=new Set<string>();
for(let d=1;d<=days;d++){for(let i=0;i<DAY;i++){stepWorld(w);for(const p of w.persons)for(const e of p.skillExperience??[]){const key=`${p.id}:${e.tick}:${e.from}:${e.how}`;if(seen.has(key))continue;seen.add(key);if(e.how==='coached')coached++;else peer++;}}console.log(JSON.stringify({day:d,seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,coached,peer,alive:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w)}));}
writeFileSync(`review_evidence/retired-recovery-20261104/coaching-${seed}-${run}-final.json`,serializeWorld(w));
