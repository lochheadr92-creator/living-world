import { relocationOptions } from './relocation';
import { whileObserving } from './lifechanges';
import { endActivity, startActivity } from './activities';
import { EXTERNAL_RETRIES, externalController } from './external';
import { NUDGE_FOR_PLAN, intentFor, planReason, reviewIntentions } from './intent';
import { unfitPerson } from './defence';
import type { ExternalController } from './external';
import { moodWeight } from './mood';
import { tiltWorkChoices } from './temperament';
import { goalNudge } from './life';
import { crewNudge } from './crews';
import { isThreat } from './wildlife';
import { MIN_COMMIT, REVIEW_EVERY, SWITCH_MARGIN } from './constants';
import { noteFailure, countBeliefs } from './knowledge';
import { hashUnit } from './rng';
import { fleeRadius, makeCtx } from './optutil';
import { explainsHousing } from './shelter';
import { indoorHome } from './habitation';
import { probe, probeWander } from './probe';
import type { Ctx, Option } from './optutil';
import { socialOptions } from './options_social';
import { survivalOptions } from './options_survival';
import { workOptions } from './options_work';
import { productionOptions } from './production';
import { applyReliefGuard } from './relief';
import { markSetAside } from './social';
import { reviewTrade, tradeNudge, tradeReason } from './trade';
import { noteTechniqueWant } from './techniques';
import { pruneCustomers } from './customers';
import type { Activity, ActivityKind, Intention, NeedKey, OptionSummary, Person, World } from './types';

import { hyp } from './util';
/** which shortage kills fastest: water, then food, then cold, then danger, then exhaustion */
const CRITICAL_ORDER: NeedKey[] = ['thirst', 'hunger', 'warmth', 'safety', 'energy'];

const CHILD_FORBIDDEN: ActivityKind[] = ['build', 'haul', 'plan_site', 'repair', 'craft', 'till', 'plant', 'tend', 'harvest', 'claim_home', 'fuel_fire', 'withdraw', 'operate', 'tool_work', 'cart_haul', 'defend'];

/**
 * world state -> local perception (already done) -> eligible actions. Nothing is started here.
 * `collect` also records the options that were ruled out and why (a person deciding for themselves does this, so that the card can
 * say what they passed over). `observer` is for the inspector alone, asking what someone could do: it must leave no trace, so the few
 * things the planner notes as it goes (a promise held up, a request already considered, a worry) are not noted.
 */
export function generateOptions(world: World, p: Person, collect = false, observer = false): Ctx {
  // All observer entry points need the same guard, including callers outside the inspector.
  return observer ? whileObserving(() => collectOptions(world, p, collect, true)) : collectOptions(world, p, collect, false);
}

function collectOptions(world: World, p: Person, collect: boolean, observer: boolean): Ctx {
  const ctx = makeCtx(world, p, collect, observer);
  survivalOptions(ctx);
  workOptions(ctx);
  productionOptions(ctx);
  socialOptions(ctx);
  relocationOptions(ctx);
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

/**
 * How the final ranking is made. 'utility' is the simulation. 'random' is an experiment, not a feature: every option that survives the
 * hard filters (children's limits, the relief guard, critical needs, fleeing) is ranked by a hash of the person, the time and the
 * option instead of by its utility, so what a person does among the things they may do is a coin toss. It exists to ask whether
 * agents' choices matter at all (docs/SCALING.md). Kept beside the world, not in it: not saved, not hashed, off unless asked for.
 */
export type OptionChooser = 'utility' | 'random';
let chooser: OptionChooser = 'utility';
export function setOptionChooser(mode: OptionChooser): void {
  chooser = mode;
}

/** Candidate options in preference order, after the hard filters (children's limits, critical needs). */
export function rankOptions(ctx: Ctx): Option[] {
  const { world, p } = ctx;
  // A plan's own next step stays a candidate even when it scores poorly. Scoring low means "not worth much just now", which is not
  // the same thing as being impossible, and dropping it here is what made a plan impossible to carry across several activities.
  // Every hard filter below (children, the relief guard, critical needs, fleeing, cooldowns) still applies to it.
  let opts = ctx.options.filter((o) => o.make && (o.util > 0 || intentFor(p, o) !== null));
  if (ctx.stage === 'child') opts = opts.filter((o) => !CHILD_FORBIDDEN.includes(o.kind) && o.tag !== 'site' && o.tag !== 'build' && o.tag !== 'farm');
  // work that would strand someone away from water or food is not taken on (see relief.ts)
  opts = applyReliefGuard(ctx, opts);
  if (ctx.criticals.length) {
    // the most lethal shortage comes first: water, then food, then warmth; exhaustion alone never outranks them
    const lead = CRITICAL_ORDER.find((k) => ctx.criticals.includes(k)) ?? ctx.criticals[0];
    const crit = opts.filter((o) => o.need === lead || o.kind === 'flee' || (o.kind === 'socialize' && (o.tag === 'request' || o.tag === 'info')));
    if (crit.length) opts = crit;
  }
  // The pressure of a wolf nearby outranks other work: flight and active defence are both responses.
  const flee = opts.filter((o) => o.kind === 'flee' || o.kind === 'defend');
  if (flee.length) opts = flee;
  // do not repeat something that has just fallen through
  const fresh = opts.filter((o) => (p.cooldowns['opt:' + o.key] ?? 0) <= world.tick);
  if (fresh.length) opts = fresh;
  const moody = p.mood !== undefined && world.settings.dynamics === 'rich';
  // the plan's nudge is bounded and never applies when the lab is choosing at random
  const scored = opts.map((o) => ({
    o,
    // the plan's nudge and the trade's are both bounded and both off when the lab is choosing at random
    s: chooser === 'random' ? hashUnit(p.id, world.tick >> 5, hashKey(o.key) ^ 0x5bd1e995) : (moody ? o.util * moodWeight(p, o.kind) : o.util) + (intentFor(p, o) ? NUDGE_FOR_PLAN : 0) + tradeNudge(world, p, o) + goalNudge(world, p, o) + crewNudge(world, p, o) + hashUnit(p.id, world.tick >> 5, hashKey(o.key)) * 1.4,
  }));
  if (chooser !== 'random') tiltWorkChoices(world, p, scored);
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.o);
}

/**
 * What was weighed in making this choice. When the choice is a step of the person's own plan the plan is named first, because that
 * is the honest account of why this option beat a better-scoring one: it says which plan and which step, and nothing about whether
 * the step will come to anything.
 */
function because(o: Option, plan: Intention | null = null, trade = ''): string {
  const forPlan = planReason(plan, o);
  const lead = [forPlan, trade, o.workTasteReason, o.selectionReason].filter(Boolean).join(' · ');
  if (!o.parts.length) return lead ? `${lead} · ${o.goal}` : o.goal;
  const top = [...o.parts].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
  const parts = top.map(([n, v]) => `${n} ${v > 0 ? '+' : '−'}${Math.abs(Math.round(v))}`).join(' · ');
  return lead ? `${lead} · ${parts}` : parts;
}

function record(world: World, p: Person, ctx: Ctx, ranked: Option[], chosen: Option | null, trigger: string, why?: string): void {
  const alts = ranked.filter((o) => o !== chosen).slice(0, 4).map(summarize);
  // The record keeps only the first six blocked options, and the housing question lands late in a long list because
  // `optPlanBuild` runs near the end. "Why is this household not building?" is the one a viewer most often wants, so from
  // rules version 7 it is moved to the front of the recorded list. Gated on the version (`explainsHousing`): a world below
  // it records exactly the list, in exactly the order, that it always did.
  const housing = (o: Option): boolean => o.kind === 'plan_site' && o.targetId === 0;
  const blockedRaw = explainsHousing(world) ? [...ctx.blocked.filter(housing), ...ctx.blocked.filter((o) => !housing(o))].slice(0, 40) : ctx.blocked.slice(0, 40);
  p.lastDecision = {
    tick: world.tick,
    trigger,
    chosen: chosen ? summarize(chosen) : null,
    alternatives: alts,
    blocked: blockedRaw.slice(0, 6).map(summarize),
    considered: ctx.options.length,
    knownPlaces: countBeliefs(p),
    seenNow: p.seen.length,
    because: why ?? (chosen ? because(chosen, null, tradeReason(world, p, chosen)) : 'nothing to do'),
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
    const plan = intentFor(p, o);
    const why = because(o, plan, tradeReason(world, p, o));
    act.data.why = why;
    // this activity IS the plan's current step, so the inspector can tell a step under way from a step merely settled on
    if (plan) act.data.forPlan = plan.id;
    if (probe.on && o.kind === 'wander') whyWander(ctx, ranked, i);
    record(world, p, ctx, ranked, o, trigger, why);
    startActivity(world, p, act);
    return true;
  }
  record(world, p, ctx, ranked, null, trigger);
  return false;
}

/** work counters only: why was wander the choice? (see probe.ts) */
function whyWander(ctx: Ctx, ranked: Option[], at: number): void {
  const who = ctx.stage === 'child' ? 'child ' : 'adult ';
  const others = ctx.options.filter((o) => o.kind !== 'wander');
  const usable = others.filter((o) => o.util > 0 && o.make);
  if (at > 0) probeWander(who + 'made-failed:' + ranked[0].kind);
  else if (others.length === 0) probeWander(who + 'only-idle');
  else if (usable.length === 0) probeWander(who + 'unusable');
  else if (ranked.length === 1) {
    // usable options were all removed by rankOptions: a child's limits, then what the relief guard and a critical need leave
    const forChild = ctx.stage === 'child' ? usable.filter((o) => !CHILD_FORBIDDEN.includes(o.kind) && o.tag !== 'site' && o.tag !== 'build' && o.tag !== 'farm') : usable;
    probeWander(who + (forChild.length === 0 ? 'filtered:child-limits' : ctx.criticals.length ? 'filtered:critical-need' : 'filtered:relief-guard'));
  } else probeWander(who + 'outscored:' + ranked[1].kind);
  // what the options set aside said, once per decision (only collected for a free person's decision)
  for (const b of ctx.blocked) probeWander('  blocked: ' + b.kind + ' — ' + (b.blocked ?? '').replace(/[0-9.]+/g, '#').slice(0, 60));
}

/** Choose what to do when free. */
export function decide(world: World, p: Person, trigger: string): void {
  if (probe.on) probe.decisions++;
  // rules 51 (customers.ts): lapsed customer leads are marked here, by the decision, so that option generation stays pure for observers
  pruneCustomers(world, p);
  const ctx = generateOptions(world, p, true);
  // a private plan is taken up, carried on, set aside, finished or given up here, before anything is ranked (rich worlds only)
  reviewIntentions(ctx);
  // and a trade is taken up, kept, changed or given up, from their own skills and what they can see others doing (rich only)
  reviewTrade(ctx);
  // rules 52 (techniques.ts): when a procedure first stands in the way of wanted work, the decision notes it; the trial reads the age
  noteTechniqueWant(world, p, ctx.techniqueWanted?.kind);
  const ext = externalController();
  if (ext !== null && ext.controls(world, p)) {
    externalDecide(world, p, ctx, trigger, ext);
    return;
  }
  if (!launch(world, p, ctx, trigger)) {
    p.nextThink = world.tick + 15;
  }
}

/**
/**
 * Check the limits a controller asked for against what the option declared. Returns the accepted limits, or the reason it cannot be
 * used. A limit that is not declared, not a number, or outside the declared range is refused outright: an invalid parameterised
 * request is never quietly turned into a different valid action.
 */
function checkLimits(o: Option, want: Record<string, number> | undefined): { ok: true; limit: Record<string, number> | null } | { ok: false; why: string } {
  if (!want || Object.keys(want).length === 0) return { ok: true, limit: null };
  const declared = o.bounds ?? [];
  if (!declared.length) return { ok: false, why: `“${o.key}” takes no limits` };
  const limit: Record<string, number> = {};
  for (const field of Object.keys(want)) {
    const b = declared.find((d) => d.field === field);
    if (!b) return { ok: false, why: `“${o.key}” has no limit called “${field}” (it takes ${declared.map((d) => d.field).join(', ')})` };
    const v = want[field];
    if (typeof v !== 'number' || !Number.isFinite(v)) return { ok: false, why: `“${field}” must be a number` };
    if (b.kind === 'count' && !Number.isInteger(v)) return { ok: false, why: `“${field}” must be a whole number` };
    if (v < b.min || v > b.max) return { ok: false, why: `“${field}” must be between ${b.min} and ${b.max} (asked for ${v})` };
    limit[field] = v;
  }
  return { ok: true, limit };
}

/**
 * A person driven from outside (external.ts). The controller may only name one of the options the engine offers, after every hard
 * filter; the engine sets the activity up and runs it as for anyone. No answer yet: stand for one tick and ask again. A key that is not
 * on offer, or an option that cannot be set up, is refused and the controller is asked again (a bounded number of times); then, or on
 * 'fallback', the engine chooses as it would for anyone and says so.
 */
function externalDecide(world: World, p: Person, ctx: Ctx, trigger: string, ext: ExternalController): void {
  const ranked = rankOptions(ctx);
  let reason = '';
  for (let attempt = 0; attempt <= EXTERNAL_RETRIES; attempt++) {
    const choice = ext.choose(world, p, ctx, ranked, trigger);
    if (choice.kind === 'defer') {
      p.nextThink = world.tick + 1;
      p.pose = 'stand';
      return;
    }
    if (choice.kind === 'fallback') {
      reason = choice.reason;
      break;
    }
    // New controllers identify a particular offered alternative; legacy inputs
    // retain their recorded first-key-match interpretation.
    const indexed = choice.offerIndex === undefined ? undefined : ranked[choice.offerIndex];
    const o = choice.offerIndex === undefined ? ranked.find(x=>x.key===choice.key)
      : Number.isInteger(choice.offerIndex) && indexed?.key === choice.key ? indexed : undefined;
    if (!o) {
      reason = `“${choice.key}” is not on offer now`;
      ext.notify?.(world, p, { kind: 'rejected', key: choice.key, reason });
      continue;
    }
    // the limits are checked before anything is built, so a bad parameter costs nothing and starts nothing
    const lim = checkLimits(o, choice.limit);
    if (!lim.ok) {
      reason = lim.why;
      ext.notify?.(world, p, { kind: 'rejected', key: choice.key, reason });
      continue;
    }
    const act = o.make!();
    if (!act) {
      if (o.targetId) noteFailure(world, p, o.targetId, 'could not get a foothold there');
      reason = 'could not get a foothold there';
      ext.notify?.(world, p, { kind: 'rejected', key: choice.key, reason });
      continue;
    }
    act.data.optKey = o.key;
    const plan = intentFor(p, o);
    act.data.why = plan ? `chosen from outside, and a step toward “${plan.goal}”` : 'chosen from outside';
    if (plan) act.data.forPlan = plan.id;
    if (lim.limit) {
      act.data.limit = lim.limit;
      // narrowing only: an amount limit may lower the activity's own planned quantity, never raise it
      if (lim.limit.amount !== undefined && act.amount > 0) act.amount = Math.min(act.amount, lim.limit.amount);
    }
    record(world, p, ctx, ranked, o, trigger + ' (external)', 'chosen from outside');
    startActivity(world, p, act);
    ext.notify?.(world, p, { kind: 'applied', key: o.key, activity: act, ...(lim.limit ? { limit: lim.limit } : {}) });
    return;
  }
  const started = launch(world, p, ctx, trigger);
  if (!started) p.nextThink = world.tick + 15;
  ext.notify?.(world, p, { kind: 'fallback', reason, activity: started ? p.activity : null });
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
  // Standing and facing a wolf is the one activity fleeing must not simply out-score. The two answer the same
  // situation and are scored to sit close together on purpose, so a defender re-ranked mid-attempt is pulled away
  // before they ever reach the wolf - which made the defence unreachable in practice rather than merely hard.
  //
  // A defence is therefore held against a flee UNTIL the defender becomes unable to defend at
  // all (defence.ts unfitPerson, the same conditions the option itself uses). That is "a defender can be forced to flee",
  // not "a defender is safe": a deadlier need still interrupts, the attempt's own failure conditions still end it,
  // and a `defend` activity exists only in a rules-version-4 world, so an older world reviews exactly as it did.
  const standingGround = a.kind === 'defend' && unfitPerson(world, p) === null;
  // A newly chosen defence is also an urgent response: sleep and committed work must yield.
  // An ongoing flight/defence already answers danger and keeps its ordinary switching rules.
  const danger = (best.kind === 'flee' || best.kind === 'defend') && a.kind !== 'flee' && !standingGround;
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
  // a person driven from outside is not talked out of their choice by a better score; danger and a deadlier need still are
  const ext = externalController();
  const external = ext !== null && ext.controls(world, p);
  const better = !external && best.util > cur * SWITCH_MARGIN + 3;
  if (danger || criticalMismatch || (!committed && better)) {
    const act = best.make!();
    if (!act) return;
    const why = danger ? 'danger nearby' : criticalMismatch ? `a more urgent need (${ctx.critical})` : 'something better came up';
    act.data.optKey = best.key;
    act.data.why = because(best, null, tradeReason(world, p, best));
    if (probe.on && best.kind === 'wander') probeWander((ctx.stage === 'child' ? 'child ' : 'adult ') + 'review');
    record(world, p, ctx, ranked, best, danger ? 'danger' : criticalMismatch ? 'urgent need' : 'review');
    if (danger || criticalMismatch) markSetAside(world, p);
    // being driven off from a place is remembered, so the same trip is not repeated at once
    if (danger && a.targetId && (a.kind === 'drink' || a.kind === 'gather' || a.kind === 'fetch_water')) noteFailure(world, p, a.targetId, 'a wolf came too close');
    if (external) ext.notify?.(world, p, { kind: 'override', why, activity: a });
    endActivity(world, p, 'interrupted', why);
    startActivity(world, p, act);
  }
}

/** Cheap per-tick tests that should force an immediate re-think. */
export function urgentInterrupt(world: World, p: Person): boolean {
  const a = p.activity;
  if (!a || a.kind === 'flee') return false;
  // somebody who is already walking at the wolf has decided about it; being alarmed by it every eight ticks only costs
  // a re-think that can come to nothing (the review above holds the defence anyway)
  if (a.kind === 'defend' && unfitPerson(world, p) === null) {
    const n0 = p.needs;
    return (n0.thirst < 13 || n0.hunger < 13) && world.tick - (p.cooldowns.critCheck ?? -99) > 25 ? ((p.cooldowns.critCheck = world.tick), true) : false;
  }
  const alarm = Math.min(9.5, fleeRadius(p));
  for (const s of p.seen) {
    if (!indoorHome(world, p) && isThreat(world, s) && hyp(s.x - p.x, s.y - p.y) < alarm && world.tick - (p.cooldowns.fleeCheck ?? -99) > 8) {
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
