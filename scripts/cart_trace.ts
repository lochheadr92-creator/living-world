// Where the handcart chain actually stops in an ordinary world (WS7 next transition, 2026-10-30).
// Fixed river/Normal/no-immigration current rules; 240-tick observer samples of every adult who wants a cart, holds a hammer or
// carries a cart batch plan, decomposed gate by gate: timber yard known, hammer in pack or on the rack, each cart input's shelf
// and pack stock and whether a stage-before recipe is feasible, whether a batch plan would be adopted and why not, and what the
// person was in fact doing. Activity-start hook records every yard operate and every activity of a cart-plan holder. Observer
// purity (serialized before/after each sample) and the source manifest are checked. Usage: vite-node scripts/cart_trace.ts <out> [days]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld } from '../src/app/save';
import { DAY, CART_COST } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { stageOf } from '../src/sim/people';
import { generateOptions } from '../src/sim/decision';
import { demandsOf, facilitiesOf, toolAvailable } from '../src/sim/production';
import { batchWanted } from '../src/sim/batch_plan';
import { RECIPE_BY_ID, recipesMaking } from '../src/sim/recipes';
import { techniqueBlocker } from '../src/sim/techniques';
import { hasKnownResource, freeOf } from '../src/sim/intent';
import { isRawMaterial } from '../src/sim/options_work';
import type { ItemKind, Person, Activity, Intention } from '../src/sim/types';
const [out, daysArg] = process.argv.slice(2), days = Number(daysArg ?? 45);
if (!out || existsSync(out) || !Number.isInteger(days) || days < 1 || days > 60) throw new Error('Fresh output directory and 1-60 days required');
mkdirSync(out, { recursive: true });
const paths = readdirSync('src', { recursive: true }).map(String).filter((p) => p.endsWith('.ts')).map((p) => 'src/' + p).concat(['scripts/cart_trace.ts']).sort();
const manifest = () => Object.fromEntries(paths.map((p) => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const source = manifest();
const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
writeFileSync(`${out}/provenance.json`, JSON.stringify({ head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), source, settings: w.settings, days, question: 'At which gate does an ordinary cart demand stop short of a cart? Observation only; no causal claim.' }, null, 2));
const u = (n: number | undefined) => n ?? 0;
type Sample = Record<string, unknown>;
const samples: Sample[] = [], yardOps: unknown[] = [], planEvents: unknown[] = [], holderActs: unknown[] = [], daily: unknown[] = [];
const counts = { adults: 0, cartDemand: 0, hammerInPack: 0, hammerOnRack: 0, batchWantedCart: 0, cartPlanLive: 0, blockedHandcart: 0 };
const knownPlans = new Map<number, { p: Person; i: Intention }>();
const cartPlanHolders = new Set<number>();
w.hooks = {
  onActivityStart(p: Person, a: Activity) {
    if (a.kind === 'operate' && ['build_cart', 'hew_planks', 'saw_planks', 'split_handles'].includes(String(a.data.recipe))) yardOps.push({ tick: w.tick, day: +(w.tick / DAY).toFixed(2), who: p.name, id: p.id, recipe: a.data.recipe, label: a.label, goal: a.goal, forPlan: a.data.forPlan ?? 0 });
    if (cartPlanHolders.has(p.id)) holderActs.push({ tick: w.tick, who: p.name, kind: a.kind, label: a.label, forPlan: a.data.forPlan ?? 0 });
  },
};
const yardBeliefInputs = (ctx: ReturnType<typeof generateOptions>, p: Person) => {
  const yard = facilitiesOf(ctx, 'timber_yard')[0];
  if (!yard) return { yardKnown: false };
  const r = RECIPE_BY_ID.build_cart;
  const inputs: Record<string, unknown> = {};
  for (const k of Object.keys(CART_COST) as ItemKind[]) {
    const shelf = u(yard.b.items?.[k]), pack = u(p.inv[k]), lack = u(CART_COST[k]) - shelf - pack;
    let stage: string | null = null;
    if (lack > 0 && !(isRawMaterial(k) && hasKnownResource(w, p, k))) {
      for (const sub of recipesMaking(k)) {
        if (sub.at !== r.at || techniqueBlocker(w, p, sub.id) || !toolAvailable(ctx, yard, sub)) continue;
        const ok = (Object.keys(sub.inputs) as ItemKind[]).every((kk) => u(sub.inputs[kk]) - u(yard.b.items?.[kk]) - u(p.inv[kk]) <= 0 || (isRawMaterial(kk) && hasKnownResource(w, p, kk)));
        if (ok) { stage = sub.id; break; }
        stage ??= `infeasible:${sub.id}`;
      }
    }
    inputs[k] = { need: CART_COST[k], shelf, pack, lack: Math.max(0, lack), stage };
  }
  const real = w.byId.get(yard.b.id);
  const ops = real && real.ent === 'building' ? real.ops : undefined;
  return { yardKnown: true, yardId: yard.b.id, eta: Math.round(yard.e), hammerOnRack: (yard.b.tools ?? []).includes('hammer'), realRack: real && real.ent === 'building' ? real.store.items : undefined, realJob: ops?.job ? { recipe: ops.job.recipe, client: ops.job.client, phase: ops.job.phase, progress: +ops.job.progress.toFixed(0), total: ops.job.total } : null, inputs, technique: techniqueBlocker(w, p, 'build_cart') };
};
const began = Date.now();
let stop = 'horizon', pure = true;
while (w.tick < days * DAY) {
  stepWorld(w);
  // plan lifecycle: new or ended cart batch plans
  for (const p of w.persons) for (const i of p.intentions) {
    if (i.kind !== 'batch' || i.makes !== 'cart') continue;
    const known = knownPlans.get(i.id);
    if (!known) { knownPlans.set(i.id, { p, i }); cartPlanHolders.add(p.id); planEvents.push({ tick: w.tick, day: +(w.tick / DAY).toFixed(2), who: p.name, id: p.id, event: 'adopted', planId: i.id, reason: i.reason, wants: i.wants, step: i.step, blocked: i.blocked }); }
    else if (i.status !== 'active' && !(known as { ended?: boolean }).ended) { (known as { ended?: boolean }).ended = true; planEvents.push({ tick: w.tick, day: +(w.tick / DAY).toFixed(2), who: p.name, id: p.id, event: i.status, planId: i.id, reason: i.reason, step: i.step, worked: i.worked, setAside: i.setAside }); }
  }
  if (w.tick % 240 === 0) {
    const before = serializeWorld(w);
    for (const p of w.persons) {
      if (!p.alive || stageOf(w, p) !== 'adult') continue;
      counts.adults++;
      const ctx = generateOptions(w, p, true, true);
      const demand = demandsOf(ctx).find((d) => d.item === 'cart');
      const hammerInPack = u(p.inv.hammer) > 0;
      const livePlan = p.intentions.find((i) => i.status === 'active' && i.kind === 'batch' && i.makes === 'cart');
      const blockedHandcart = ctx.blocked.filter((b) => /handcart/i.test(b.label)).map((b) => b.blocked);
      if (!demand && !hammerInPack && !livePlan) continue;
      if (demand) counts.cartDemand++;
      if (hammerInPack) counts.hammerInPack++;
      if (livePlan) counts.cartPlanLive++;
      if (blockedHandcart.length) counts.blockedHandcart++;
      const want = batchWanted(ctx);
      if (want?.item === 'cart') counts.batchWantedCart++;
      const yard = yardBeliefInputs(ctx, p);
      if ((yard as { hammerOnRack?: boolean }).hammerOnRack) counts.hammerOnRack++;
      const live = p.intentions.filter((i) => i.status === 'active').map((i) => `${i.kind}:${i.makes || i.goal.slice(0, 30)}`);
      const lastBatch = [...p.intentions].reverse().find((i) => i.kind === 'batch');
      const cooldown = !!lastBatch && w.tick - (lastBatch.status === 'active' ? lastBatch.since : lastBatch.ended || lastBatch.since) < DAY;
      const cartOpts = ctx.options.filter((o) => /build_cart|hew_planks|saw_planks|split_handles|craft:|request:tool|hammer/.test(o.key + ' ' + o.label + ' ' + o.goal)).map((o) => ({ key: o.key, util: +o.util.toFixed(1), label: o.label }));
      const seenHammer = ctx.seenPersons.filter((s) => s.carrying.includes('hammer')).map((s) => ({ id: s.id, d: +Math.hypot(s.x - p.x, s.y - p.y).toFixed(1), trust: p.relations[s.id]?.trust ?? 10, aff: p.relations[s.id]?.affinity ?? 0 }));
      const hhHammer = w.persons.filter((q) => q.alive && q.hhId === p.hhId && q.id !== p.id && u(q.inv.hammer) > 0).map((q) => q.name);
      const toolWanted = ctx.toolWanted ?? null, free = { wood: freeOf(p, 'wood'), stone: freeOf(p, 'stone') };
      const top = [...ctx.options].sort((a, b) => b.util - a.util).slice(0, 3).map((o) => ({ key: o.key, util: +o.util.toFixed(1) }));
      samples.push({ tick: w.tick, day: +(w.tick / DAY).toFixed(2), who: p.name, id: p.id, demand: demand ? { why: demand.why, base: +demand.base.toFixed(1) } : null, hammerInPack, batchWanted: want ? { item: want.item, wants: want.wants } : null, livePlan: livePlan ? { id: livePlan.id, step: livePlan.step, stepKind: livePlan.stepKind, blocked: livePlan.blocked, wants: livePlan.wants, since: livePlan.since, until: livePlan.until } : null, blockedHandcart, live, cooldown, criticals: ctx.criticals, dangers: ctx.dangers.length, yard, doing: p.activity ? { kind: p.activity.kind, label: p.activity.label, forPlan: p.activity.data.forPlan ?? 0 } : null, cartOpts, seenHammer, hhHammer, toolWanted, free, top, inv: { wood: u(p.inv.wood), planks: u(p.inv.planks), handles: u(p.inv.handles), hammer: u(p.inv.hammer), axe: u(p.inv.axe), saw: u(p.inv.saw) } });
    }
    pure &&= serializeWorld(w) === before;
    if (!pure) throw new Error('Observer mutated state');
  }
  if (w.tick % DAY === 0) {
    const yards = w.buildings.filter((b) => b.type === 'timber_yard').map((b) => ({ id: b.id, items: b.store.items, job: b.ops?.job ? { recipe: b.ops.job.recipe, client: b.ops.job.client, phase: b.ops.job.phase } : null, produced: b.ops?.produced }));
    daily.push({ day: w.tick / DAY, alive: w.persons.filter((p) => p.alive).length, carts: w.carts.length, hammers: w.persons.filter((p) => p.alive && u(p.inv.hammer) > 0).map((p) => p.name), yards });
  }
  if (w.tick % 2400 === 0 && Date.now() - began > 420000) { stop = 'budget'; break; }
}
if (JSON.stringify(source) !== JSON.stringify(manifest())) throw new Error('Source changed during run');
const report = { rules: w.settings.rulesVersion, seed: 'river', days, tick: w.tick, stop, seconds: (Date.now() - began) / 1000, pure, conservation: conservationReport(w), counts, carts: w.carts.length, craftedHammers: w.ledger.reasons['+crafted: hammer'] ?? 0, planEvents, yardOps, holderActs: holderActs.length, daily };
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${out}/samples.json`, JSON.stringify(samples));
writeFileSync(`${out}/holder_acts.json`, JSON.stringify(holderActs));
writeFileSync(`${out}/final.json`, serializeWorld(w));
console.log(JSON.stringify({ ...report, planEvents: planEvents.length, yardOps: yardOps.length, daily: daily.length }));
if (stop !== 'horizon' || !report.conservation.ok) process.exitCode = 1;
