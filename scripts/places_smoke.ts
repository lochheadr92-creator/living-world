// One-seed look at remembered places in a rich world: how many form, how many hold, and what they make people do.
//   npx vite-node scripts/places_smoke.ts -- <seed> <days>
import { DAY } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { holdOf } from '../src/sim/places';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seed = args[0] ?? 'places-smoke';
const days = Number(args[1] ?? 6);
const w = createWorld({ ...defaultSettings(seed), dynamics: 'rich' });
const starts: Record<string, number> = {};
w.hooks = { ...(w.hooks ?? {}), onActivityStart: (_p, a) => (starts[a.kind] = (starts[a.kind] ?? 0) + 1) };
let uneasy = 0;
for (let d = 0; d < days; d++) {
  for (let t = 0; t < DAY; t++) {
    stepWorld(w);
    if (t % 300 === 0) for (const p of w.persons) if (p.alive && p.mood?.thoughts.some((x) => x.kind === 'uneasy-place' && x.until > w.tick)) uneasy++;
  }
  const alive = w.persons.filter((p) => p.alive);
  const danger = alive.reduce((n, p) => n + (p.places ?? []).filter((m) => m.kind === 'danger' && holdOf(w, m) > 0.05).length, 0);
  const grief = alive.reduce((n, p) => n + (p.places ?? []).filter((m) => m.kind === 'grief' && holdOf(w, m) > 0.05).length, 0);
  console.log(`day ${d + 1}: people ${alive.length}, deaths ${w.deceased.length}, danger places held ${danger}, grief places held ${grief}, uneasy samples ${uneasy}, respects paid ${starts.pay_respects ?? 0}, flee ${starts.flee ?? 0}`);
}
