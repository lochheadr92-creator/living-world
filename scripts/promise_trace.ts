// Follow one deliver promise that breaks. usage: npx vite-node scripts/promise_trace.ts [seed] [days]
import { defaultSettings, generateNatural } from '../src/sim/worldgen';
import { stepWorld } from '../src/sim/world';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { DAY } from '../src/sim/constants';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 20);
const world = generateNatural(defaultSettings(seed));
const watched = new Map<number, string[]>();
let reported = 0;
for (let t = 0; t < days * DAY; t++) {
  stepWorld(world);
  if (t % 100 !== 0) continue;
  for (const p of world.persons) {
    for (const c of p.commitments) {
      if (c.kind !== 'deliver') continue;
      if (c.status === 'active') {
        const ctx = generateOptions(world, p, true);
        const ranked = rankOptions(ctx);
        const to = world.persons.find((q) => q.id === c.to);
        const line = `t+${t - c.made} ${p.name} doing ${p.activity?.kind ?? '-'}:${p.activity?.label ?? ''} carries ${p.inv[c.item!] ?? 0}/${c.amount - (c.delivered ?? 0)} ${c.item} [h${Math.round(p.needs.hunger)} t${Math.round(p.needs.thirst)} e${Math.round(p.needs.energy)}] pose ${p.pose} top: ${ranked.slice(0, 3).map((o) => `${o.util.toFixed(0)} ${o.kind}:${o.label.slice(0, 28)}`).join(' | ')}; promise opts: ${ctx.options.filter((o) => o.tag === 'promise').map((o) => `${o.util.toFixed(0)} ${o.label.slice(0, 26)}`).join(',') || 'none'}; blocked: ${ctx.blocked.filter((o) => o.tag === 'promise').map((o) => o.blocked).join(',')}; dist ${to ? Math.hypot(to.x - p.x, to.y - p.y).toFixed(0) : '?'} ${c.blocked ?? ''}`;
        const arr = watched.get(c.id) ?? [];
        arr.push(line);
        watched.set(c.id, arr);
      } else if (c.status === 'broken' && watched.has(c.id) && reported < 2) {
        reported++;
        console.log(`\n=== broken ${p.name} -> ${c.to} ${c.amount} ${c.item} (deadline +${c.deadline - c.made}, grace ${c.grace})`);
        for (const l of watched.get(c.id)!) console.log('  ' + l);
        watched.delete(c.id);
      }
    }
  }
}
