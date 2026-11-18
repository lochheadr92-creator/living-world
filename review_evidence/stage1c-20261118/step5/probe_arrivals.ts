import { createWorld } from '../../../src/sim/factory';
import { currentWorldSettings } from '../../../src/sim/profiles';
import { stepWorld } from '../../../src/sim/world';
const seed = process.env.SEED ?? 'gen-4';
const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 256 });
const marks = [6000, 12000, 18000, 24000, 30000, 36000];
const t0 = Date.now();
for (const m of marks) {
  while (w.tick < m) stepWorld(w);
  console.log(JSON.stringify({ seed, tick: w.tick, arrivals: w.stats.arrivals ?? 0, alive: w.persons.filter((p) => p.alive).length, sec: Math.round((Date.now() - t0) / 1000) }));
}

