// Invariant audit over a long ordinary run. usage: npx vite-node scripts/invariants.ts <seed> <days> [harsh]
// Checks every 300 ticks that the books balance, tools match, nobody holds a claim they are not using,
// carts and pullers agree, promises are well formed and not duplicated, and a meal table is empty unless a meal is on.
import { createWorld, defaultSettings } from '../src/sim/factory';
import { conservationReport, foodUnits } from '../src/sim/economy';
import { toolReport } from '../src/sim/toolreg';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import type { World } from '../src/sim/types';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 30);
const harsh = process.argv[4] === 'harsh';
const w: World = createWorld({ ...defaultSettings(seed), harsh });
const problems: Record<string, { n: number; first: string }> = {};
const flag = (kind: string, text: string) => {
  const c = problems[kind] ?? { n: 0, first: `t${w.tick} ${text}` };
  c.n++;
  problems[kind] = c;
};

function audit(): void {
  const led = conservationReport(w);
  if (!led.ok) flag('ledger', JSON.stringify(led.diffs).slice(0, 200));
  const tr = toolReport(w);
  if (!tr.ok) flag('tools', tr.problems.slice(0, 2).join('; '));
  // claims belong to someone who is using them
  const claimed = new Set<number>();
  for (const p of w.persons) {
    for (const id of p.activity?.claims ?? []) claimed.add(id);
    for (const id of p.suspended?.claims ?? []) claimed.add(id);
  }
  for (const r of w.reservations.values()) {
    const owner = w.byId.get(r.owner);
    if (!owner || owner.ent !== 'person' || !owner.alive) flag('claim-of-the-gone', `${r.kind} on ${r.target} owned by ${r.owner}`);
    else if (!claimed.has(r.id)) flag('claim-unused', `${r.kind} on ${r.target} owned by ${owner.name}, activity ${owner.activity?.kind ?? 'none'}`);
  }
  // carts and pullers
  for (const c of w.carts) {
    if (c.puller) {
      const pl = w.byId.get(c.puller);
      if (!pl || pl.ent !== 'person' || !pl.alive || pl.cartId !== c.id) flag('cart-puller', `cart ${c.id} puller ${c.puller}`);
    }
  }
  for (const p of w.persons) {
    if (p.cartId) {
      const c = w.byId.get(p.cartId);
      if (!c || c.ent !== 'cart' || c.puller !== p.id) flag('puller-cart', `${p.name} cart ${p.cartId}`);
    }
    // promises
    const seen = new Set<string>();
    for (const c of p.commitments) {
      if (c.status !== 'active') continue;
      if (!(c.deadline > 0)) flag('promise-no-deadline', `${p.name} ${c.kind}`);
      if (c.deadline < w.tick - 3000 && !c.grace) flag('promise-overdue-open', `${p.name} ${c.kind} ${c.item} deadline ${c.deadline}`);
      const key = `${c.kind}|${c.to}|${c.item}|${c.siteId}|${c.destId}|${c.toolId ?? ''}`;
      if (seen.has(key)) flag('promise-duplicate', `${p.name} ${key}`);
      seen.add(key);
      const to = w.byId.get(c.to);
      if (!to || (to.ent === 'person' && !to.alive)) flag('promise-to-gone', `${p.name} -> ${c.to}`);
    }
    if (p.commitments.filter((c) => c.status === 'active').length > 3) flag('promise-too-many', p.name);
    for (const k of Object.keys(p.needs) as (keyof typeof p.needs)[]) if (!Number.isFinite(p.needs[k])) flag('need-nan', `${p.name} ${k}`);
    if (p.alive && w.byId.get(p.id) !== p) flag('registry', p.name);
  }
  // meals
  for (const m of w.meals) {
    const live = m.status === 'inviting' || m.status === 'gathering' || m.status === 'eating';
    if (!live && foodUnits(m.table) > 0) flag('meal-table-left', `meal ${m.id} ${m.status} ${JSON.stringify(m.table)}`);
    if (live) {
      const host = w.byId.get(m.host);
      if (!host || host.ent !== 'person' || !host.alive) flag('meal-host-gone', `meal ${m.id}`);
    }
    if (!live && m.status !== 'done' && m.status !== 'cancelled') flag('meal-status', m.status);
  }
  // facilities
  for (const b of w.buildings) {
    if (!b.ops) continue;
    for (const k of Object.keys(b.store.items) as (keyof typeof b.store.items)[]) if ((b.store.items[k] ?? 0) < -1e-9) flag('negative-stock', `${b.type} ${k}`);
  }
}

for (let t = 0; t < days * DAY; t++) {
  stepWorld(w);
  if (w.tick % 300 === 0) audit();
}
const alive = w.persons.filter((p) => p.alive).length;
console.log(`${seed}${harsh ? '/harsh' : ''}: ${days} days, population ${alive}, deaths ${w.deceased.length} (${w.deceased.map((d) => `${d.name}:${d.cause}`).join(', ') || 'none'})`);
console.log(Object.keys(problems).length ? JSON.stringify(problems, null, 1) : 'no invariant violated');
