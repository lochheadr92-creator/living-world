import {writeFileSync,readdirSync} from 'node:fs';
import {lfHash,sourceManifest} from './observers/provenance';
import {createWorld} from '../src/sim/factory';import {currentWorldSettings} from '../src/sim/profiles';import {stepWorld} from '../src/sim/world';import {DAY} from '../src/sim/constants';import {conservationReport} from '../src/sim/economy';import {serializeWorld} from '../src/app/save';
const run=process.argv[4]??'initial';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??10),w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
console.log(JSON.stringify({event:'source',hash:lfHash(JSON.stringify(sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort())))}));
let harvested=0;const planted=new Set<number>();
w.hooks={onTransfer:e=>{const from=w.byId.get(Number(e.from.split(':')[1]));if(from?.ent==='source'&&from.planted)harvested+=e.n;},onActivityEnd:(p,a,outcome,detail)=>{if(a.kind==='tree_work'){if(a.data.plantedId)planted.add(a.data.plantedId);console.log(JSON.stringify({event:'tree_work',tick:w.tick,person:p.id,op:a.data.op,outcome,detail,planted:a.data.plantedId}));}}};
for(let d=1;d<=days;d++){for(let i=0;i<DAY;i++)stepWorld(w);console.log(JSON.stringify({day:d,seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,cuttings:w.ledger.created.cutting??0,planted:[...planted],harvested,alive:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w)}));}
writeFileSync(`review_evidence/retired-recovery-20261104/forestry-${seed}-${run}-final.json`,serializeWorld(w));
