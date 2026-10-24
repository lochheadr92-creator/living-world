import {writeFileSync} from 'node:fs';
import {economyFixture} from '../tests/helpers/settlement_economy';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=economyFixture();f.demonstrate();
if(!conservationReport(f.w).ok)throw new Error('conservation failed');
writeFileSync('civic_evidence/settlement-economy-save.json',serializeWorld(f.w));
console.log(JSON.stringify(f.w.economicObservations));
