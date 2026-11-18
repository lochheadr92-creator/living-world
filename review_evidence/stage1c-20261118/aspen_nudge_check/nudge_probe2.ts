// Read-only probe: tick by tick, where does the aspen nudge:2 world catch up with the control's stream? Prints d, draws made this tick, weather.
import { worldFromArgs } from 'C:/dev/Claude Experiment/living-world-integrate/scripts/world_args';
import { stepWorld } from 'C:/dev/Claude Experiment/living-world-integrate/src/sim/world';
const path = 'C:/dev/lw_saves/day48/aspen-day48.save.json';
const args: Record<string, string> = { load: path, 'rules-up': '255' };
const opt = (k: string, d: string): string => args[k] ?? d;
const mk = (n: number) => { const l = worldFromArgs(opt); for (let i = 0; i < n; i++) l.w.rng.next(); return l.w; };
const arms = [0, 2].map((n) => ({ n, w: mk(n), last: 0 }));
for (const a of arms) a.last = a.w.rng.d;
const st = (a: { w: typeof arms[0]['w'] }) => `${a.w.rng.a >>> 0},${a.w.rng.b >>> 0},${a.w.rng.c >>> 0},${a.w.rng.d}`;
for (let t = 0; t < 40; t++) {
  const rows: string[] = [];
  for (const a of arms) {
    stepWorld(a.w);
    rows.push(`n${a.n}: drew ${a.w.rng.d - a.last} d=${a.w.rng.d} weather=${a.w.weather.kind}/${a.w.weather.nextChange} state=${st(a)}`);
    a.last = a.w.rng.d;
  }
  const same = st(arms[0]) === st(arms[1]);
  console.log(`tick ${arms[0].w.tick}: ${rows.join(' | ')}  ${same ? 'SAME STATE' : ''}`);
}
