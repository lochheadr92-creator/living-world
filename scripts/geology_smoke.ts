// Experiment C bounded probe, not an ensemble or proof of specialisation.
// Hypothesis: seeded mineral layers vary accessible opportunities across settlements;
// actual extraction/production may consequently differ. Workload: meadow/Large/100,
// two days, no immigration. Compare control + one-draw nudge to generation-only
// no-geology. Metrics: initial nearest-town deposit units, actual production and flow,
// population and conservation. Zero mineral use is a valid short-run null.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {setDepositGeology} from '../src/sim/geology';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
const results=[];
try{for(const arm of ['control','nudge:1','no-geology-at-generation']){
 setDepositGeology(arm!=='no-geology-at-generation');const w=createWorld(currentWorldSettings('large','meadow',{immigration:false}));if(arm==='nudge:1')w.rng.next();
 const minerals=w.sources.filter(s=>['clay_pit','ore_vein','outcrop'].includes(s.type));
 const initial=w.townships!.map(t=>({id:t.id,name:t.name,deposits:minerals.filter(s=>w.townships!.reduce((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)<=Math.hypot(b.x-s.x,b.y-s.y)?a:b).id===t.id).map(s=>({id:s.id,type:s.type,amount:s.amount,x:s.x,y:s.y}))}));
 if(arm==='control')writeFileSync('civic_evidence/geology-initial-save.json',serializeWorld(w));
 while(w.tick<2*DAY)stepWorld(w);
 results.push({arm,rules:w.settings.rulesVersion,seed:'meadow',profile:'large',days:2,initial,production:w.economicObservations?.production??[],flows:w.economicObservations?.flows??[],alive:w.persons.length,conservation:conservationReport(w).ok});
 if(arm==='control')writeFileSync('civic_evidence/geology-observed-save.json',serializeWorld(w));
}}finally{setDepositGeology(true);}
writeFileSync('civic_evidence/geology-natural-smoke.json',JSON.stringify({classification:'bounded two-day natural probe, not an ensemble',results},null,2)+'\n');console.log(results.map(r=>({arm:r.arm,alive:r.alive,conservation:r.conservation,productionRows:r.production.length,flows:r.flows.length})));
