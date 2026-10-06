// Where did the well go, and who is it nearer to than the lake? usage: npx vite-node scripts/wellgeo.ts [seed] [normal|harsh]
// Runs until the first well is standing (or day 30). For every home then standing it compares the straight-line distance to the well
// with the distance to the nearest shore tile; the second number is how many homes the well is nearer to. A well that is nearer to few
// homes than the lake saves few people a walk, whatever else it does.
import { DAY, isHomeType } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';

const seed = process.argv[2] ?? 'meadow';
const harsh = process.argv[3] === 'harsh';
const w = createWorld({ ...defaultSettings(seed), harsh });
let wellAt = -1;
for (let t = 0; t < 30 * DAY && wellAt < 0; t++) {
  stepWorld(w);
  if (t % 50 === 0 && w.buildings.some((b) => b.type === 'well')) wellAt = t;
}
const well = w.buildings.find((b) => b.type === 'well');
if (!well) {
  console.log(seed, harsh ? 'harsh' : '', 'no well by day 30');
  process.exit(0);
}
// the shore: dry tiles with water (deep or shallow) on a side
const shore: [number, number][] = [];
for (let y = 1; y < w.H - 1; y++)
  for (let x = 1; x < w.W - 1; x++) {
    const t = w.terrain[y * w.W + x];
    if (t === 0 || t === 1) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tt = w.terrain[(y + dy) * w.W + x + dx];
      if (tt === 0 || tt === 1) {
        shore.push([x, y]);
        break;
      }
    }
  }
const nearestShore = (x: number, y: number) => Math.min(...shore.map(([sx, sy]) => Math.hypot(sx - x, sy - y)));
const homes = w.buildings.filter((b) => isHomeType(b.type));
const toWell = homes.map((h) => Math.hypot(h.x - well.x, h.y - well.y));
const toShore = homes.map((h) => nearestShore(h.x, h.y));
const median = (a: number[]) => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)];
console.log(
  `${seed}${harsh ? ' harsh' : ''}: well day ${(wellAt / DAY).toFixed(1)} at ${well.x},${well.y}; camp ${w.camp.x},${w.camp.y} (well to camp ${Math.hypot(well.x - w.camp.x, well.y - w.camp.y).toFixed(1)}); ` +
    `well to lake ${nearestShore(well.x, well.y).toFixed(1)}; ${homes.length} homes then: median home-to-well ${median(toWell).toFixed(1)} vs home-to-shore ${median(toShore).toFixed(1)}; ` +
    `homes nearer the well than the shore ${toWell.filter((d, i) => d < toShore[i]).length}`,
);
