import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { estimatedAmount } from '../src/sim/knowledge';
const w = createWorld(defaultSettings('kappa'));
let done = false;
for (let i = 0; i < 16600 && !done; i++) {
  stepWorld(w);
  for (const p of w.persons) {
    if (p.needs.hunger < 4 && p.name === 'Kai') {
      const foods = ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot'] as const;
      console.log(`t${i} ${p.name} at ${p.x.toFixed(0)},${p.y.toFixed(0)} hunger ${p.needs.hunger.toFixed(1)}`);
      for (const k of foods) {
        const ids = p.bykind[k] ?? [];
        const info = ids.map((id) => { const b = p.beliefs[id]; const real = w.byId.get(id) as any; return `(${b.x.toFixed(0)},${b.y.toFixed(0)} d${Math.hypot(b.x - p.x, b.y - p.y).toFixed(0)} est${estimatedAmount(w, b)} real${real ? real.amount : 'X'} f${p.failures[id] ? w.tick - p.failures[id].tick : '-'})`; });
        console.log(' ', k, ids.length, info.slice(0, 14).join(' '));
      }
      console.log('  explored fraction:', (p.explored.reduce((a, b) => a + b, 0) / p.explored.length).toFixed(2));
      console.log('  real food sources (usable) in world within 40 of camp:', w.sources.filter((s) => foods.includes(s.type as any) && s.amount >= 2).length);
      done = true;
      break;
    }
  }
}
