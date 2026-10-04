import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
const harsh = process.argv[3] === 'harsh';
for (const seed of (process.argv[2] ?? 'a,b,c').split(',')) {
  const w = createWorld({ ...defaultSettings(seed), harsh });
  const keys = ['hunger', 'thirst', 'energy', 'warmth', 'safety', 'social'] as const;
  const low: Record<string, number> = {}, crit: Record<string, number> = {}; let samples = 0; const acts: Record<string, number> = {};
  for (let i = 0; i < 10 * 2400; i++) {
    stepWorld(w);
    if (i % 20 === 0) for (const p of w.persons) {
      samples++;
      for (const k of keys) { if (p.needs[k] < 40) low[k] = (low[k] ?? 0) + 1; if (p.needs[k] < 15) crit[k] = (crit[k] ?? 0) + 1; }
      const a = p.activity ? p.activity.kind : 'idle'; acts[a] = (acts[a] ?? 0) + 1;
    }
  }
  const pct = (m: Record<string, number>) => keys.map((k) => `${k} ${(100 * (m[k] ?? 0) / samples).toFixed(1)}%`).join('  ');
  console.log(`${seed}${harsh ? ' HARSH' : ''}  <40: ${pct(low)}\n     <15: ${pct(crit)}`);
  console.log('     time use:', Object.entries(acts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / samples).toFixed(0)}%`).join(', '));
}
