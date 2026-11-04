import {writeFileSync,readdirSync} from 'node:fs';
import {lfHash,sourceManifest} from './observers/provenance';
import {createWorld} from '../src/sim/factory';import {currentWorldSettings} from '../src/sim/profiles';import {stepWorld} from '../src/sim/world';import {DAY} from '../src/sim/constants';import {conservationReport} from '../src/sim/economy';import {serializeWorld} from '../src/app/save';
const seed=process.argv[2]??'forest',days=Number(process.argv[3]??25),w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const run=process.argv[4]??'initial';
console.log(JSON.stringify({event:'source',run,hash:lfHash(JSON.stringify(sourceManifest(readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f.replaceAll('\\','/')).sort())))}));
const built=new Set<number>(),started=new Set<number>();let deposits=0,mealTransfers=0;
w.hooks={onTransfer:e=>{const to=w.byId.get(Number(e.to.split(':')[1])),from=w.byId.get(Number(e.from.split(':')[1]));if(to?.ent==='building'&&to.type==='cellar')deposits+=e.n;if(from?.ent==='building'&&from.type==='cellar'&&e.reason==='eat from store')mealTransfers+=e.n;},onActivityEnd:(p,a,outcome,detail)=>{if(a.data.type==='cellar')console.log(JSON.stringify({event:'layout',tick:w.tick,person:p.id,outcome,detail}));}};
for(let d=1;d<=days;d++){for(let i=0;i<DAY;i++){stepWorld(w);for(const b of w.buildings)if(b.type==='cellar')built.add(b.id);for(const s of w.sites)if(s.type==='cellar')started.add(s.id);}console.log(JSON.stringify({day:d,seed,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,alive:w.persons.filter(p=>p.alive).length,built:[...built],started:[...started],deposits,mealTransfers,conservation:conservationReport(w)}));}
writeFileSync(`review_evidence/retired-recovery-20261104/cellars-${seed}-${run}-final.json`,serializeWorld(w));
