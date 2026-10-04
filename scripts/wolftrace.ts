import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { clockText } from '../src/sim/environment';
const seed = process.argv[2] ?? 'meadow';
const from = Number(process.argv[3] ?? 45600);
const to = Number(process.argv[4] ?? 47400);
const step = Number(process.argv[5] ?? 60);
const w = createWorld(defaultSettings(seed));
for (let i = 0; i < to; i++) {
  if (i >= from && i % step === 0) {
    const line = w.animals.map((a) => `${a.id}:${a.state}@${a.x.toFixed(1)},${a.y.toFixed(1)}(den ${a.denX.toFixed(0)},${a.denY.toFixed(0)})`).join('  ');
    let near = 0;
    for (const p of w.persons) for (const a of w.animals) if (Math.hypot(a.x - p.x, a.y - p.y) < 8) near++;
    console.log(`t${i} ${clockText(w.tick)} near=${near} ${line}`);
  }
  stepWorld(w);
}
