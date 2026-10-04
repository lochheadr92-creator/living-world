// Where do the finite deposits lie in a few worlds? usage: npx vite-node scripts/deposits.ts [seed,seed,...]
import { defaultSettings, generateNatural } from '../src/sim/worldgen';

const seeds = (process.argv[2] ?? 'meadow,river,fern,aspen,delta').split(',');
for (const seed of seeds) {
  const w = generateNatural(defaultSettings(seed));
  const deps = w.sources.filter((s) => s.type === 'clay_pit' || s.type === 'ore_vein' || s.type === 'outcrop');
  console.log(
    `${seed}: camp (${w.camp.x.toFixed(0)},${w.camp.y.toFixed(0)}) ` +
      deps.map((d) => `${d.type}@${d.x},${d.y} d=${Math.hypot(d.x - w.camp.x, d.y - w.camp.y).toFixed(0)} n=${d.amount}`).join(' | '),
  );
}
