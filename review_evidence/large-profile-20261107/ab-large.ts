// ORDINARY A/B in the LARGE profile (read-only observer): the same founding world at two rules versions (or with rules-162 parts removed), stepped with an
// unsampled twin. Written for the 7 November 2026 adversarial review, which found 1 -> 4 storehouses and fewer huts at day 10 in Large (2 seeds, one run each).
// Records every storehouse site (first seen, where, which household, finished when, how far from the other storehouses), the stone those storehouses
// consumed against the stone the huts consumed, and homes / homeless / deaths / people at days 5, 10, 15 and the end. Large, arrivals on.
// Usage: vite-node <this> -- <seed> <rules> <days> <out> [removalSpec ...]
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {parseIntervention} from '../../scripts/lab/lab';
import {isSolidHome,DAY} from '../../src/sim/constants';
import type {World} from '../../src/sim/types';
const [seed='river',rules='162',days='10',out='ab-large.json',...specs]=process.argv.slice(2);
const undo=specs.map(s=>parseIntervention(s).install());
const w=createWorld({...currentWorldSettings('large',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
const founders=w.persons.filter(p=>p.alive).length;
const bump=(h:Record<string,number>,k:string,n=1)=>{h[k]=(h[k]??0)+n;};
type Site={id:number;hh:number;x:number;y:number;firstDay:number;builtDay:number|null;stoneCost:number;woodCost:number;nearestOtherStorehouse:number|null};
const stores=new Map<number,Site>();
const sitesStarted:Record<string,number>={};const seenSite=new Set<number>();
const snap=(w2:World)=>{
 const hh=new Map(w2.households.map(h=>[h.id,h]));const ids=new Set(w2.buildings.map(b=>b.id));
 let homeless=0;for(const p of w2.persons)if(p.alive){const h=hh.get(p.hhId);if(!h||!h.homeId||!ids.has(h.homeId))homeless++;}
 const bt:Record<string,number>={};for(const b of w2.buildings)bump(bt,b.type);
 return {alive:w2.persons.filter(p=>p.alive).length,deaths:w2.persons.filter(p=>!p.alive).length,solidHomes:w2.buildings.filter(b=>isSolidHome(b.type)).length,homeless,buildings:bt,
  openSites:w2.sites.length,stoneHeldByStorehouses:w2.buildings.filter(b=>b.type==='storehouse').reduce((s,b)=>s+(b.store.items.stone??0),0)};
};
const checkpoints:Record<string,ReturnType<typeof snap>>={};
while(w.tick<Number(days)*DAY){
 stepWorld(w);stepWorld(twin);
 for(const s of w.sites){
  if(!seenSite.has(s.id)){seenSite.add(s.id);bump(sitesStarted,s.type);}
  if(s.type==='storehouse'&&!stores.has(s.id))stores.set(s.id,{id:s.id,hh:s.hhId,x:s.x,y:s.y,firstDay:+(w.tick/DAY).toFixed(2),builtDay:null,stoneCost:s.required.stone??0,woodCost:s.required.wood??0,nearestOtherStorehouse:null});
 }
 for(const st of stores.values())if(st.builtDay===null&&!w.sites.some(s=>s.id===st.id))st.builtDay=+(w.tick/DAY).toFixed(2);
 if([5,10,15,25].some(d=>w.tick===d*DAY))checkpoints[`day${w.tick/DAY}`]=snap(w);
}
const list=[...stores.values()];
for(const a of list){let best:number|null=null;for(const b of list)if(a!==b){const d=Math.hypot(a.x-b.x,a.y-b.y);if(best===null||d<best)best=+d.toFixed(1);}a.nearestOtherStorehouse=best;}
const hutsStone=w.buildings.filter(b=>isSolidHome(b.type)).length;
const res={seed,profile:'large',rules:Number(rules),days:Number(days),removed:specs,founders,exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,
 storehousesLaidOut:list.length,storehousesFinished:list.filter(s=>s.builtDay!==null).length,stoneCommittedToStorehouses:list.reduce((s,x)=>s+x.stoneCost,0),
 solidHomesAtEnd:hutsStone,sitesStartedByType:sitesStarted,storehouses:list,checkpoints,end:snap(w)};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({seed,rules:res.rules,removed:specs,founders,exactTwin:res.exactTwin,conserved:res.conserved,laidOut:res.storehousesLaidOut,finished:res.storehousesFinished,stoneCommitted:res.stoneCommittedToStorehouses,end:res.end,sitesStarted}));
undo.reverse().forEach(f=>f());
