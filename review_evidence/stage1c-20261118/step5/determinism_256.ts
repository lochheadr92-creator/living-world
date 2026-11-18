// Determinism at rules 256 with every keyed part on (stage 1c step 5 gate): two worlds of the same seed, stepped separately, have the same hash
// and the same saved text at day 5, and a world saved at day 2 and loaded continues to the same text at day 5. Arrivals on, Normal.
//   SEED=river npx vite-node review_evidence/stage1c-20261118/step5/determinism_256.ts
import { createWorld } from '../../../src/sim/factory';
import { currentWorldSettings } from '../../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../../src/app/save';
import { hashWorld, stepWorld } from '../../../src/sim/world';
import { DAY } from '../../../src/sim/constants';

const seed = process.env.SEED ?? 'river';
const make = () => createWorld(currentWorldSettings('normal', seed, { immigration: true }));
const a = make(), b = make();
let mid: string | null = null;
while (a.tick < 5 * DAY) {
  stepWorld(a); stepWorld(b);
  if (a.tick === 2 * DAY) mid = serializeWorld(a);
}
const c = deserializeWorld(mid!);
while (c.tick < 5 * DAY) stepWorld(c);
const ha = hashWorld(a), hb = hashWorld(b), hc = hashWorld(c);
const sa = serializeWorld(a);
console.log(JSON.stringify({ seed, rules: a.settings.rulesVersion, tick: a.tick, hashA: ha, hashB: hb, hashLoaded: hc, twoRuns: ha === hb && sa === serializeWorld(b), saveLoad: hc === ha && serializeWorld(c) === sa, alive: a.persons.filter((p) => p.alive).length }));
if (!(ha === hb && sa === serializeWorld(b) && hc === ha && serializeWorld(c) === sa)) { console.log('DETERMINISM FAILED'); process.exit(1); }
console.log('determinism held');
