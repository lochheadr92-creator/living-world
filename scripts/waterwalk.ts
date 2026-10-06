// How much of a settlement's time goes on the walk to water, and what are people doing when their thirst is critical?
// usage: npx vite-node scripts/waterwalk.ts [seed] [normal|harsh] [days]
// The walk is counted one way, from where they stood to the drinking place they chose, at normal walking speed (this is how the
// well was measured against: before it, about 5.2-5.7% of everybody's time).
import { BASE_SPEED, DAY } from '../src/sim/constants';
import { stepWorld } from '../src/sim/world';
import { defaultSettings, generateNatural } from '../src/sim/worldgen';

const seed = process.argv[2] ?? 'meadow';
const harsh = process.argv[3] === 'harsh';
const days = Number(process.argv[4] ?? 30);
const world = generateNatural({ ...defaultSettings(seed), harsh });
let walkTicks = 0;
const dists: number[] = [];
world.hooks = {
  onActivityStart: (p, a) => {
    if ((a.kind === 'drink' && !a.data.fromInv) || a.kind === 'fetch_water') {
      const d = Math.hypot(p.x - a.spotX, p.y - a.spotY);
      walkTicks += d / BASE_SPEED;
      if (a.kind === 'drink') dists.push(d);
    }
  },
};
let personTicks = 0;
const critical: Record<string, number> = {};
let criticalSamples = 0;
for (let t = 0; t < days * DAY; t++) {
  stepWorld(world);
  personTicks += world.persons.filter((p) => p.alive).length;
  if (t % 50 !== 0) continue;
  for (const p of world.persons) {
    if (!p.alive || p.needs.thirst >= 18) continue;
    criticalSamples++;
    const k = p.activity ? p.activity.kind : 'idle';
    critical[k] = (critical[k] ?? 0) + 1;
  }
}
dists.sort((a, b) => a - b);
const q = (f: number) => dists[Math.floor(f * (dists.length - 1))]?.toFixed(1);
console.log(`${seed}${harsh ? ' harsh' : ''} ${days}d: walk to water ${((100 * walkTicks) / personTicks).toFixed(2)}% of person-time; distance to the drinking place at the start of a drink: median ${q(0.5)}, p90 ${q(0.9)}, max ${q(1)}`);
console.log(`  samples with thirst critical (below 18): ${criticalSamples}, by what they were doing: ${JSON.stringify(critical)}`);
