// Why do promises break? usage: npx vite-node scripts/promises.ts [seed] [days]
import { defaultSettings, generateNatural } from '../src/sim/worldgen';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import type { Commitment } from '../src/sim/types';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 15);
const world = generateNatural(defaultSettings(seed));
const seen = new Map<number, string>();
const tally: Record<string, number> = {};
const lines: string[] = [];
const acts: Record<number, Record<string, number>> = {};

for (let t = 0; t < days * DAY; t++) {
  stepWorld(world);
  if (t % 20 !== 0) continue;
  for (const p of world.persons) {
    for (const c of p.commitments) {
      const key = c.id;
      const prev = seen.get(key);
      if (prev === c.status) {
        if (c.status === 'active' && p.activity) {
          const m = (acts[key] ??= {});
          m[p.activity.kind] = (m[p.activity.kind] ?? 0) + 20;
        }
        continue;
      }
      seen.set(key, c.status);
      if (c.status === 'active') continue;
      const to = world.persons.find((q) => q.id === c.to);
      const have = c.item ? p.inv[c.item] ?? 0 : 0;
      const req = world.requests.find((r) => r.id === c.requestId);
      const key2 = `${c.kind}:${c.status}`;
      tally[key2] = (tally[key2] ?? 0) + 1;
      if (c.status === 'broken' || c.status === 'done') {
        lines.push(
          `${p.name} -> ${to?.name ?? '?'} ${c.kind} ${c.amount} ${c.item ?? ''} ${c.status} after ${t - c.made} ticks (deadline ${c.deadline - c.made}); carries ${have}; doing ${p.activity?.kind ?? '-'} ${p.activity?.label ?? ''}; needs h${Math.round(p.needs.hunger)} t${Math.round(p.needs.thirst)}; requester dist ${to ? Math.hypot(to.x - p.x, to.y - p.y).toFixed(0) : '?'}; req ${req?.kind} ${req?.status}; activities while active ${JSON.stringify(acts[key] ?? {})}`,
        );
      }
    }
  }
}
console.log(JSON.stringify(tally));
for (const l of lines.slice(0, 40)) console.log(l);
const total = world.requests.length;
const by: Record<string, number> = {};
for (const r of world.requests) by[`${r.kind}:${r.status}`] = (by[`${r.kind}:${r.status}`] ?? 0) + 1;
console.log('requests', total, JSON.stringify(by));
void ({} as Commitment);
