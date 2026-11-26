import {writeFileSync} from 'node:fs';
import {createWorld} from './src/sim/factory';
import {currentWorldSettings} from './src/sim/profiles';
import {stepWorld,hashWorld} from './src/sim/world';
import {conservationReport} from './src/sim/economy';
import {distToFootprint} from './src/sim/registry';
import {senseRadius} from './src/sim/perception';
import {DAY} from './src/sim/constants';

const w=createWorld({...currentWorldSettings('normal','aspen'),rulesVersion:262});
const scans=[],sights=[],events=[],days=[],observed=new Set(),window=()=>w.tick>=27843&&w.tick<=28765;
const locations=new Map();
function label(items){
 for(const p of w.persons)if(p.inv===items)return 'person '+p.id+' '+p.name+' hh '+p.hhId;
 for(const b of w.buildings)if(b.store.items===items)return b.type+' '+b.id+' hh '+b.hhId;
 for(const m of w.meals)if(m.table===items)return 'table '+m.id;
 for(const b of w.piles)if(b.items===items)return 'pile '+b.id;
 for(const c of w.carts)if(c.load===items)return 'cart '+c.id;
 return '';
}
globalThis.stock=(items,n,before)=>{
 if(w.tick<27843)return;
 const l=label(items);if(l)events.push([w.tick,'change',l,n,before,new Error().stack.split('\n').slice(2,5).map(s=>s.trim().split(' (')[0])]);
};
globalThis.meatEvent=(kind,items,n,why)=>{if(w.tick>=27843)events.push([w.tick,kind,label(items),n,why]);};
globalThis.scan=(p,home,r)=>{
 if(!window()||p.hhId!==1086)return;
 const b=w.piles.find(b=>b.carcass?.animalId===1143);if(b)scans.push([w.tick,p.name,p.activity?.label,home?.id??0,distToFootprint(b,p.x,p.y),r,p.x,p.y]);
};
globalThis.sight=(p,b)=>{if(!observed.has(p.id)){observed.add(p.id);sights.push([w.tick,p.name,p.hhId,p.activity?.label,b.x,b.y]);}};
for(let i=0;i<19*DAY;i++){
 stepWorld(w);
 if(w.tick>=27844&&w.tick<=28766){
  const body=w.piles.find(b=>b.carcass?.animalId===1143);
  for(const p of w.persons.filter(p=>p.alive&&p.hhId===1086)){
   const d=distToFootprint(body,p.x,p.y),r=senseRadius(w,p);
   const key=JSON.stringify([p.name,p.activity?.label,p.indoors?'inside':d<=r?'in range':'outside range']);
   locations.set(key,(locations.get(key)??0)+1);
  }
 }
 if(w.tick%DAY===0)days.push([w.tick/DAY,hashWorld(w),conservationReport(w).ok]);
}
writeFileSync(process.argv[2],JSON.stringify({scans,sights,locations:[...locations],events,days},null,2));

