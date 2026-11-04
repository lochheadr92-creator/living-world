import {writeFileSync,readdirSync} from 'node:fs';
import {lfHash,sourceManifest} from './observers/provenance';
import {createWorld} from '../src/sim/factory';import {currentWorldSettings} from '../src/sim/profiles';import {stepWorld} from '../src/sim/world';import {DAY} from '../src/sim/constants';import {conservationReport} from '../src/sim/economy';import {serializeWorld} from '../src/app/save';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??10),w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
console.log(JSON.stringify({event:'source',hash:lfHash(JSON.stringify(sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort())))}));
let deposits=0,gathered=0,withdrawals=0;const workers=new Set<number>();
w.hooks={onTransfer:e=>{const to=w.byId.get(Number(e.to.split(':')[1])),from=w.byId.get(Number(e.from.split(':')[1]));if(!['wood','stone'].includes(e.item))return;if(to?.ent==='building'&&to.type==='storehouse'){const p=w.byId.get(Number(e.from.split(':')[1]));if(p?.ent==='person'&&p.activity?.data.communalStock){deposits+=e.n;workers.add(p.id);}}if(from?.ent==='building'&&from.type==='storehouse')withdrawals+=e.n;if(from?.ent==='source'&&to?.ent==='person'&&to.activity?.data.restockFor)gathered+=e.n;}};
for(let d=1;d<=days;d++){for(let i=0;i<DAY;i++)stepWorld(w);console.log(JSON.stringify({day:d,seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,stores:w.buildings.filter(b=>b.type==='storehouse').length,deposits,gathered,withdrawals,workers:[...workers],alive:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w)}));}
writeFileSync(`review_evidence/retired-recovery-20261104/stock-${seed}-final.json`,serializeWorld(w));
