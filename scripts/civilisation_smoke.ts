import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import { serializeWorld } from '../src/app/save';
import { writeFileSync, mkdirSync } from 'node:fs';
const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
mkdirSync('civic_evidence', {recursive:true});
let saved = false;
for (let i=0;i<14400;i++) {
 stepWorld(w);
 if (!saved && w.civicProjects?.some(q => q.status === 'active' && q.participants.length >= 2)) {
  writeFileSync('civic_evidence/active.json', serializeWorld(w)); saved = true;
 }
}
writeFileSync('civic_evidence/final.json', serializeWorld(w));
const report={tick:w.tick, towns:w.townships, projects:w.civicProjects??[], ledger:conservationReport(w)};
writeFileSync('civic_evidence/autonomous-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
