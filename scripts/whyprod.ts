// Why is nobody collecting / making X? usage: npx vite-node scripts/whyprod.ts [seed] [days]
import { defaultSettings, generateNatural } from '../src/sim/worldgen';
import { stepWorld } from '../src/sim/world';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { DAY } from '../src/sim/constants';
import { demandsOf } from '../src/sim/production';
import { makeCtx } from '../src/sim/optutil';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 15);
const world = generateNatural(defaultSettings(seed));
for (let i = 0; i < days * DAY; i++) stepWorld(world);

console.log('sites:', world.sites.map((s) => `${s.type}#${s.id} work ${Math.round(s.work)}/${s.workTotal} delivered ${JSON.stringify(s.delivered)} used ${JSON.stringify(s.used)} req ${JSON.stringify(s.required)}`).join('\n       '));
for (const b of world.buildings) if (b.ops) console.log(`${b.type}#${b.id} hh${b.hhId} store ${JSON.stringify(b.store.items)} job ${b.ops.job ? b.ops.job.recipe + ':' + b.ops.job.phase : '-'} earmarks ${JSON.stringify(b.ops.earmarks)} batches ${b.ops.batches} blocker "${b.ops.lastBlocker}"`);

let shown = 0;
for (const p of world.persons) {
  if (!p.alive) continue;
  const ctx = makeCtx(world, p, true);
  const ds = demandsOf(ctx);
  const owner = world.sites.some((x) => x.hhId === p.hhId && x.type === 'house' && x.work > 300);
  if (!owner) continue;
  if (shown++ > 7) break;
  const c = generateOptions(world, p, true);
  const ranked = rankOptions(c);
  console.log(`\n${p.name} (hh ${p.hhId}) hunger ${Math.round(p.needs.hunger)} thirst ${Math.round(p.needs.thirst)} doing ${p.activity ? p.activity.kind + ':' + p.activity.label : '-'}`);
  console.log('  demands:', ds.map((d) => `${d.qty} ${d.item} (${d.base.toFixed(1)}, ${d.why})`).join('; '));
  for (const o of ranked.slice(0, 6)) console.log(`   ${o.util.toFixed(1)} ${o.kind} ${o.label} [${o.tag}]`);
  const prod = c.options.filter((o) => ['operate', 'withdraw', 'deposit', 'cart_haul', 'tool_work'].includes(o.kind) && o.tag !== 'salvage').slice(0, 6);
  for (const o of prod) console.log(`   (prod) ${o.util.toFixed(1)} ${o.kind} ${o.label} [${o.tag}]`);
  for (const o of c.blocked.filter((x) => ['operate', 'withdraw', 'plan_site'].includes(x.kind)).slice(0, 6)) console.log(`   (blocked) ${o.kind} ${o.label}: ${o.blocked}`);
}
