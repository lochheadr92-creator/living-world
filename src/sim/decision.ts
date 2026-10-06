import { endActivity, startActivity } from './activities';
import { MIN_COMMIT, REVIEW_EVERY, SWITCH_MARGIN } from './constants';
import { noteFailure, countBeliefs } from './knowledge';
import { hashUnit } from './rng';
import { fleeRadius, makeCtx } from './optutil';
import { probe } from './probe';
import type { Ctx, Option } from './optutil';
import { socialOptions } from './options_social';
import { survivalOptions } from './options_survival';
import { workOptions } from './options_work';
import { productionOptions } from './production';
import { applyReliefGuard } from './relief';
import { markSetAside } from './social';
import type { Activity, ActivityKind, NeedKey, OptionSummary, Person, World } from './types';

/** which shortage kills fastest: water, then food, then cold, then danger, then exhaustion */
const CRITICAL_ORDER: NeedKey[] = ['thirst', 'hunger', 'warmth', 'safety', 'energy'];

const CHILD_FORBIDDEN: ActivityKind[] = ['build', 'haul', 'plan_site', 'repair', 'craft', 'till', 'plant', 'tend', 'harvest', 'claim_home', 'fuel_fire', 'withdraw', 'operate', 'tool_work', 'cart_haul'];

/** world state -> local perception (already done) -> eligible actions. Pure with respect to the world: nothing is started here. */
export function generateOptions(world: World, p: Person, collect = false): Ctx {
  const ctx = makeCtx(world, p, collect);
  survivalOptions(ctx);
  workOptions(ctx);
  productionOptions(ctx);
  socialOptions(ctx);
  if (probe.on) {
    probe.generations++;
    probe.optionsGenerated += ctx.options.length;
  }
  return ctx;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return h;
}

export function summarize(o: Option): OptionSummary {
  return { kind: o.kind, label: o.label, utility: Math.round(o.util * 10) / 10, parts: o.parts, blocked: o.blocked };
}

/** Candidate options in preference order, after the hard filters (children's limits, critical needs). */
export function rankOptions(ctx: Ctx): Option[] {
  const { world, p } = ctx;
  let opts = ctx.options.filter((o) => o.util > 0 && o.make);
  if (ctx.stage === 'child') opts = opts.filter((o) => !CHILD_FORBIDDEN.includes(o.kind) && o.tag !== 'site' && o.tag !== 'build' && o.tag !== 'farm');
  // work that would strand someone away from water or food is not taken on (see relief.ts)
  opts = applyReliefGuard(ctx, opts);
  if (ctx.criticals.length) {
    // the most lethal shortage comes first: water, then food, then warmth; exhaustion alone never outranks them
    const lead = CRITICAL_ORDER.find((k) => ctx.criticals.includes(k)) ?? ctx.criticals[0];
    const crit = opts.filter((o) => o.need === lead || o.kind === 'flee' || (o.kind === 'socialize' && (o.tag === 'request' || o.tag === 'info')));
    if (crit.length) opts = crit;
  }
  // the pressure of a wolf nearby outranks everything else
  const flee = opts.filter((o) => o.kind === 'flee');
  if (flee.length) opts = flee;
  // do not repeat something that has just fallen through
  const fresh = opts.filter((o) => (p.cooldowns['opt:' + o.key] ?? 0) <= world.tick);
  if (fresh.length) opts = fresh;
  const scored = opts.map((o) => ({ o, s: o.util + hashUnit(p.id, world.tick >> 5, hashKey(o.key)) * 1.4 }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.o);
}

function because(o: Option): string {
  if (!o.parts.length) return o.goal;
  const top = [...o.parts].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
  return top.map(([n, v]) => `${n} ${v > 0 ? '+' : '−'}${Math.abs(Math.round(v))}`).join(' · ');
}

function record(world: World, p: Person, ctx: Ctx, ranked: Option[], chosen: Option | null, trigger: string): void {
  const alts = ranked.filter((o) => o !== chosen).slice(0, 4).map(summarize);
  const blockedRaw = ctx.blocked.slice(0, 40);
  p.lastDecision = {
    tick: world.tick,
    trigger,
    chosen: chosen ? summarize(chosen) : null,
    alternatives: alts,
    blocked: blockedRaw.slice(0, 6).map(summarize),
    considered: ctx.options.length,
    knownPlaces: countBeliefs(p),
    seenNow: p.seen.length,
    because: chosen ? because(chosen) : 'nothing to do',
  };
}

function launch(world: World, p: Person, ctx: Ctx, trigger: string): boolean {
  const ranked = rankOptions(ctx);
  for (let i = 0; i < Math.min(ranked.length, 5); i++) {
    const o = ranked[i];
    const act = o.make!();
    if (!act) {
      // could not even set it up (no standing spot…): remember, so we do not retry it at once
      if (o.targetId) noteFailure(world, p, o.targetId, 'could not get a foothold there');
      continue;
    }
    act.data.optKey = o.key;
    act.data.why = because(o);
    record(world, p, ctx, ranked, o, trigger);
    startActivity(world, p, act);
    return true;
  }
  record(world, p, ctx, ranked, null, trigger);
  return false;
}

/** Choose what to do when free. */
export function decide(world: World, p: Person, trigger: string): void {
  if (probe.on) probe.decisions++;
  const ctx = generateOptions(world, p, true);
  if (!launch(world, p, ctx, trigger)) {
    p.nextThink = world.tick + 15;
  }
}

function currentUtility(ctx: Ctx, a: Activity): number {
  const key = a.data.optKey as string | undefined;
  if (!key) return a.utility;
  const o = ctx.options.find((x) => x.key === key);
  if (!o) return 0;
  // finishing what is already underway counts for something
  const frac = a.duration > 0 ? Math.min(1, a.progress / a.duration) : 0;
  return o.util * (1.08 + 0.35 * frac);
}

/**
 * While busy, look again now and then. Commitment is bounded:
 * a switch needs a clearly better option once the minimum commitment has passed,
 * but danger and critical needs interrupt at once.
 */
export function reviewActivity(world: World, p: Person): void {
  const a = p.activity;
  if (!a) return;
  if (a.kind === 'converse' || a.kind === 'argue') {
    p.nextThink = world.tick + REVIEW_EVERY;
    return;
  }
  if (probe.on) probe.reviews++;
  const ctx = generateOptions(world, p, false);
  const ranked = rankOptions(ctx);
  const best = ranked[0];
  p.nextThink = world.tick + REVIEW_EVERY + Math.floor(hashUnit(p.id, world.tick, 5) * 20);
  if (!best) return;
  const key = a.data.optKey as string | undefined;
  if (best.key === key) return;
  const danger = best.kind === 'flee' && a.kind !== 'flee';
  // an activity serving one critical need still yields to a deadlier one (water before food before warmth before sleep)
  const rank = (k: NeedKey | null): number => (k === null ? 9 : CRITICAL_ORDER.indexOf(k) < 0 ? 9 : CRITICAL_ORDER.indexOf(k));
  const criticalMismatch = ctx.criticals.length > 0 && best.need !== null && ctx.criticals.includes(best.need) && a.need !== best.need && (a.need === null || !ctx.criticals.includes(a.need) || rank(best.need) < rank(a.need));
  if (a.kind === 'sleep' && !danger && !criticalMismatch) return; // sleep has its own wake-up rules
  // a job in several legs (loading a cart, going to a meal that has been agreed) does not stop being the plan just because the
  // option that started it no longer shows up: only danger or a deadly need ends it before it is done
  if (a.data.sticky && !danger && !criticalMismatch) return;
  // a drink or a meal under way is finished while it is still doing the person good — unless danger or a deadlier need says otherwise
  if (!danger && !criticalMismatch && (a.kind === 'drink' || a.kind === 'eat' || a.kind === 'eat_store') && a.phase === 'work' && a.need && p.needs[a.need] < 86 && a.progress > 0) return;
  const cur = currentUtility(ctx, a);
  const committed = world.tick < a.minCommit;
  const better = best.util > cur * SWITCH_MARGIN + 3;
  if (danger || criticalMismatch || (!committed && better)) {
    const act = best.make!();
    if (!act) return;
    const why = danger ? 'danger nearby' : criticalMismatch ? `a more urgent need (${ctx.critical})` : 'something better came up';
    act.data.optKey = best.key;
    act.data.why = because(best);
    record(world, p, ctx, ranked, best, danger ? 'danger' : criticalMismatch ? 'urgent need' : 'review');
    if (danger || criticalMismatch) markSetAside(world, p);
    // being driven off from a place is remembered, so the same trip is not repeated at once
    if (danger && a.targetId && (a.kind === 'drink' || a.kind === 'gather' || a.kind === 'fetch_water')) noteFailure(world, p, a.targetId, 'a wolf came too close');
    endActivity(world, p, 'interrupted', why);
    startActivity(world, p, act);
  }
}

/** Cheap per-tick tests that should force an immediate re-think. */
export function urgentInterrupt(world: World, p: Person): boolean {
  const a = p.activity;
  if (!a || a.kind === 'flee') return false;
  const alarm = Math.min(9.5, fleeRadius(p));
  for (const s of p.seen) {
    if (s.ent === 'animal' && Math.hypot(s.x - p.x, s.y - p.y) < alarm && world.tick - (p.cooldowns.fleeCheck ?? -99) > 8) {
      p.cooldowns.fleeCheck = world.tick;
      return true;
    }
  }
  const n = p.needs;
  if ((n.thirst < 13 && a.need !== 'thirst') || (n.hunger < 13 && a.need !== 'hunger')) {
    if (world.tick - (p.cooldowns.critCheck ?? -99) > 25) {
      p.cooldowns.critCheck = world.tick;
      return true;
    }
  }
  return false;
}

void MIN_COMMIT;
