// Read-only end-state diagnosis of the cart chain in a saved ordinary world: for every living adult, whether a cart is wanted and on
// which ground, whether they hold a hammer, what the batch planner would take on, what the planner offers or blocks about the cart
// and its components at the timber yard, and the yard as they remember it. Observer purity is checked. Retained records are not a
// lifetime denominator; this is one tick's snapshot.
// Usage: vite-node scripts/cart_diagnosis.ts <save.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { generateOptions } from '../src/sim/decision';
import { demandsOf, facilitiesOf } from '../src/sim/production';
import { batchWanted } from '../src/sim/batch_plan';
import { cartExperience } from '../src/sim/transport';
import { beliefsByKind } from '../src/sim/optutil';
import { stageOf } from '../src/sim/people';
import { toolsHeldBy } from '../src/sim/toolreg';
import { WEIGHT } from '../src/sim/constants';
import type { ItemKind } from '../src/sim/types';

const [path, out] = process.argv.slice(2);
if (!path || !out) throw new Error('input save and output report required');
const w = deserializeWorld(readFileSync(path, 'utf8'));
const before = serializeWorld(w);
const unitsOf = (n: number | undefined): number => n ?? 0;
const cartish = /handcart|handles|planks|timber yard/i;
const people = w.persons
  .filter((p) => p.alive && stageOf(w, p) === 'adult')
  .map((p) => {
    const ctx = generateOptions(w, p, true, true);
    const demands = demandsOf(ctx);
    const cart = demands.find((d) => d.item === 'cart');
    let heavy = 0;
    for (const s of beliefsByKind(p, ['site'])) {
      if (!(s.hh === p.hhId || s.hh === 0)) continue;
      for (const k of Object.keys(s.need ?? {}) as ItemKind[]) heavy += unitsOf(s.need?.[k]) * WEIGHT[k];
    }
    const yard = facilitiesOf(ctx, 'timber_yard')[0];
    const top = [...ctx.options].sort((a, b) => b.util - a.util).slice(0, 3).map((o) => ({ key: o.key, label: o.label, util: Math.round(o.util * 10) / 10 }));
    return {
      id: p.id,
      name: p.name,
      hh: p.hhId,
      build: Math.round(p.skills.build * 100) / 100,
      carpentry: Math.round((p.skills.carpentry ?? 0) * 100) / 100,
      diligence: Math.round(p.traits.diligence * 100) / 100,
      hammer: unitsOf(p.inv.hammer),
      saw: unitsOf(p.inv.saw),
      axe: unitsOf(p.inv.axe),
      pack: p.inv,
      knownSiteDeficitWeight: heavy,
      hauling: p.hauling ?? null,
      experienceGround: cartExperience(ctx),
      cartDemand: cart ?? null,
      demands: demands.map((d) => ({ item: d.item, qty: d.qty, base: Math.round(d.base * 10) / 10, why: d.why })),
      batchWanted: batchWanted(ctx),
      activePlans: p.intentions.filter((i) => i.status === 'active').map((i) => ({ kind: i.kind, makes: i.makes, step: i.step, blocked: i.blocked, since: i.since, until: i.until })),
      pastCartPlans: p.intentions.filter((i) => i.makes === 'cart').map((i) => ({ status: i.status, reason: i.reason, since: i.since, step: i.step })),
      cartOffers: ctx.options.filter((o) => cartish.test(o.label) || cartish.test(o.goal)).map((o) => ({ key: o.key, label: o.label, goal: o.goal, util: Math.round(o.util * 10) / 10, parts: o.parts })),
      cartBlocked: ctx.blocked.filter((o) => cartish.test(o.label) || cartish.test(o.goal)).map((o) => ({ label: o.label, goal: o.goal, blocked: o.blocked })),
      toolWanted: ctx.toolWanted ?? null,
      topOptions: top,
      yardAsRemembered: yard ? { id: yard.b.id, seen: yard.b.seen, items: yard.b.items, tools: yard.b.tools, ops: yard.b.ops ? { job: yard.b.ops.job, readyAt: yard.b.ops.readyAt, client: yard.b.ops.client, progress: yard.b.ops.progress } : null, hh: yard.b.hh } : null,
    };
  });
if (before !== serializeWorld(w)) throw new Error('Diagnosis observer mutation');
const yards = w.buildings.filter((b) => b.type === 'timber_yard').map((b) => ({ id: b.id, x: b.x, y: b.y, items: b.store.items, rack: toolsHeldBy(w, b.id).map((t) => t.kind), ownerHh: b.hhId, ops: b.ops ? { job: b.ops.job, produced: b.ops.produced, consumed: b.ops.consumed, lastRun: b.ops.lastRun, lastBlocker: b.ops.lastBlocker } : null }));
const report = {
  input: path,
  inputSha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  rules: w.settings.rulesVersion,
  tick: w.tick,
  evidence: 'One-tick snapshot of offered choices, demands, batch wants and remembered workshop state; retained histories only; no causal claim.',
  summary: {
    adults: people.length,
    hammerHolders: people.filter((p) => p.hammer > 0).map((p) => p.name),
    wantCart: people.filter((p) => p.cartDemand).map((p) => `${p.name} (${p.cartDemand!.why})`),
    wantCartWithHammer: people.filter((p) => p.cartDemand && p.hammer > 0).map((p) => p.name),
    batchWantsCart: people.filter((p) => p.batchWanted?.item === 'cart').map((p) => p.name),
    maxKnownSiteDeficitWeight: Math.max(0, ...people.map((p) => p.knownSiteDeficitWeight)),
    carts: w.carts.length,
    craftedHammers: w.ledger.reasons['+crafted: hammer'] ?? 0,
    handlesMade: Object.entries(w.ledger.reasons).filter(([k]) => /handles/.test(k)),
    planksMade: Object.entries(w.ledger.reasons).filter(([k]) => /planks/.test(k)),
    openSites: w.sites.map((s) => ({ id: s.id, type: s.type, required: s.required, delivered: s.delivered, used: s.used })),
  },
  yards,
  people,
};
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 1));
