import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
const w = createWorld(defaultSettings(process.argv[2] ?? 'meadow'));
const st: Record<string, number> = {}; let minD = 99; let nearCamp = 0; let stalks = 0; let prevState = new Map<number, string>();
for (let i = 0; i < 12 * 2400; i++) {
  stepWorld(w);
  for (const a of w.animals) {
    st[a.state] = (st[a.state] ?? 0) + 1;
    if (prevState.get(a.id) !== 'stalk' && a.state === 'stalk') stalks++;
    prevState.set(a.id, a.state);
    const dc = Math.hypot(a.x - w.camp.x, a.y - w.camp.y); nearCamp = Math.min(nearCamp || 99, dc);
    for (const p of w.persons) minD = Math.min(minD, Math.hypot(a.x - p.x, a.y - p.y));
  }
}
console.log('states', JSON.stringify(st), 'stalk starts', stalks, 'closest wolf-person', minD.toFixed(1), 'closest wolf-camp', nearCamp.toFixed(1), 'dens', w.animals.map(a => `${a.denX.toFixed(0)},${a.denY.toFixed(0)}`).join(' '), 'camp', w.camp.x.toFixed(0), w.camp.y.toFixed(0));
console.log(w.events.filter(e => e.kind === 'danger').map(e => e.text).slice(0, 8).join('\n'));
