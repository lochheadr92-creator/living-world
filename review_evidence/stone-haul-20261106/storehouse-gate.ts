// ORDINARY diagnosis (read-only): why is a storehouse not laid out? Every new decision a person makes is read from p.lastDecision:
// was "Lay out a storehouse" among the options they weighed (chosen or an alternative), and if so how did it score against what they chose?
// Also, at each 120-tick sample, the gates of options_work.ts optPlanBuild are re-evaluated from world state for every adult/youth with a household:
// which gate would have stopped them first. Normal, arrivals on, rules pinned. Usage: vite-node <this> <seed> <rules> <days> <out>.
// Nothing here writes to the world; an unsampled twin must match.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';
import {DAY,isSolidHome} from '../../src/sim/constants';
const [seed='river',rules='161',days='12',out='storehouse-gate.json',profile='normal']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings(profile as 'normal'|'large',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
type Hist=Record<string,number>;
const bump=(h:Hist,k:string|number,n=1)=>{h[String(k)]=(h[String(k)]??0)+n;};
const seenDecision=new Map<number,number>();
const dec={decisions:0,withStorehouseOption:0,storehouseChosen:0,rankOfStorehouse:{} as Hist,gapToChosen:[] as number[]};
const gate:Hist={};
let samples=0;
const labelOf=(s:{label:string})=>s.label;
while(w.tick<Number(days)*DAY){
 stepWorld(w);stepWorld(twin);
 for(const p of w.persons){
  if(!p.alive||!p.lastDecision)continue;
  const d=p.lastDecision;if(seenDecision.get(p.id)===d.tick)continue;seenDecision.set(p.id,d.tick);
  if(stageOf(w,p)==='child')continue;
  dec.decisions++;
  const all=[...(d.chosen?[d.chosen]:[]),...d.alternatives];
  const i=all.findIndex(o=>/storehouse/i.test(labelOf(o)));
  if(i>=0){dec.withStorehouseOption++;bump(dec.rankOfStorehouse,i);if(i===0)dec.storehouseChosen++;else if(d.chosen)dec.gapToChosen.push(+(d.chosen.utility-all[i].utility).toFixed(1));}
 }
 if(w.tick%120)continue;
 samples++;
 const huts=w.buildings.filter(b=>isSolidHome(b.type)).length;
 const haveStore=w.buildings.some(b=>b.type==='storehouse')||w.sites.some(s=>s.type==='storehouse');
 for(const p of w.persons){
  if(!p.alive||!p.hhId)continue;
  if(stageOf(w,p)==='child')continue;
  const why=
   haveStore?'a storehouse or its site already exists':
   huts<1?'no solid home in the world yet':
   p.hunger>28||p.thirst>28?'too hungry or thirsty to start a building':
   w.sites.some(s=>s.hhId===p.hhId)?'own household already has a site open':
   w.sites.length>=4?'four or more sites open (maxOpenSites is 4)':
   'would reach the food-shortage and temperament gates';
  bump(gate,why);
 }
}
const res={seed,profile,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 storehousesBuilt:w.buildings.filter(b=>b.type==='storehouse').length,storehouseSites:w.sites.filter(s=>s.type==='storehouse').length,solidHomes:w.buildings.filter(b=>isSolidHome(b.type)).length,
 samples,decisions:dec.decisions,withStorehouseOption:dec.withStorehouseOption,storehouseChosen:dec.storehouseChosen,rankOfStorehouse:dec.rankOfStorehouse,
 medianGapToChosen:dec.gapToChosen.sort((a,b)=>a-b)[Math.floor(dec.gapToChosen.length/2)]??null,firstGateStopping:gate};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify(res));
