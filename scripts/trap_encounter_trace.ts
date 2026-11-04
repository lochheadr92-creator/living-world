// Establish whether an armed trap actually encountered deer between setting and its single resolution tick.
import {existsSync,mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {hashString,hashUnit} from '../src/sim/rng';
import {sourceManifest,gitProvenance} from './observers/provenance';
const [seed,out,daysText='60']=process.argv.slice(2),days=Number(daysText);
if(!seed||!out||existsSync(out)||!Number.isInteger(days)||days<1||days>150)throw Error('seed, fresh output and days1..150 required');
const files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/trap_encounter_trace.ts'),source=sourceManifest(files);
const w=createWorld(currentWorldSettings('normal',seed)),encounters=new Map<string,unknown>(),traps=new Map<number,unknown>();mkdirSync(out,{recursive:true});
for(let n=0;n<days*2400;n++){
 for(const b of w.piles){const g=b.gear;if(g?.kind!=='trap')continue;traps.set(b.id,structuredClone({tick:w.tick,id:b.id,x:b.x,y:b.y,gear:g}));
  for(const a of w.animals){if(a.type!=='deer'||Math.hypot(a.x-b.x-.5,a.y-b.y-.5)>4)continue;const key=[b.id,g.cycle,a.id,g.state].join(':');if(encounters.has(key))continue;
   encounters.set(key,structuredClone({tick:w.tick,trap:b.id,gear:g,deer:{id:a.id,x:a.x,y:a.y},wouldCatch:hashUnit(hashString(w.seed)^0x79ae,b.id+g.cycle,a.id)<.55}));
   if(g.state==='armed'&&!existsSync(out+'/armed-encounter.json'))writeFileSync(out+'/armed-encounter.json',serializeWorld(w));
  }
 }
 stepWorld(w);
}
if(!conservationReport(w).ok)throw Error('Conservation');if(JSON.stringify(source)!==JSON.stringify(sourceManifest(files)))throw Error('Source changed');
writeFileSync(out+'/report.json',JSON.stringify({...gitProvenance(),source,settings:w.settings,tick:w.tick,traps:[...traps.values()],encounters:[...encounters.values()],conservation:conservationReport(w)},null,2));console.log(JSON.stringify({traps:traps.size,encounters:encounters.size}));
