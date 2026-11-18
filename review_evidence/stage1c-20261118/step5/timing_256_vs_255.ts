// Time of 20,000 ticks of gen-4 (arrivals on, Normal) at one rules version, for a side by side comparison of 255 and 256.
//   RULES=256 npx vite-node review_evidence/stage1c-20261118/step5/timing_256_vs_255.ts
import { createWorld } from '../../../src/sim/factory';
import { currentWorldSettings } from '../../../src/sim/profiles';
import { stepWorld } from '../../../src/sim/world';

const rules = Number(process.env.RULES ?? '256');
const w = createWorld({ ...currentWorldSettings('normal', 'gen-4', { immigration: true }), rulesVersion: rules });
const t0 = performance.now();
while (w.tick < 20000) stepWorld(w);
const ms = performance.now() - t0;
console.log(JSON.stringify({ rules, ticks: w.tick, ms: Math.round(ms), msPerTick: +(ms / w.tick).toFixed(3), alive: w.persons.filter((p) => p.alive).length }));
