import {writeFileSync,readdirSync} from 'node:fs';
import {lfHash,sourceManifest} from './observers/provenance';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??10),w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
console.log(JSON.stringify({event:'source',hash:lfHash(JSON.stringify(sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort())))}));
let coached=0,peer=0,visits=0;const seen=new Set<string>();
w.hooks={onActivityEnd:(_p,a,outcome)=>{if(a.kind==='pay_respects'&&outcome==='success')visits++;}};
for(let d=1;d<=days;d++){
 for(let i=0;i<DAY;i++){stepWorld(w);for(const p of w.persons)for(const e of p.skillExperience??[]){const key=`${p.id}:${e.tick}:${e.from}:${e.how}`;if(seen.has(key))continue;seen.add(key);if(e.how==='coached')coached++;else peer++;}}
 console.log(JSON.stringify({day:d,seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,coached,peer,visits,buildings:Object.fromEntries(['well','cellar','mine','mill','brewery'].map(t=>[t,w.buildings.filter(b=>b.type===t).length])),made:{rods:w.ledger.created.rod??0,cuttings:w.ledger.created.cutting??0,beer:w.ledger.created.beer??0},sharedProjects:w.civicProjects?.filter(q=>q.type).length,finalAccounts:w.deceased.filter(p=>p.last).length,alive:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w)}));
}
const raw=serializeWorld(w),twin=deserializeWorld(raw);w.hooks=undefined;
for(let i=0;i<240;i++){stepWorld(w);stepWorld(twin);}const exact=serializeWorld(w)===serializeWorld(twin);console.log(JSON.stringify({event:'continuation',seed,exact,conservation:conservationReport(w)}));if(!exact)throw Error('Continuation mismatch');
writeFileSync(`review_evidence/retired-recovery-20261104/final-${seed}.json`,serializeWorld(w));
