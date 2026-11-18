// Read-only probe: does a 2-draw nudge move the aspen day-48 save? Prints stream state and hash every 60 ticks for 600 ticks.
import { worldFromArgs } from 'C:/dev/Claude Experiment/living-world-integrate/scripts/world_args';
import { hashWorld, stepWorld } from 'C:/dev/Claude Experiment/living-world-integrate/src/sim/world';
const path = process.argv.slice(2).find((a) => a.endsWith('.json')) ?? 'C:/dev/lw_saves/day48/aspen-day48.save.json';
const args: Record<string, string> = { load: path, 'rules-up': '255' };
const opt = (k: string, d: string): string => args[k] ?? d;
const mk = (n: number) => { const l = worldFromArgs(opt); const s0 = `${l.w.rng.a},${l.w.rng.b},${l.w.rng.c},${l.w.rng.d}`; for (let i = 0; i < n; i++) l.w.rng.next(); return { w: l.w, s0 }; };
const arms = [0, 1, 2].map((n) => ({ n, ...mk(n) }));
for (const a of arms) console.log(`nudge ${a.n}: stream at load ${a.s0}  after nudge ${a.w.rng.a},${a.w.rng.b},${a.w.rng.c},${a.w.rng.d}  tick ${a.w.tick}  rules ${a.w.settings.rulesVersion}`);
for (let t = 0; t < 600; t++) {
  for (const a of arms) stepWorld(a.w);
  if ((t + 1) % 60 === 0) console.log(`tick +${t + 1}: ` + arms.map((a) => `n${a.n}=${hashWorld(a.w)} d=${a.w.rng.d}`).join('  '));
}
