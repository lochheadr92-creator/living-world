import { CRITICAL, DAY, HUNGER_RATE, SUNRISE, SUNSET, THIRST_RATE } from './constants';
import { dayFraction } from './environment';
import { foodUnits } from './economy';
import { estimatedAmount } from './knowledge';
import { eta as etaTo } from './optutil';
import type { Ctx, Option } from './optutil';
import { isHomeType } from './constants';
import type { Belief, NeedKey } from './types';

/**
 * Survival comes before work. Before taking on something discretionary, a person asks: if I do this, can I still get to water
 * and to food before either runs out? Relief is of two kinds and is judged differently:
 *   confirmed – in the pack, or something they can see (or have just seen) right now: believed, with a small margin;
 *   possible  – only remembered or reported, so possibly empty, moved or fouled: a fallback, needing a much larger margin.
 * The time counted is the whole of the job — the walk there, the work, and the walk back to relief.
 */
export interface Relief {
  need: 'thirst' | 'hunger';
  confirmed: boolean;
  /** ticks to walk to it from where they stand now (0 = in the pack) */
  eta: number;
  what: string;
}

export const CONFIRMED_MARGIN = 9;
export const POSSIBLE_MARGIN = 24;
/** jobs longer than this are not judged as a whole: they are reviewed every few dozen ticks and abandoned when the margin runs out */
export const HORIZON = 520;

const FRESH = 90;

export function waterRelief(ctx: Ctx): Relief | null {
  const { p, world } = ctx;
  if ((p.inv.water ?? 0) >= 1) return { need: 'thirst', confirmed: true, eta: 0, what: 'water in the pack' };
  let best: Relief | null = null;
  for (const id of p.bykind.water ?? []) {
    const b = p.beliefs[id];
    if (!b) continue;
    const e = etaTo(ctx, b.x, b.y);
    const fresh = world.tick - b.seen < FRESH;
    const cand: Relief = { need: 'thirst', confirmed: fresh, eta: e, what: fresh ? 'water in view' : 'water remembered from before' };
    if (!best || (cand.confirmed && !best.confirmed) || (cand.confirmed === best.confirmed && cand.eta < best.eta)) best = cand;
  }
  return best;
}

function holdsFood(b: Belief): boolean {
  return foodUnits(b.items ?? {}) >= 1;
}

export function foodRelief(ctx: Ctx): Relief | null {
  const { p, world } = ctx;
  if (foodUnits(p.inv) >= 1) return { need: 'hunger', confirmed: true, eta: 0, what: 'food in the pack' };
  let best: Relief | null = null;
  const consider = (b: Belief, confirmed: boolean, what: string) => {
    const cand: Relief = { need: 'hunger', confirmed, eta: etaTo(ctx, b.x, b.y), what };
    if (!best || (cand.confirmed && !best.confirmed) || (cand.confirmed === best.confirmed && cand.eta < best.eta)) best = cand;
  };
  for (const k in p.beliefs) {
    const b = p.beliefs[k as unknown as number];
    if (b.kind === 'building' && (isHomeType(b.btype) ? b.hh === p.hhId : b.btype === 'storehouse' || b.btype === 'granary') && holdsFood(b)) consider(b, world.tick - b.seen < 400, 'food in a store');
    else if ((b.kind === 'berry_bush' || b.kind === 'fruit_tree' || b.kind === 'wild_grain' || b.kind === 'fish_spot') && estimatedAmount(world, b) >= 2) consider(b, world.tick - b.seen < FRESH && b.amount >= 2, 'food growing');
  }
  return best;
}

const RATE: Record<'thirst' | 'hunger', number> = { thirst: THIRST_RATE, hunger: HUNGER_RATE };

/** The need level this person would have, at the worst, once the job is done and they have walked to relief. Larger is safer. */
export function projected(ctx: Ctx, need: 'thirst' | 'hunger', jobTicks: number, relief: Relief | null): { level: number; margin: number } {
  const level = ctx.p.needs[need];
  const away = relief ? relief.eta * 1.15 : 600; // no known relief at all: assume a long way
  const ticks = Math.min(jobTicks, HORIZON) + away;
  const after = level - RATE[need] * ticks;
  const margin = relief && relief.confirmed ? CONFIRMED_MARGIN : POSSIBLE_MARGIN;
  return { level: after, margin: CRITICAL[need] + margin };
}

const NOT_GUARDED = new Set(['flee', 'eat', 'eat_store', 'drink', 'fetch_water', 'sleep', 'rest', 'warm', 'wander']);

/** ticks of daylight left (0 at night) */
function daylightLeft(ctx: Ctx): number {
  const f = dayFraction(ctx.world.tick);
  if (f < SUNRISE || f >= SUNSET) return 0;
  return (SUNSET - f) * DAY;
}

export interface GuardVerdict {
  ok: boolean;
  why: string;
}

/** Is this discretionary option safe to take on? Survival options and fleeing are never held back. */
export function guardOption(ctx: Ctx, o: Option, water: Relief | null, food: Relief | null): GuardVerdict {
  if (o.need !== null || NOT_GUARDED.has(o.kind)) return { ok: true, why: '' };
  if (o.kind === 'socialize' && o.tag !== 'meal' && o.tag !== 'care') return { ok: true, why: '' };
  // with wolves about, a long trip that cannot be finished before dark is not started: nobody wants to be caught out in the open at night
  if (ctx.dangers.length > 0 && o.eta > 300 && (o.kind === 'explore' || o.kind === 'gather' || o.kind === 'cart_haul' || o.kind === 'haul' || o.kind === 'operate') && o.tag !== 'promise') {
    const left = daylightLeft(ctx);
    if (left < o.eta * 0.8 + 60) return { ok: false, why: 'would not be home before dark with wolves about' };
  }
  for (const [need, relief] of [['thirst', water], ['hunger', food]] as [NeedKey, Relief | null][]) {
    if (need !== 'thirst' && need !== 'hunger') continue;
    // already at (or on the way to) relief, or the job is short: nothing to fear
    if (relief && relief.eta < 25 && o.eta < 200) continue;
    const r = projected(ctx, need, o.eta, relief);
    if (r.level < r.margin) {
      const n = need === 'thirst' ? 'water' : 'food';
      const basis = relief ? (relief.confirmed ? `only ${relief.what}` : `only ${relief.what}, which may not be there`) : `no ${n} known`;
      return { ok: false, why: `would leave them too far from ${n} for too long (${basis}; ${n === 'water' ? 'thirst' : 'hunger'} would fall to ${Math.max(0, Math.round(r.level))})` };
    }
  }
  return { ok: true, why: '' };
}

/** Filter a list of candidate options through the survival guard, recording what was held back and why. */
export function applyReliefGuard(ctx: Ctx, opts: Option[]): Option[] {
  const water = waterRelief(ctx);
  const food = foodRelief(ctx);
  const kept: Option[] = [];
  for (const o of opts) {
    const v = guardOption(ctx, o, water, food);
    if (v.ok) kept.push(o);
    else if (ctx.collect) ctx.blocked.push({ ...o, make: undefined, util: 0, blocked: v.why });
  }
  return kept.length ? kept : opts.filter((o) => o.need !== null || NOT_GUARDED.has(o.kind) || o.kind === 'socialize');
}
