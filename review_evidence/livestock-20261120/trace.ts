import {createWorld} from './src/sim/factory';
import {currentWorldSettings} from './src/sim/profiles';
import {stepWorld,hashWorld} from './src/sim/world';
import {conservationReport,totalItems} from './src/sim/economy';
import {setGrainBoost} from './src/sim/plenty';
import {DAY} from './src/sim/constants';
import {writeFileSync} from 'node:fs';

const boosted=process.argv[2]==='boost';
setGrainBoost(boosted);
const w=createWorld({...currentWorldSettings('normal','aspen'),rulesVersion:261});
const counts:Record<string,Record<string,number>>={};
const events:unknown[]=[];
globalThis.grainTrace=(category,key,n)=>{
  if(category==='events'){events.push(key);return;}
  const group=counts[category]??={};
  group[key]=(group[key]??0)+n;
};
function stocks(){
  const sum=(values:(number|undefined)[])=>values.reduce<number>((a,v)=>a+(v??0),0);
  return {world:totalItems(w).grain,wild:sum(w.sources.filter(s=>s.item==='grain').map(s=>s.amount)),
    plots:sum(w.plots.map(p=>p.stock)),packs:sum(w.persons.filter(p=>p.alive).map(p=>p.inv.grain)),
    buildings:sum(w.buildings.map(b=>b.store.items.grain)), workshopJobs:sum(w.buildings.map(b=>b.ops?.job?.held.grain)),
    piles:sum(w.piles.map(p=>p.items.grain)),carts:sum(w.carts.map(c=>c.load.grain)),
    meals:sum(w.meals.filter(m=>m.status!=='done'&&m.status!=='cancelled').map(m=>m.table.grain))};
}
const initial=stocks(), days=[];
const prev=new Map<number,string>();
for(let i=0;i<12*DAY;i++){
  if(w.tick>=25900&&(w.tick+1146)%120===0){
    const hen=w.byId.get(1146),rooster=w.byId.get(1147),coop=w.byId.get(1157);
    events.push([w.tick,'late coop check',hen.sheep.food,hen.sheep.water,hen.sheep.produceWork,hen.sheep.breedAfter,rooster.sheep.food,rooster.sheep.water,{...coop.store.items}]);
  }
  stepWorld(w);
  for(const a of w.animals){if(!a.sheep)continue;
    const key=[a.sheep.housing??0,a.sheep.pregnancy?.started??-1].join('/');
    if(prev.get(a.id)!==key){events.push([w.tick,'state',a.type,a.id,a.sheep.sex,a.sheep.origin,key,a.sheep.parents]);prev.set(a.id,key);}
  }
  if(!(w.tick%DAY))days.push({day:w.tick/DAY,hash:hashWorld(w),ok:conservationReport(w).ok});
}
const end=stocks();
writeFileSync(process.argv[3],JSON.stringify({initial,end,days,counts,events,remaining:w.animals.filter(a=>a.sheep?.housing).map(a=>({species:a.type,id:a.id,housing:a.sheep.housing,parents:a.sheep.parents}))},null,2));


