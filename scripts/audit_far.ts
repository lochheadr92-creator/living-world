// Disposable audit: does anyone ever do work (phase 'work') while far from where the work is?
// usage: npx vite-node scripts/audit_far.ts <seed> <days> [scene]
import { createWorld, defaultSettings } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import type { SceneId } from '../src/sim/types';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 10);
const scene = (process.argv[4] ?? 'natural') as SceneId;
const w = createWorld({ ...defaultSettings(seed), scene });
const bad: Record<string, { n: number; max: number; example: string }> = {};
let checked = 0;
for (let t = 0; t < days * DAY; t++) {
  stepWorld(w);
  for (const p of w.persons) {
    const a = p.activity;
    if (!a || a.phase !== 'work') continue;
    if (a.kind === 'sleep' || a.kind === 'wander' || a.kind === 'explore' || a.kind === 'rest' || a.kind === 'flee' || a.kind === 'converse' || a.kind === 'socialize' || a.kind === 'argue') continue;
    if (a.targetType === 'tile' || a.targetType === 'person') continue;
    checked++;
    const d = Math.hypot(p.x - a.tx, p.y - a.ty);
    const reach = a.kind === 'cart_haul' || a.kind === 'operate' || a.kind === 'build' || a.kind === 'repair' ? 5.5 : 4;
    if (d > reach) {
      const k = `${a.kind}/leg${(a.data as { leg?: number }).leg ?? '-'}`;
      const cur = bad[k] ?? { n: 0, max: 0, example: '' };
      cur.n++;
      if (d > cur.max) {
        cur.max = d;
        cur.example = `t${w.tick} ${p.name} "${a.label}" at ${p.x.toFixed(1)},${p.y.toFixed(1)} target ${a.tx.toFixed(1)},${a.ty.toFixed(1)} dist ${d.toFixed(1)}`;
      }
      bad[k] = cur;
    }
  }
}
console.log(`${seed}/${scene}: ${checked} work-phase person-ticks checked over ${days} days`);
console.log(Object.keys(bad).length ? JSON.stringify(bad, null, 1) : 'no work done at a distance');
