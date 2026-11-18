// Rules 256 contract 2, at the length the brief asks for: with every keyed part switched off a 256 world has the same hash as a 255 world
// (the version label equalised before hashing, as scripts/draw_first_diff.ts does) at day 5 and day 25. One seed per run, arrivals on, Normal.
// usage: vite-node scripts/keyed_twin.ts -- <seed> [days...]   (default days 5 25)
import { createWorld } from '../src/sim/factory';
import { setKeyedDraws } from '../src/sim/keyed_draws';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import type { World } from '../src/sim/types';
const args = process.argv.slice(2).filter((a) => a !== '--');
const seed = args[0] ?? 'gen-4';
const days = args.length > 1 ? args.slice(1).map(Number) : [5, 25];
setKeyedDraws(false);
const make = (rulesVersion: number): World => createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion });
const a = make(256);
const b = make(255);
const h = (w: World): string => { const v = w.settings.rulesVersion; w.settings.rulesVersion = 255; const x = hashWorld(w); w.settings.rulesVersion = v; return x; };
let ok = true;
for (const d of days) {
  while (a.tick < d * DAY) { stepWorld(a); stepWorld(b); }
  const ha = h(a), hb = h(b);
  if (ha !== hb) ok = false;
  console.log(JSON.stringify({ seed, day: d, tick: a.tick, hash256off: ha, hash255: hb, same: ha === hb, alive: a.persons.filter((p) => p.alive).length }));
}
if (!ok) { console.log('TWIN FAILED'); process.exit(1); }
console.log('twin held');
