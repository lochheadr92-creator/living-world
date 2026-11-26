import {writeFileSync} from 'node:fs';
import {serializeWorld} from '../src/app/save';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import {FARM_SPECIES,housingCapacity} from '../src/sim/farm_species';

import {setHerdValue} from '../src/sim/herd_value';
import {setGrainBoost} from '../src/sim/plenty';
setGrainBoost(!process.argv.includes('--no-grain-boost'));
setHerdValue(!process.argv.includes('--no-herd-value'));
const seed=process.argv[2]??'aspen', days=Number(process.argv[3]??12);
const acquired=new Set<number>();
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:268});
let awake=0,hungry=0,cropGrain=0;
const starters=new Set(w.animals.filter(a=>a.sheep?.hhId).map(a=>a.id));
for(let d=0;d<=days;d++){
  const animals=w.animals.filter(a=>a.sheep);
  console.log(JSON.stringify({day:d,seed,acquired:acquired.size,people:w.persons.filter(p=>p.alive).length,hash:hashWorld(w),bySpecies:Object.fromEntries(Object.keys(FARM_SPECIES).map(s=>[s,animals.filter(a=>a.type===s).length])),kept:animals.filter(a=>a.sheep!.hhId).length,housed:animals.filter(a=>a.sheep!.housing).length,housing:w.buildings.filter(b=>housingCapacity(b.type)).map(b=>b.type),born:animals.filter(a=>a.sheep!.origin==='birth').length,goods:Object.fromEntries(['milk','egg','cheese','pork','bacon','leather','hay','gloves','shoes'].map(k=>[k,w.ledger.created[k as keyof typeof w.ledger.created]??0])),cropGrain,awake,hungry,grainLedger:Object.fromEntries(Object.entries(w.ledger.reasons).filter(([k])=>/grain|stock_feed/.test(k))),conserved:conservationReport(w).ok}));
  if(d<days)for(let i=0;i<DAY;i++){stepWorld(w);
    for(const p of w.persons)if(p.alive&&p.activity?.kind!=='sleep'){awake++;if(p.needs.hunger<40)hungry++;}
    for(const pl of w.plots)if(pl.state==='ripe'&&pl.ripeTick===w.tick-1)cropGrain+=pl.stock;
    for(const a of w.animals)if(a.sheep?.hhId&&a.sheep.origin==='founder'&&!starters.has(a.id))acquired.add(a.id);}
}
const saveFile=process.argv.find(arg=>arg.startsWith('--save='))?.slice(7);
if(saveFile)writeFileSync(saveFile,serializeWorld(w,5));
