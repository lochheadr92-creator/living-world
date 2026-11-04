import {writeFileSync,readdirSync} from 'node:fs';
import {lfHash,sourceManifest} from './observers/provenance';
import {createWorld} from '../src/sim/factory';import {currentWorldSettings} from '../src/sim/profiles';import {stepWorld} from '../src/sim/world';import {DAY} from '../src/sim/constants';import {conservationReport} from '../src/sim/economy';import {serializeWorld} from '../src/app/save';
const run=process.argv[4]??'initial';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??10),w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
console.log(JSON.stringify({event:'source',hash:lfHash(JSON.stringify(sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort())))}));
let rodCatches=0;w.hooks={onTransfer:e=>{if(e.item==='fish'&&e.from.startsWith('source:')&&e.to.startsWith('person:')){const p=w.byId.get(Number(e.to.slice(7)));if(p?.ent==='person'&&toolFor(w,p,'fish'))rodCatches+=e.n;}}};
for(let d=1;d<=days;d++){for(let i=0;i<DAY;i++)stepWorld(w);console.log(JSON.stringify({day:d,seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,rodsMade:w.ledger.created.rod??0,rodsHeld:w.tools.filter(t=>t.kind==='rod').length,rodCatches,alive:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w)}));}
writeFileSync(`review_evidence/retired-recovery-20261104/rods-${seed}-${run}-final.json`,serializeWorld(w));
import {toolFor} from '../src/sim/tools';
