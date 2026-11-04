import {writeFileSync,readdirSync} from 'node:fs';
import {lfHash,sourceManifest} from './observers/provenance';
import {createWorld} from '../src/sim/factory';import {currentWorldSettings} from '../src/sim/profiles';import {stepWorld} from '../src/sim/world';import {DAY} from '../src/sim/constants';import {conservationReport} from '../src/sim/economy';import {serializeWorld} from '../src/app/save';
const run=process.argv[4]??'initial';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??10),w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
console.log(JSON.stringify({event:'source',hash:lfHash(JSON.stringify(sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort())))}));
for(let d=1;d<=days;d++){for(let i=0;i<DAY;i++)stepWorld(w);console.log(JSON.stringify({day:d,seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,projects:w.civicProjects?.filter(q=>q.type).map(q=>({type:q.type,status:q.status,supporters:q.participants.filter(p=>p.status==='supporting').length})),alive:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w)}));}
writeFileSync(`review_evidence/retired-recovery-20261104/shared-${seed}-${run}-final.json`,serializeWorld(w));
