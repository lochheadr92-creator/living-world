// SCRATCH ONLY (free block experiment, 17 November 2026). This file must not exist outside the scratch worktree under
// C:\dev\_claude_scratch\regime-20261117\. It is not part of any rules version and is never committed.
//
// What it is for: one question, asked in scratch at rules 250. src/sim/leisure.ts pickHaunt pins spare time at a total score of 6
// ("spare time stays a fallback"), and every stocking or production option outranks 6 and is always on offer, so time that is freed
// turns into more work. This module tests one GATE: for part of each day, a person of 12 or over who is safe and whose household
// is fed, as that person believes it, is not offered NEW stocking or production work. No option's score changes. The rest of the
// day, and everybody else, is exactly as before (docs/LIFE_PLAN_20261111.md line 34 allows gates, access rules and costs, and
// forbids score boosts to social options; this stays on the allowed side).
//
// The window runs from a day fraction F until the person's own bedtime, 0.8 + p.chrono (the bedtime evening_fire.ts isEveningFor and
// leisure.ts use). The gate applies to a person at a tick when all three hold: the tick is inside their window; none of their needs is
// under its CRITICAL level (constants.ts); and the household has at least one day of food a head (provision.ts DAY_FOOD x
// RESERVE_DAYS) as THIS PERSON believes it: their own pack, the stores of their household they remember (the buildings optEat counts
// as `mine`, cellars included), and the granary allowance as they know it (options_survival.ts granaryRation, the belief-based one
// optEat uses). It reads nothing of another person's state and nothing of a store's live contents.
//
// The gate removes options and changes no score. It stands in rankOptions (decision.ts), beside childTaskFilter and threeAgesFilter, so
// ctx.options is untouched: the plan, trade and journey reviews, currentUtility and foundEmpty all see exactly what they saw before,
// and only the candidates that may be started are fewer. The activity a person is already at is exempt: its own option key is never
// removed, so reviewActivity (REVIEW_EVERY, SWITCH_MARGIN) weighs it as it always did. Only new starts are gated. Where a collecting
// ctx removes an option, it is kept in ctx.blocked with the reason "done for today", as applyReliefGuard keeps what it removes.
//
// UPPER BOUND (added 17 November 2026, after the believed-fed gate was found to hold for only 9 to 19 per cent of window person-ticks):
// setFreeBlock(from, true) drops the third condition. The gate then applies to every person of 12 or over, inside their window, with no
// need under CRITICAL, whatever they believe their household holds. Nothing else changes: same classification, same exemption.
//
// The switch is module level, never saved and never hashed, and off unless a runner calls setFreeBlock before the run. Off, freeBlockFilter
// returns its argument and the world runs bit for bit as it did. freeBlockDetail and freeBlockApplies are pure and do not read the
// switch, so a control run can account the same window.
import { AGE_CHILD, CRITICAL, NEED_KEYS, isHomeType } from './constants';
import { dayFraction } from './environment';
import { ageYears } from './people';
import { householdOf } from './buildings';
import { membersOf } from './households';
import { foodUnits } from './economy';
import { beliefsByKind } from './optutil';
import { hasCellars } from './cellars';
import { DAY_FOOD, RESERVE_DAYS, hasWinterReserve } from './provision';
import { granaryRation } from './options_survival';
import type { Ctx, Option } from './optutil';
import type { ActivityKind, Person, World } from './types';

export const FREE_BLOCK_REASON = 'done for today';
/** A day's eating for each member of the household, as provision.ts counts it (DAY_FOOD units x RESERVE_DAYS days). */
export const FED_UNITS_A_HEAD = DAY_FOOD * RESERVE_DAYS;

let blockFrom: number | null = null;
let ignoreFood = false;

/** Turn the gate on with the window starting at day fraction `from` (0 to 1, exclusive), or off with null. A runner calls this before the run. */
export function setFreeBlock(from: number | null, ignoreFoodCondition = false): void {
  if (from !== null && (!Number.isFinite(from) || from <= 0 || from >= 1)) throw new Error('free block window start must be a day fraction above 0 and below 1');
  if (from === null && ignoreFoodCondition) throw new Error('the upper bound needs a window start');
  blockFrom = from;
  ignoreFood = ignoreFoodCondition;
}
export const freeBlockFrom = (): number | null => blockFrom;
export const freeBlockIgnoresFood = (): boolean => ignoreFood;

/**
 * Units of food the household has, as this person believes it. Own pack: foodUnits(p.inv), the test optEat applies. Each store they
 * remember that optEat counts as `mine` (their household's home types, and its cellars where cellars exist): foodUnits of the belief's
 * items. Each granary they remember, by granaryRation, which is belief-based (known within a day, held by the household or in common)
 * and, as optEat does, only where a winter reserve is in force. Nothing is read from the world behind their back.
 */
export function believedHouseholdFood(w: World, p: Person): number {
  let food = foodUnits(p.inv);
  const bins = hasWinterReserve(w);
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype === 'granary') {
      if (bins) food += granaryRation(w, p, b.id);
      continue;
    }
    const cellar = hasCellars(w) && b.hh === p.hhId && b.btype === 'cellar';
    if (b.hh === p.hhId && (isHomeType(b.btype) || cellar)) food += foodUnits(b.items ?? {});
  }
  return food;
}

/** Believed household food a head: the figure above over the household's members (at least 1). */
export function believedFoodAHead(w: World, p: Person): number {
  return believedHouseholdFood(w, p) / Math.max(1, membersOf(w, householdOf(w, p)).length);
}

export interface FreeBlockDetail {
  /** aged 12 or over (AGE_CHILD); the gate and the accounting leave under-12s alone */
  grown: boolean;
  /** the tick is from the window start until the person's own bedtime */
  inWindow: boolean;
  /** some need is under its CRITICAL level */
  urgent: boolean;
  /** the household has under a day of food a head, as this person believes it */
  short: boolean;
}

/** Every condition of the gate, for one person now. Pure; does not read the switch. `urgent` and `short` are false outside the window. */
export function freeBlockDetail(w: World, p: Person, from: number): FreeBlockDetail {
  if (ageYears(w, p) < AGE_CHILD) return { grown: false, inWindow: false, urgent: false, short: false };
  const frac = dayFraction(w.tick);
  if (!(frac >= from && frac < 0.8 + p.chrono)) return { grown: true, inWindow: false, urgent: false, short: false };
  let urgent = false;
  for (const k of NEED_KEYS) if (p.needs[k] < CRITICAL[k]) urgent = true;
  return { grown: true, inWindow: true, urgent, short: believedFoodAHead(w, p) < FED_UNITS_A_HEAD };
}

/** Would the gate apply to this person now, with the window starting at `from`? Pure; independent of the switch. With `withoutFoodCondition` the believed household food is not asked (the upper bound). */
export function freeBlockApplies(w: World, p: Person, from: number, withoutFoodCondition = false): boolean {
  if (ageYears(w, p) < AGE_CHILD) return false;
  const frac = dayFraction(w.tick);
  if (!(frac >= from && frac < 0.8 + p.chrono)) return false;
  for (const k of NEED_KEYS) if (p.needs[k] < CRITICAL[k]) return false;
  return withoutFoodCondition || believedFoodAHead(w, p) >= FED_UNITS_A_HEAD;
}

// ───────────────────────── what is gated ─────────────────────────
// A kind is gated when it is work that builds stock or makes things for later and the brief names it: gather, deposit, withdraw, haul,
// operate, craft, build, repair, tool work, till, plant, tend, harvest, explore. Also gated, as the same kind of work under another
// name: cart_haul (a haul), plan_site (laying out what will be built) and tree_work (planting a tree). Every other kind is offered as
// today. Within a gated kind, an option is kept when it serves the person's own present need (its `need` is set: eating, hunger
// gathering, a hungry harvest, a warm home, dressing), when it is made for the care of a named person or to keep a promise (tag
// 'care', 'promise'), when it is a meal (tag 'meal'), or when it is part of a household relocation. The classification table in
// out\free\report.md lists every site this was read from; tests of it are in scripts/free_classify.ts.
const GATED_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>(['gather', 'deposit', 'withdraw', 'haul', 'cart_haul', 'operate', 'craft', 'build', 'plan_site', 'repair', 'tool_work', 'till', 'plant', 'tend', 'harvest', 'explore', 'tree_work']);
const KEPT_TAGS: ReadonlySet<string> = new Set(['care', 'promise', 'meal', 'relocation']);

export interface Classified { gated: boolean; why: string }
/** Is an option of this shape one the gate would remove? Reads only the option's own kind, need, tag and key. */
export function classifyOption(o: Pick<Option, 'kind' | 'need' | 'tag' | 'key'>): Classified {
  if (o.need !== null) return { gated: false, why: 'kept: serves the person\'s own present need' };
  if (o.tag !== undefined && KEPT_TAGS.has(o.tag)) return { gated: false, why: `kept: tag ${o.tag}` };
  if (o.key.startsWith('relocate')) return { gated: false, why: 'kept: household relocation' };
  if (GATED_KINDS.has(o.kind)) return { gated: true, why: 'gated: stocking or production work' };
  return { gated: false, why: 'kept: not a named stocking or production kind' };
}

/** Counts for the run's report (never saved, never hashed): every call, every call where the gate applied, and what it removed. */
export const freeBlockStats = { calls: 0, applied: 0, removed: 0, removedByKind: {} as Record<string, number>, exemptRunning: 0 };

/** The one hook, in rankOptions: with the switch off it returns `opts` unchanged. */
export function freeBlockFilter(ctx: Ctx, opts: Option[]): Option[] {
  if (blockFrom === null) return opts;
  freeBlockStats.calls++;
  const { world, p } = ctx;
  if (!freeBlockApplies(world, p, blockFrom, ignoreFood)) return opts;
  freeBlockStats.applied++;
  const running = p.activity?.data.optKey;
  const kept: Option[] = [];
  for (const o of opts) {
    if (!classifyOption(o).gated) { kept.push(o); continue; }
    if (o.key === running) { freeBlockStats.exemptRunning++; kept.push(o); continue; }
    freeBlockStats.removed++;
    freeBlockStats.removedByKind[o.kind] = (freeBlockStats.removedByKind[o.kind] ?? 0) + 1;
    if (ctx.collect) ctx.blocked.push({ ...o, make: undefined, util: 0, blocked: FREE_BLOCK_REASON });
  }
  return kept;
}
