import { mkdirSync, writeFileSync } from 'node:fs';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { ageYears, stageOf } from '../../src/sim/people';
import { DAY } from '../../src/sim/constants';
import { runLive } from '../../src/agent/run';
import { manualModel } from '../../scripts/inhabit/manual';
import { sourcesFingerprint } from '../../scripts/inhabit/sources';
import { DEFAULT_BUDGET } from '../../src/agent/model';
import { serializeWorld } from '../../src/app/save';
const out = 'review_evidence/civilian-fifteen-days-20261113';
mkdirSync(out, { recursive: true });
const world = createWorld(currentWorldSettings('normal', 'river', { immigration: true }));
const name = process.argv[2];
if (!name) {
 console.log(JSON.stringify(world.persons.filter(p => stageOf(world,p) === 'adult').map(p => ({name:p.name,age:ageYears(world,p),sex:p.sex,partner:p.partnerId})),null,2));
} else {
 const p = world.persons.find(p => p.name === name && stageOf(world,p) === 'adult');
 if (!p) throw new Error('Choose an adult from the roster');
 writeFileSync(`${out}/initial-world.json`,serializeWorld(world));
 const r = await runLive(world,p.id,manualModel(`${out}/bridge`,'Codex-civilian'),{
  until:15*DAY, memory:true, sources:sourcesFingerprint(),
  budget:{...DEFAULT_BUDGET,maxCallsPerDay:1000,timeoutMs:3600000},
 });
 writeFileSync(`${out}/transcript.json`,JSON.stringify(r.transcript));
 writeFileSync(`${out}/final-world.json`,serializeWorld(r.world));
 console.log(JSON.stringify({end:r.transcript.end,person:r.world.persons.find(q=>q.id===p.id)},null,2));
}
