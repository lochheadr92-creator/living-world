// Experiment E bounded smoke, not an ensemble. Hypothesis: naturally encountered
// residents of other townships can provide leads for later material exchange journeys.
// Workload: meadow/Large (four founding camps, 100 people), one day, immigration off.
// Compare current control, one-draw nudge, and no-exchange-journeys. Metrics: lead
// holders, journeys, fulfilled swaps, received material, population and conservation.
// Interpretation: zero journeys is a valid null in this short contact window; positive
// counts establish occurrence only, not benefit or dependence. No thresholds are tuned.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {setExchangeJourneys} from '../src/sim/exchange_journeys';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
const result=[];
try{for(const arm of ['control','nudge:1','rich-no-exchange-journeys']){
 setExchangeJourneys(arm!=='rich-no-exchange-journeys');const w=createWorld(currentWorldSettings('large','meadow',{immigration:false}));if(arm==='nudge:1')w.rng.next();
 while(w.tick<DAY)stepWorld(w);
 const journeys=w.persons.flatMap(p=>p.exchangeJourneys??[]);
 result.push({arm,rules:w.settings.rulesVersion,seed:'meadow',profile:'large',days:1,townships:w.townships?.length,leadHolders:w.persons.filter(p=>p.tradeLeads?.length).length,journeys:journeys.length,fulfilled:journeys.filter(j=>j.status==='fulfilled').length,receipts:w.exchangeReceipts??[],population:w.persons.filter(p=>p.alive).length,conservation:conservationReport(w).ok,hash:hashWorld(w)});
}}finally{setExchangeJourneys(true);}
writeFileSync('civic_evidence/exchange-natural-smoke.json',JSON.stringify({classification:'bounded natural smoke; not an ensemble',result},null,2)+'\n');console.log(JSON.stringify(result));
