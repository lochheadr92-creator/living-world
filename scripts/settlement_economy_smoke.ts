import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {writeFileSync} from 'node:fs';
const w=createWorld(currentWorldSettings('normal','meadow',{immigration:false}));while(w.tick<2400)stepWorld(w);
writeFileSync('civic_evidence/settlement-economy-natural.json',JSON.stringify({rules:w.settings.rulesVersion,seed:'meadow',profile:'normal',ticks:w.tick,observations:w.economicObservations},null,2)+'\n');
console.log(JSON.stringify({rules:w.settings.rulesVersion,productionGroups:w.economicObservations?.production.length,flows:w.economicObservations?.flows.length}));
