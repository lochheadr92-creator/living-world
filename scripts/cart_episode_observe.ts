// Where the cart chain stops in an ordinary world: every 240-tick sample of an adult who wants a cart is traced through the
// planner (hammer in hand or on the rack, the batch planner's answer and, when it is null, the first gate that refused it, the
// project slot and cooldown, the options and blockers about the cart and its components, the top-ranked option) and every
// cart or handle batch started at the yard is counted. Observer purity is checked at every sample; no state is changed.
// Usage: vite-node scripts/cart_episode_observe.ts <out> [meadow|river|forest] [days] [rulesVersion|current] [arm]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { stageOf } from '../src/sim/people';
import { generateOptions } from '../src/sim/decision';
import { demandsOf, facilitiesOf, toolAvailable } from '../src/sim/production';
import { batchWanted, BATCH_MIN_BASE } from '../src/sim/batch_plan';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { techniqueBlocker } from '../src/sim/techniques';
import { hasKnownResource } from '../src/sim/intent';
import type { Ctx } from '../src/sim/optutil';
import { parseIntervention } from './lab/lab';
import {gitProvenance,sourceManifest} from './observers/provenance';

const [out, seedArg, daysArg, versionArg, armArg] = process.argv.slice(2);
const version = versionArg && versionArg !== 'current' ? Number(versionArg) : undefined;
const arm = armArg ?? '';
const seed = seedArg ?? 'river';
const days = Number(daysArg ?? 45);
if (!out || existsSync(out) || !['meadow', 'river', 'forest'].includes(seed) || !Number.isInteger(days) || days < 1 || days > 60) throw new Error('Fresh output, registered seed and 1-60 days required');
if (arm) parseIntervention(arm).install!();
mkdirSync(out, { recursive: true });
const paths = readdirSync('src', { recursive: true }).map(String).filter((p) => p.endsWith('.ts')).map((p) => 'src/' + p).concat(['scripts/cart_episode_observe.ts']).sort();
const manifest = () => sourceManifest(paths);
const source = manifest();
const w = createWorld({ ...currentWorldSettings('normal', seed as 'river', { immigration: false }), ...(version ? { rulesVersion: version } : {}) });
writeFileSync(`${out}/provenance.json`, JSON.stringify({ ...gitProvenance(), source, settings: w.settings, days, arm: arm || 'current', budgetSeconds: 400, observer: '240-tick samples of adults wanting a cart, traced through the batch planner; activity-start hook for yard batches' }, null, 2));

const unitsOf = (n: number | undefined): number => n ?? 0;
const cartish = /handcart|handles|planks|timber yard/i;
/** The first gate of batchWanted that refuses the cart, mirrored read-only. */
function whyNoCartBatch(ctx: Ctx): string {
  const { world, p } = ctx;
  const d = demandsOf(ctx).find((x) => x.item === 'cart');
  if (!d) return 'no cart demand';
  if (d.base < BATCH_MIN_BASE) return `base ${d.base.toFixed(1)} below ${BATCH_MIN_BASE}`;
  const r = RECIPE_BY_ID.build_cart;
  const fac = facilitiesOf(ctx, 'timber_yard')[0];
  if (!fac) return 'no known timber yard';
  if (techniqueBlocker(world, p, r.id)) return 'technique';
  if (!toolAvailable(ctx, fac, r)) return 'no hammer (hand or rack)';
  const lacking: string[] = [];
  for (const k of ['planks', 'handles', 'wood'] as const) {
    const lack = unitsOf(r.inputs[k]) - unitsOf(fac.b.items?.[k]) - unitsOf(p.inv[k]);
    if (lack <= 0) continue;
    if (k === 'wood' && !hasKnownResource(world, p, 'wood')) lacking.push('wood: no known source');
    if (k !== 'wood' && !hasKnownResource(world, p, 'wood')) lacking.push(`${k}: no wood source for the stage before`);
  }
  if (lacking.length) return lacking.join('; ');
  const higher = demandsOf(ctx).filter((x) => x.base > d.base && x.item !== 'cart').map((x) => `${x.item}@${x.base.toFixed(1)}`);
  if (higher.length) return `a higher-base batch want comes first: ${higher.join(', ')}`;
  return 'none (batchWanted should return the cart)';
}

const rows: unknown[] = [];
const yardStarts: Record<string, number> = {};
const cartPlans = new Set<number>();
const cartPlanRows: unknown[] = [];
const counts = { adultSamples: 0, cartDemand: 0, cartDemandWithHammer: 0, cartDemandNoHammer: 0, batchWantsCart: 0 };
const cartsBuilt: { day: number; ownerHh: number }[] = [];
let cartsSeen = 0;
const noBatchReasons: Record<string, number> = {};
const slotReasons: Record<string, number> = {};
w.hooks = {
  onActivityStart(p, a) {
    const r = a.data.recipe as string | undefined;
    if (a.kind === 'operate' && r && ['build_cart', 'split_handles', 'hew_planks', 'saw_planks'].includes(r)) yardStarts[`${r}${a.data.purpose && /cart/i.test(String(a.data.purpose)) ? ' (for the cart)' : ''}`] = (yardStarts[`${r}${a.data.purpose && /cart/i.test(String(a.data.purpose)) ? ' (for the cart)' : ''}`] ?? 0) + 1;
  },
};
const began = Date.now();
let stop = 'horizon';
while (w.tick < days * DAY) {
  stepWorld(w);
  if (w.carts.length > cartsSeen) {
    for (const c of w.carts.slice(cartsSeen)) cartsBuilt.push({ day: Math.round((w.tick / DAY) * 10) / 10, ownerHh: c.ownerHh });
    cartsSeen = w.carts.length;
  }
  if (w.tick % 240 === 0) {
    const before = serializeWorld(w);
    for (const p of w.persons) {
      if (!p.alive || stageOf(w, p) !== 'adult') continue;
      counts.adultSamples++;
      for (const i of p.intentions) {
        if (i.makes === 'cart' && !cartPlans.has(i.id)) {
          cartPlans.add(i.id);
          cartPlanRows.push({ tick: w.tick, name: p.name, id: i.id, since: i.since, status: i.status, step: i.step, reason: i.reason });
        }
      }
      const ctx = generateOptions(w, p, true, true);
      const demands = demandsOf(ctx);
      const cart = demands.find((d) => d.item === 'cart');
      if (!cart) continue;
      counts.cartDemand++;
      const hammer = unitsOf(p.inv.hammer) > 0;
      if (hammer) counts.cartDemandWithHammer++;
      else counts.cartDemandNoHammer++;
      const bw = batchWanted(ctx);
      if (bw?.item === 'cart') counts.batchWantsCart++;
      const why = bw?.item === 'cart' ? 'batch wants the cart' : bw ? `batch wants ${bw.item} instead` : whyNoCartBatch(ctx);
      noBatchReasons[why] = (noBatchReasons[why] ?? 0) + 1;
      const live = p.intentions.filter((i) => i.status === 'active');
      const lastBatch = [...p.intentions].reverse().find((i) => i.kind === 'batch');
      const cooldown = !!lastBatch && w.tick - (lastBatch.status === 'active' ? lastBatch.since : lastBatch.ended || lastBatch.since) < DAY;
      const slot = ctx.criticals.length || ctx.dangers.length ? 'critical need or danger' : live.some((i) => i.kind !== 'night' && i.kind !== 'batch') ? `slot held by ${live.filter((i) => i.kind !== 'night').map((i) => `${i.kind}:${i.makes || i.step}`).join(', ')}` : live.some((i) => i.kind === 'batch') ? `another batch: ${live.find((i) => i.kind === 'batch')!.makes}` : cooldown ? 'batch cooldown (one a day)' : 'free';
      slotReasons[slot] = (slotReasons[slot] ?? 0) + 1;
      const yard = facilitiesOf(ctx, 'timber_yard')[0];
      rows.push({
        tick: w.tick,
        day: Math.round((w.tick / DAY) * 10) / 10,
        name: p.name,
        hammer,
        rackHammer: !!yard?.b.tools?.includes('hammer'),
        build: Math.round(p.skills.build * 100) / 100,
        ground: cart.why,
        base: Math.round(cart.base * 10) / 10,
        batch: bw ? `${bw.item}/${bw.recipe}` : null,
        noCartBatchBecause: why,
        slot,
        yardShelf: yard?.b.items ?? null,
        offers: ctx.options.filter((o) => cartish.test(o.label) || cartish.test(o.goal)).map((o) => `${o.key} ${o.label} [${o.util.toFixed(1)}]`),
        blocked: ctx.blocked.filter((o) => cartish.test(o.label) || cartish.test(o.goal)).map((o) => `${o.label}: ${o.blocked}`),
        top: [...ctx.options].sort((a, b) => b.util - a.util).slice(0, 2).map((o) => `${o.key} [${o.util.toFixed(1)}]`),
        activity: p.activity ? `${p.activity.kind}: ${p.activity.label}` : null,
      });
    }
    if (serializeWorld(w) !== before) throw new Error('Observer mutated state');
  }
  if (w.tick % DAY === 0 && !conservationReport(w).ok) {
    stop = 'invariant';
    break;
  }
  if (w.tick % 2400 === 0 && Date.now() - began > 400000) {
    stop = 'budget';
    break;
  }
}
if (JSON.stringify(source) !== JSON.stringify(manifest())) throw new Error('Source changed during run');
const report = {
  seed,
  days,
  arm: arm || 'current',
  rules: w.settings.rulesVersion,
  tick: w.tick,
  stop,
  seconds: (Date.now() - began) / 1000,
  alive: w.persons.filter((p) => p.alive).length,
  counts,
  noCartBatchBecause: noBatchReasons,
  projectSlotWhenWanting: slotReasons,
  yardStarts,
  cartPlans: cartPlanRows.map((r) => { const row = r as { name: string; id: number }; const p = w.persons.find((q) => q.name === row.name); const i = p?.intentions.find((x) => x.id === row.id); return { ...row, finalStatus: i?.status, finalReason: i?.reason, lastStep: i?.step }; }),
  cartsBuilt,
  carts: w.carts.length,
  craftedHammers: w.ledger.reasons['+crafted: hammer'] ?? 0,
  hash: hashWorld(w),
  conservation: conservationReport(w),
};
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${out}/samples.json`, JSON.stringify(rows, null, 1));
console.log(JSON.stringify({ ...report, cartPlans: cartPlanRows.length }, null, 1));
if (stop !== 'horizon') process.exitCode = 1;
