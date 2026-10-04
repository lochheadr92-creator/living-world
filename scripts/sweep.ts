// Many-seed survival sweep. usage: npx vite-node scripts/sweep.ts [seed,seed,...] [days] [harsh]
// Runs each seed from its default settings and prints every death (cause, day) and anyone "sealed in": twice a day, a flood
// fill over walkable tiles (8 neighbours, no corner cutting, as the pathfinder moves) within 8 tiles of where each person
// stands; 6 or fewer reachable tiles means they are boxed in by buildings, trees or water.
import { createWorld, defaultSettings } from '../src/sim/factory';
import { conservationReport } from '../src/sim/economy';
import { isWalkable } from '../src/sim/registry';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import type { Person, World } from '../src/sim/types';

const SEEDS = 'meadow,river,fern,aspen,heath,cedar,ember,delta,willow,birch,maple,oak,pine,elm,ash,linden';
const seeds = (process.argv[2] || SEEDS).split(',');
const days = Number(process.argv[3] ?? 30);
const harsh = process.argv[4] === 'harsh';
const RADIUS = 8;
const SEALED_AT_MOST = 6;
const SAMPLE_EVERY = DAY / 2;

/** walkable tiles reachable from where the person stands without leaving a (2·RADIUS+1)² box around them */
function reachableNear(w: World, p: Person): number {
  const sx = Math.floor(p.x);
  const sy = Math.floor(p.y);
  const size = 2 * RADIUS + 1;
  const seen = new Uint8Array(size * size);
  const at = (x: number, y: number) => (y - sy + RADIUS) * size + (x - sx + RADIUS);
  const inBox = (x: number, y: number) => Math.abs(x - sx) <= RADIUS && Math.abs(y - sy) <= RADIUS;
  const open = (x: number, y: number) => inBox(x, y) && isWalkable(w, x, y);
  const queue: number[] = [sx, sy];
  seen[at(sx, sy)] = 1;
  let n = isWalkable(w, sx, sy) ? 1 : 0;
  for (let q = 0; q < queue.length; q += 2) {
    const x = queue[q];
    const y = queue[q + 1];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!open(nx, ny) || seen[at(nx, ny)]) continue;
        if (dx && dy && (!isWalkable(w, nx, y) || !isWalkable(w, x, ny))) continue; // no corner cutting
        seen[at(nx, ny)] = 1;
        n++;
        queue.push(nx, ny);
      }
    }
  }
  return n;
}

const dayOf = (tick: number) => (tick / DAY).toFixed(1);
let totalDeaths = 0;
let nonAgeDeaths = 0;
let totalSealed = 0;
let ledgerBad = 0;
for (const seed of seeds) {
  const w = createWorld({ ...defaultSettings(seed), harsh });
  const pop0 = w.persons.length;
  // person id -> sealed-in samples (first tick, last tick, count, fewest tiles, where)
  const sealed = new Map<number, { name: string; first: number; last: number; n: number; tiles: number; x: number; y: number }>();
  for (let t = 0; t < days * DAY; t++) {
    stepWorld(w);
    if (w.tick % SAMPLE_EVERY !== 0) continue;
    for (const p of w.persons) {
      if (!p.alive) continue;
      const tiles = reachableNear(w, p);
      if (tiles > SEALED_AT_MOST) continue;
      const s = sealed.get(p.id);
      if (s) {
        s.last = w.tick;
        s.n++;
        s.tiles = Math.min(s.tiles, tiles);
      } else sealed.set(p.id, { name: p.name, first: w.tick, last: w.tick, n: 1, tiles, x: p.x, y: p.y });
    }
  }
  const ledgerOk = conservationReport(w).ok;
  if (!ledgerOk) ledgerBad++;
  const deaths = w.deceased.map((d) => {
    const s = sealed.get(d.id);
    const wasSealed = s && d.tick - s.last <= SAMPLE_EVERY;
    return `${d.name} (${d.cause}, day ${dayOf(d.tick)}, aged ${d.age}${wasSealed ? ', sealed in' : ''})`;
  });
  totalDeaths += w.deceased.length;
  nonAgeDeaths += w.deceased.filter((d) => d.cause !== 'old age').length;
  totalSealed += sealed.size;
  const sealedText = [...sealed.values()].map(
    (s) => `${s.name} at (${s.x.toFixed(1)}, ${s.y.toFixed(1)}) from day ${dayOf(s.first)} to ${dayOf(s.last)}, ${s.n} sample${s.n > 1 ? 's' : ''}, ${s.tiles} tile${s.tiles === 1 ? '' : 's'}`,
  );
  const alive = w.persons.filter((p) => p.alive).length;
  console.log(
    `${seed.padEnd(7)}${harsh ? ' harsh' : ''} pop ${pop0}->${alive}  deaths: ${deaths.join('; ') || 'none'}  sealed in: ${sealedText.join('; ') || 'none'}${ledgerOk ? '' : '  LEDGER MISMATCH'}`,
  );
}
console.log(`\n${seeds.length} seed(s), ${days} days${harsh ? ', harsh' : ''}: ${totalDeaths} death(s), ${nonAgeDeaths} not of old age; ${totalSealed} person(s) sealed in; ledger ${ledgerBad ? `MISMATCH in ${ledgerBad}` : 'balanced in every run'}`);
