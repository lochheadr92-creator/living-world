// What fills the ground a granary may be laid on? Read-only: loads save points and counts every tile 3 to 11 and 3 to 20 tiles from the
// hub by what is on it (the ring findBuildSpot searches for a granary, and the wider one), for the hub of the first grown person whose
// household works a plot.
//   node scripts/fast.mjs scripts/ring_census.ts -- --load a.save.json --load2 b.save.json ...   (--load, --load2 .. --load6)
import { writeFileSync } from 'node:fs';
import { argsOf, worldFromArgs } from './world_args';
import { BUILD_DEF, DAY, isHomeType } from '../src/sim/constants';
import { makeCtx } from '../src/sim/optutil';
import { baseHub } from '../src/sim/settlements';
import { stageOf } from '../src/sim/people';
import { T } from '../src/sim/types';
import { dist } from '../src/sim/util';
import type { World } from '../src/sim/types';

const { opt } = argsOf(process.argv);
const out = opt('out', '');
const results: Record<string, unknown>[] = [];
for (const key of ['load', 'load2', 'load3', 'load4', 'load5', 'load6']) {
  const path = opt(key, '');
  if (!path) continue;
  const o = (name: string, d: string): string => (name === 'load' ? path : opt(name, d));
  const { w }: { w: World } = worldFromArgs(o, 'aspen');
  const plotHhs = new Set(w.plots.map((pl) => pl.hhId));
  const p = w.persons.find((q) => q.alive && stageOf(w, q) !== 'child' && plotHhs.has(q.hhId));
  if (!p) { results.push({ path, error: 'no grown person with a plot' }); continue; }
  const ctx = makeCtx(w, p, false, true);
  const hub = baseHub(w, p, ctx.home);
  const census = (rMin: number, rMax: number): Record<string, number> => {
    const c: Record<string, number> = {};
    const bump = (k: string): void => { c[k] = (c[k] ?? 0) + 1; };
    for (let y = Math.max(0, Math.floor(hub.y - rMax)); y <= Math.min(w.H - 1, Math.ceil(hub.y + rMax)); y++) {
      for (let x = Math.max(0, Math.floor(hub.x - rMax)); x <= Math.min(w.W - 1, Math.ceil(hub.x + rMax)); x++) {
        const d = dist(x + 0.5, y + 0.5, hub.x, hub.y);
        if (d < rMin || d > rMax) continue;
        bump('tiles');
        const i = y * w.W + x;
        const t = w.terrain[i];
        const occ = w.occ[i];
        if (t === T.DEEP || t === T.SHALLOW) { bump('water'); continue; }
        if (t === T.STONY) { bump('stony ground'); continue; }
        if (occ) {
          const e = w.byId.get(occ);
          if (!e) { bump('occupied: unknown'); continue; }
          if (e.ent === 'building') bump(isHomeType(e.type) ? 'building: a home (' + e.type + ')' : 'building: ' + e.type);
          else if (e.ent === 'site') bump('site: ' + e.type);
          else if (e.ent === 'source') bump('source: ' + e.type);
          else bump('occupied: ' + e.ent);
          continue;
        }
        if (w.solid[i]) { bump('solid, unoccupied'); continue; }
        bump('free land (grass/sand/forest)');
      }
    }
    return c;
  };
  results.push({
    path, seed: w.settings.seed, day: w.tick / DAY, hub: [hub.x, hub.y], person: p.id,
    ring3to11: census(3, 11), ring3to20: census(3, 20),
    plotsInWorld: w.plots.length, buildings: w.buildings.length,
    granaryFootprint: [BUILD_DEF.granary.w, BUILD_DEF.granary.h],
  });
}
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
for (const r of results) console.log(JSON.stringify(r));
