// Bounded natural smoke, not an ensemble or a claim of survival benefit.
// Hypothesis D: sustained personally perceived hunger may produce a relocation proposal
// when a distant food/water opportunity is remembered. Workload: meadow, Normal, 4 days,
// immigration off. Compare current control and one RNG nudge with no-relocation.
// Metrics: proposals, agreements, departures, settled/failed journeys, population and
// conservation. Zero proposals is a valid null for this workload, not proof of no value.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {setRelocations} from '../src/sim/relocation';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
const result=[];
try{
 for(const arm of ['control','nudge:1','rich-no-relocation']){
  setRelocations(arm!=='rich-no-relocation');
  const w=createWorld(currentWorldSettings('normal','meadow',{immigration:false}));
  if(arm==='nudge:1')w.rng.next();
  let observedHardship=0;const actions:Record<string,number>={};
  w.hooks={onActivityStart:(_p,a)=>{if(a.kind==='relocate')actions[a.data.step]=(actions[a.data.step]??0)+1;}};
  while(w.tick<DAY*4){stepWorld(w);if(w.tick%60===0)observedHardship+=w.persons.filter(p=>p.relocationHardship!==undefined&&w.tick-p.relocationHardship>=DAY).length;}
  const records=w.households.flatMap(h=>h.relocations??[]);
  result.push({arm,rules:w.settings.rulesVersion,seed:'meadow',profile:'normal',days:4,observedHardship,actions,proposals:records.length,settled:records.filter(r=>r.phase==='settled').length,failed:records.filter(r=>r.phase==='failed').length,population:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w).ok,hash:hashWorld(w)});
 }
}finally{setRelocations(true);}
writeFileSync('civic_evidence/relocation-natural-smoke.json',JSON.stringify({classification:'bounded natural smoke; not an ensemble',result},null,2)+'\n');console.log(JSON.stringify(result));
