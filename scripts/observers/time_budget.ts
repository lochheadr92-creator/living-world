// Lab-only accounting. Every living person at the start of a tick contributes exactly one occupancy tick.
// Occupancy describes the state at that boundary, not a claim that a handler executed for the whole tick.
import { CRITICAL, NEED_KEYS } from '../../src/sim/constants';
import { drive } from '../../src/sim/needs';
import { generateOptions, rankOptions } from '../../src/sim/decision';
import { servesIntent } from '../../src/sim/intent';
import type { Activity, Person, World } from '../../src/sim/types';

export const TIME_CATEGORIES = ['sleep', 'eating_drinking_warming', 'travel', 'work', 'social_contact', 'leisure', 'waiting', 'failure_recovery', 'rest', 'defence', 'idle'] as const;
export type TimeCategory = typeof TIME_CATEGORIES[number];
const zeros = () => Object.fromEntries(TIME_CATEGORIES.map(k => [k, 0])) as Record<TimeCategory, number>;
const bump = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };

export function timeCategory(p: Person, tick: number): TimeCategory {
  const a = p.activity;
  if (!a) return p.lastResult && p.lastResult.tick >= tick - 80 && ['failed', 'interrupted'].includes(p.lastResult.outcome) ? 'failure_recovery' : 'idle';
  if (a.blocked) return 'waiting';
  if (a.phase === 'travel') return 'travel';
  if (a.kind === 'sleep') return 'sleep';
  if (a.kind === 'eat' || a.kind === 'eat_store' || a.kind === 'drink' || a.kind === 'warm') return 'eating_drinking_warming';
  if (a.kind === 'rest') return a.data.daylightAt !== undefined ? 'waiting' : 'rest';
  if (['converse', 'socialize', 'argue', 'attend', 'attend_meal', 'host_meal', 'visit'].includes(a.kind)) return 'social_contact';
  if (a.kind === 'wander' || a.kind === 'alone') return 'leisure';
  if (a.kind === 'flee' || a.kind === 'defend') return 'defence';
  return 'work';
}

export class TimeBudget {
  readonly totals = zeros();
  readonly people: Record<number, { name: string; hh: number; ticks: number; categories: Record<TimeCategory, number>; criticalTicks: number }> = {};
  readonly starts: Record<string, number> = {};
  readonly endings: Record<string, number> = {};
  readonly blockedTicks: Record<string, number> = {};
  readonly criticalByNeed: Record<string, number> = {};
  readonly failedTravel: Record<string, { endings: number; travelTicks: number; repeatEndings: number }> = {};
  readonly workSpells: Record<string, number> = {};
  readonly plans = new Map<number, { person: number; name: string; id: number; kind: string; makes: string; since: number; until: number; status: string; reason: string; step: string; lastSeen: number; starts: number; ends: Record<string, number> }>();
  readonly planSamples: unknown[] = [];
  readonly sampleCounts = { activeBatch: 0, stepOffered: 0, stepEligible: 0, stepRankedFirst: 0, noProductionMargin: 0, omittedRows: 0 };
  livingTicks = 0;
  criticalTicks = 0;
  private travel = new Map<number, number>();
  private repeatFailures = new Set<string>();
  private spells = new Map<number, { activity: number; ticks: number }>();

  attach(world: World): () => void {
    const prior = world.hooks;
    world.hooks = {
      ...prior,
      onActivityStart: (p, a) => { prior?.onActivityStart?.(p, a); bump(this.starts, a.kind); const plan = this.plans.get(a.data.forPlan); if (plan) plan.starts++; },
      onActivityEnd: (p, a, outcome, detail) => {
        prior?.onActivityEnd?.(p, a, outcome, detail);
        bump(this.endings, `${a.kind}|${outcome}|${detail}`);
        const plan = this.plans.get(a.data.forPlan); if (plan) bump(plan.ends, `${outcome}|${detail}`);
        const ticks = this.travel.get(a.id) ?? 0;
        if (ticks && (outcome === 'failed' || outcome === 'interrupted')) {
          const key = `${a.kind}|${outcome}|${detail}`, repeatKey = `${p.id}|${a.kind}|${a.targetId}`;
          const row = this.failedTravel[key] ??= { endings: 0, travelTicks: 0, repeatEndings: 0 };
          row.endings++; row.travelTicks += ticks;
          if (this.repeatFailures.has(repeatKey)) row.repeatEndings++;
          this.repeatFailures.add(repeatKey);
        }
        this.travel.delete(a.id);
      },
    };
    return () => { world.hooks = prior; };
  }

  private endSpell(id: number): void {
    const spell = this.spells.get(id);
    if (!spell) return;
    const n = spell.ticks;
    bump(this.workSpells, n < 30 ? '1-29' : n < 120 ? '30-119' : n < 300 ? '120-299' : '300+');
    this.spells.delete(id);
  }

  sampleTick(world: World): void {
    const live = new Set<number>();
    for (const p of world.persons) {
      if (!p.alive) continue;
      live.add(p.id);
      const category = timeCategory(p, world.tick);
      const row = this.people[p.id] ??= { name: p.name, hh: p.hhId, ticks: 0, categories: zeros(), criticalTicks: 0 };
      row.ticks++; row.categories[category]++; this.totals[category]++; this.livingTicks++;
      const critical = NEED_KEYS.filter(k => k !== 'social' && p.needs[k] < CRITICAL[k]);
      if (critical.length) { this.criticalTicks++; row.criticalTicks++; }
      for (const k of critical) bump(this.criticalByNeed, k);
      const a = p.activity;
      if (a && category === 'travel') this.travel.set(a.id, (this.travel.get(a.id) ?? 0) + 1);
      if (a?.blocked) bump(this.blockedTicks, a.blocked);
      const spell = this.spells.get(p.id);
      if (category !== 'work' || spell?.activity !== a?.id) this.endSpell(p.id);
      if (category === 'work' && a) { const current = this.spells.get(p.id) ?? { activity: a.id, ticks: 0 }; current.ticks++; this.spells.set(p.id, current); }
      for (const i of p.intentions) {
        const prior = this.plans.get(i.id);
        this.plans.set(i.id, { person: p.id, name: p.name, id: i.id, kind: i.kind, makes: i.makes, since: i.since, until: i.until, status: i.status, reason: i.reason, step: i.step, lastSeen: world.tick, starts: prior?.starts ?? 0, ends: prior?.ends ?? {} });
      }
    }
    for (const id of this.spells.keys()) if (!live.has(id)) this.endSpell(id);
  }

  // Sampled opportunity denominators, deliberately separate from the exact occupancy counters.
  samplePlans(world: World): void {
    for (const p of world.persons) for (const i of p.intentions) {
      if (!p.alive || i.status !== 'active' || i.kind !== 'batch') continue;
      const ctx = generateOptions(world, p, true, true), ranked = rankOptions(ctx);
      const offered = ctx.options.filter(o => servesIntent(i, o));
      const eligible = ranked.filter(o => servesIntent(i, o));
      const margin = drive(p.needs.hunger, 'hunger', world) <= 30 && drive(p.needs.thirst, 'thirst', world) <= 30 && drive(p.needs.energy, 'energy', world) <= 45 && p.health >= 45;
      this.sampleCounts.activeBatch++;
      if (offered.length) this.sampleCounts.stepOffered++;
      if (eligible.length) this.sampleCounts.stepEligible++;
      if (ranked[0] && servesIntent(i, ranked[0])) this.sampleCounts.stepRankedFirst++;
      if (!margin) this.sampleCounts.noProductionMargin++;
      if (this.planSamples.length >= 20000) { this.sampleCounts.omittedRows++; continue; }
      this.planSamples.push({ tick: world.tick, person: p.id, name: p.name, plan: i.id, makes: i.makes, step: i.step, key: i.stepKey, blocked: i.blocked, margin, criticals: ctx.criticals, needs: { ...p.needs }, activity: p.activity ? { kind: p.activity.kind, phase: p.activity.phase, plan: p.activity.data.forPlan } : null, offered: offered.map(o => ({ key: o.key, utilityBeforeRanking: o.util })), eligible: eligible.map(o => o.key), first: ranked[0] ? { key: ranked[0].key, utilityBeforeRanking: ranked[0].util } : null });
    }
  }

  report() {
    return { method: 'Start-of-tick living-person occupancy; exclusive categories, actual endings, sampled batch-step opportunities. Critical exposure uses fixed bodily thresholds, not anticipatory thirst. Failure recovery is idle within 80 ticks of failure/interruption. Aborted travel may have achieved partial useful work; it is not automatically wasted time. Open work spells are right-censored.', livingTicks: this.livingTicks, totals: this.totals, criticalTicks: this.criticalTicks, criticalByNeed: this.criticalByNeed, starts: this.starts, endings: this.endings, blockedTicks: this.blockedTicks, failedTravel: this.failedTravel, completedWorkSpells: this.workSpells, openWorkSpells: [...this.spells.values()], sampleCounts: this.sampleCounts, people: this.people, plans: [...this.plans.values()] };
  }
}
