// Why is the running activity's option absent when someone looks again? (measurement only: no behaviour changes)
//
// decision.ts reviewActivity looks the running activity's option key up in freshly generated options; an absent key makes the activity
// worth 0, so any option worth more than 3 beats it. This script runs ONE world and, at every ordinary switch (the reason is not danger,
// a deadlier need, minimum commitment or an outside controller), records what happened, for any activity kind and phase. For switches
// whose key is ABSENT it also tests why (see the tests below) and whether the person goes back to the same thing soon after.
//
//   npx vite-node scripts/option_absent_diagnostic.ts -- --seed aspen --profile normal --days 25 --out C:/dev/lw_labs/option_absent/aspen.json
//   npx vite-node scripts/option_absent_diagnostic.ts -- --load C:/dev/lw_saves/rules256/aspen-day96.save.json --rules-up 260 --days 5 --out ...
//   --no-hook   run the same world with the probe off and no callback (the control for the hash check; prints finalHash only)
//   --rows      also write every absent row to <out>.rows.jsonl (for re-cutting the classes)
//
// A fresh world is a Normal world with arrivals on (scripts/world_args.ts worldFromArgs), as a new game is. One run per process.
//
// The five classes asked for, assigned in this order (every test is recorded as a boolean in the row, so the classes can be re-cut):
//   a1 self-excluded     the same key IS offered when the person is not busy (p.activity swapped for null, observer option planner)
//   a2 held claims       (only when a1 is false) also offered when, as well, the plans / journeys / promises the running activity serves
//                        are set aside while the planner runs (p.intentions and p.commitments swapped for filtered copies)
//   b  same item, elsewhere  an option of the same kind for the same item exists with another target (the trip could be re-aimed)
//   c  target changed in the person's own knowledge since the activity began (a newer sight that excludes it, a gone or emptied belief,
//      a failure noted since, a person seen now fed or asleep); needs the snapshot taken at the start (or at load for an activity already running)
//   d  demand gone       nothing of that kind for that item is offered even when idle
//   e  unexplained
// Because b and d turned out to describe, not explain, a second cut gives each absent row ONE cause (see causeOf), using further read-only
// tests: f puts the person's needs back to what they were when the activity began and asks again (a hunger, thirst or tiredness gate that
// closed during the walk), and which single need brings it back; the planner's own recorded reason for ruling out the target; what changed in
// the target belief on a newer sight; and what the score would have said had the option stayed (cf).
// Sanity checks printed in the summary: purity (hashWorld around every analysed switch, serializeWorld around the first 30 and every 100th),
// the observer planner's option keys against the review's own (regen), and, on every tenth switch whose key was present, whether the
// idle swap still offers it (it does not always: while busy, kept_target.ts keeps the running key in a short candidate list).
// Everything the hook does is read-only: it swaps fields on the person and restores them in a finally block, and uses the observer form
// of generateOptions. `--no-hook` runs the same world with the probe off, for the hash comparison (finalHash and finalSerial).
import { writeFileSync } from 'node:fs';
import { serializeWorld } from '../src/app/save';
import { DAY, SOURCE_ITEM, SWITCH_MARGIN } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { estimatedAmount, recentFailure } from '../src/sim/knowledge';
import { drive } from '../src/sim/needs';
import { ageYears } from '../src/sim/people';
import { probe } from '../src/sim/probe';
import type { OrdinarySwitch } from '../src/sim/probe';
import { hashWorld, stepWorld } from '../src/sim/world';
import { invRoom } from '../src/sim/economy';
import { hhState, materialNeeds } from '../src/sim/options_work';
import { facilitiesOf } from '../src/sim/production';
import { dangerAt, sourceUsable } from '../src/sim/optutil';
import type { Option } from '../src/sim/optutil';
import { benchStock } from '../src/sim/site_supply';
import type { Activity, Belief, BuildingType, Person, World } from '../src/sim/types';
import { argsOf, worldFromArgs } from './world_args';
import { timeCategory } from './observers/time_budget';

const { args, opt } = argsOf(process.argv);
if (opt('profile', 'normal') !== 'normal') throw new Error('--profile: this diagnostic runs Normal worlds only');
const out = opt('out', '');
const days = Number(opt('days', '2'));
const noHook = args.includes('--no-hook');
const writeRows = args.includes('--rows');
const { w, loaded, startDay } = worldFromArgs(opt);
const startTick = w.tick;
const stopTick = startTick + Math.round(days * DAY);
const BOUNCE_WINDOW = 600;
const SAMPLE_CAP_E = 30;
const SAMPLE_CAP_OTHER = 6;
/** kinds grouped for reading: what the person was doing */
const GROUP: Record<string, string> = {
  gather: 'work', withdraw: 'work', haul: 'work', deposit: 'work', build: 'work', repair: 'work', craft: 'work', operate: 'work', till: 'work', plant: 'work',
  tend: 'work', harvest: 'work', fuel_fire: 'work', plan_site: 'work', fetch_water: 'work', tool_work: 'work', cart_haul: 'work', claim_home: 'work', animal_work: 'work',
  eat: 'need', eat_store: 'need', drink: 'need', warm: 'need', sleep: 'need', rest: 'need',
  socialize: 'social', converse: 'social', give: 'social', attend: 'social', attend_meal: 'social', host_meal: 'social', visit: 'social', argue: 'social',
  tree_work: 'work', wander: 'idle', explore: 'idle', alone: 'idle', flee: 'danger', defend: 'danger',
};
const groupOf = (kind: string): string => GROUP[kind] ?? 'other';
/**
 * One cause per absent row, assigned in this order (the booleans behind it are all in the row, so it can be re-cut):
 *  self           the same key is offered when the person is not busy: the running activity removed its own option      (a1)
 *  held_claims    offered when, as well, the plans / journeys / promises it serves are set aside                          (a2)
 *  newer_sight    the person's own knowledge of the target changed since the start in a way that rules it out            (c)
 *  needs_drift    offered again when the person's needs are put back to what they were at the start: a hunger, thirst or
 *                 tiredness gate (or the work-window estimate, which also reads the needs) closed it during the walk     (f)
 *  clock_drift    (not f) offered again when the world clock alone is put back to the start: something the planner reads of the time itself
 *                 (a sight's age, a batch's ready tick, a failure's cooldown, day or night) closed it during the walk       (g)
 *  needs_and_clock offered again only when both the needs and the clock are put back                                      (gf)
 *  target_became_dest  the target is a workshop that was not the nearest of its type to the person at the start and is now: the planner
 *                 takes the nearest workshop as the place a batch is made, and a workshop is never a source for a batch made at itself
 *                 (production.ts collectOptions, `b.id === dest.id`), so walking up to it removes its own collect option          (destSwap)
 *  walk_moved_other offered again when the person is put back where they were at the start, for any other reason                   (h)
 *  scope_window   the planner's own trip-and-return time estimate refused it (action_scope.ts), needs not the reason
 *  sight_changed_other  a newer sight changed the target in the person's knowledge in a way the tests above do not name (the `changed` field says which)
 *  planner_reason the planner recorded a reason of its own for ruling this target out (the `reason` field), none of the above
 *  reaimed        an option for the same kind and item with another target is offered                                      (b)
 *  demand_gone    nothing of that kind for that item is offered even when idle                                           (d)
 *  unexplained
 */
function causeOf(r: Row): string {
  if (r.tests.a1) return 'self';
  if (r.tests.a2) return 'held_claims';
  if (r.tests.c === true) return 'newer_sight';
  if (r.tests.f === true) return 'needs_drift';
  if (r.tests.g === true) return 'clock_drift';
  if (r.tests.gf === true) return 'needs_and_clock';
  if (r.tests.destSwap?.swap === true) return 'target_became_dest';
  if (r.tests.h === true) return 'walk_moved_other';
  if (r.scopeBlocked || (r.reason !== null && /estimated time/.test(r.reason))) return 'scope_window';
  if (r.reason !== null) return 'planner_reason';
  if (r.c?.newerSight && r.c.anyChange) return 'sight_changed_other';
  if (r.tests.bItem === true) return 'reaimed';
  if (r.tests.d === true) return 'demand_gone';
  return 'unexplained';
}

// ───────────────────────────────────────────────────── helpers ─────────────────────────────────────────────────────
const itemOfSource = (kind: string): string | undefined => (SOURCE_ITEM as Record<string, string>)[kind];
function itemsFromKey(key: string | undefined): string[] {
  if (!key) return [];
  const m = /^(?:collect|bring):\d+:(.+)$/.exec(key) ?? /^withdraw:\d+:(.+)$/.exec(key);
  return m ? m[1].split('+') : [];
}
function itemsOfOption(p: Person, o: Option): string[] {
  const s = new Set<string>(itemsFromKey(o.key));
  if (o.yields) s.add(o.yields);
  if (o.kind === 'gather') {
    const b = p.beliefs[o.targetId];
    const it = b ? itemOfSource(b.kind) : undefined;
    if (it) s.add(it);
  }
  return [...s];
}
function itemsOfActivity(p: Person, a: Activity): string[] {
  const s = new Set<string>(itemsFromKey(a.data.optKey as string | undefined));
  const di = a.data.items;
  if (di && typeof di === 'object') for (const k of Object.keys(di)) s.add(k);
  if (a.item) s.add(a.item);
  if (typeof a.data.materialStock === 'string') s.add(a.data.materialStock);
  if (a.kind === 'gather') {
    const t = typeof a.data.stype === 'string' ? a.data.stype : p.beliefs[a.targetId]?.kind;
    const it = t ? itemOfSource(t) : undefined;
    if (it) s.add(it);
  }
  return [...s];
}
const intersects = (x: string[], y: string[]): boolean => x.some((i) => y.includes(i));
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** what the person believed about the target (the parts that decide whether a trip to it still makes sense) */
function snapBelief(b: Belief | undefined) {
  if (!b) return null;
  const ops = b.ops as (Belief['ops'] & { held?: unknown }) | undefined;
  return {
    seen: b.seen, src: b.src, amount: b.amount, max: b.max, items: clone(b.items ?? null), need: clone(b.need ?? null), opsFull: clone(b.ops ?? null),
    ops: ops ? clone({ job: ops.job, output: ops.output, yields: ops.yields, readyAt: ops.readyAt, client: ops.client, held: ops.held ?? null }) : null,
    whole: clone(b) as unknown as Record<string, unknown>,
  };
}
/** the fields of the belief that differ between two snapshots, leaving out the bookkeeping of when and from whom it was learned and a building's wear (`cond`), which every sight nudges */
const QUIET = new Set(['seen', 'learned', 'from', 'src', 'origin', 'hops', 'cond']);
function changedFields(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!QUIET.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(k);
  return out;
}
/** what the person can tell of another person they are heading for: in sight or not, asleep, carrying food, looking hungry, thirsty or cold */
function snapPerson(p: Person, id: number) {
  const e = p.seen.find((x) => x.ent === 'person' && x.id === id) as (typeof p.seen[number] & { asleep?: boolean }) | undefined;
  const wh = p.whereabouts[id];
  return { inSight: !!e, asleep: !!e?.asleep, carrying: e ? e.carrying.slice() : [], hungry: !!e?.hungry, thirsty: !!e?.thirsty, cold: !!e?.cold, whereTick: wh?.tick ?? null };
}
const isFoodKind = (k: string): boolean => ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat', 'flour', 'fat'].includes(k);
type StartSnap = {
  person: ReturnType<typeof snapPerson> | null; tick: number; x: number; y: number; spotX: number; spotY: number; belief: ReturnType<typeof snapBelief>; need: number | null; needs: Person['needs']; night: boolean; failureTick: number | null; loadedRunning: boolean };
const starts = new Map<number, StartSnap>();
/** the planner's own notion of night (optutil.ts makeCtx), without the dark-sky part, which is not recoverable for a past tick */
function isNight(p: Person, tick: number): boolean { const f = dayFraction(tick); return f > 0.8 + p.chrono || f < 0.2 + p.chrono; }
function driveOf(p: Person, k: 'hunger' | 'thirst' | 'energy', needs: Person['needs']): number { return Math.round(drive(needs[k], k, w)); }
const world0Entity = (id: number): string | undefined => w.byId.get(id)?.ent;
function takeSnap(p: Person, a: Activity, loadedRunning: boolean): void {
  starts.set(a.id, {
    person: world0Entity(a.targetId) === 'person' ? snapPerson(p, a.targetId) : null,
    tick: loadedRunning ? w.tick : a.start, x: p.x, y: p.y, spotX: a.spotX, spotY: a.spotY, belief: snapBelief(p.beliefs[a.targetId]),
    need: a.need ? p.needs[a.need] : null, needs: { ...p.needs }, night: isNight(p, loadedRunning ? w.tick : a.start), failureTick: p.failures[a.targetId]?.tick ?? null, loadedRunning,
  });
}

// ───────────────────────────────────────────────────── records ─────────────────────────────────────────────────────
type PersonChange = { lostSight: boolean; nowFed: boolean; nowAsleep: boolean; nowEased: boolean; excluded: boolean };
type Bounce = { checked: boolean; censored: boolean; within: boolean; ticks: number | null; by: 'key' | 'kindItem' | null };
interface Row {
  tick: number; person: number; adult: boolean; kind: string; phase: string; key: string; target: number; purpose: string | null;
  items: string[]; progress: number | null; sinceStart: number; walked: number;
  switchWhy: string; ranWhy: string; replKind: string; replKey: string; replSameKindItem: boolean; replPurpose: string | null;
  tests: {
    a1: boolean; a2: boolean | null; bItem: boolean | null; bKind: boolean; c: boolean | null; d: boolean | null; idleSameKind: boolean;
    regenPresent: boolean; f: boolean | null; g: boolean | null; gf: boolean | null; h: boolean | null; destSwap: { type: string; nearestNow: number | null; nearestStart: number | null; swap: boolean } | null; fOnly: { hunger: boolean; thirst: boolean; energy: boolean } | null; startSnap: 'start' | 'load' | 'none';
  };
  c: null | {
    newerSight: boolean; beliefGone: boolean; amountDown: boolean; itemsDown: boolean; needDown: boolean; heldChanged: boolean; outputChanged: boolean;
    takeStart: number | null; takeNow: number | null; storeExcluded: boolean; needMet: boolean; itemsGone: boolean; sourceEmpty: boolean;
    person: PersonChange | null;
    changed: string[];
    estNow: number | null; estStart: number | null; failureNew: boolean; anyChange: boolean; excluded: boolean;
  };
  drives: { start: { hunger: number; thirst: number; energy: number } | null; now: { hunger: number; thirst: number; energy: number }; nightChanged: boolean | null; replNeed: string | null };
  /** would the person have switched anyway, on score alone? stored = the utility the activity was started with; f = its utility when the needs are put back to what they were at the start */
  cf: { storedUtil: number; bestUtil: number; wouldSwitchStored: boolean; fUtil: number | null; wouldSwitchF: boolean | null };
  tgt: null | { kind: string; seenAge: number; amount: number; est: number | null; items: Record<string, number>; need: Record<string, number>; bench: Record<string, number> | null; room: Record<string, number>; usable: string | null; failure: string | null; danger: number | null };
  want: { planActive: boolean | null; planWantsItem: boolean | null; planShort: boolean | null; need: string | null; needAtStart: number | null; needNow: number | null; hhFoodShort: boolean | null; materialNeedNow: string[] | null };
  blockedSame: string[]; idleBlocked: string[]; scopeBlocked: boolean;
  /** the planner's own reason (digits as #) for ruling out this target, from the busy-state planner or else the idle one: null when it gave none */
  reason: string | null;
  class: string; classAlt: string; group: string; cause: string;
  bounce: Bounce;
  sawReplacement?: boolean;
  top5?: { key: string; kind: string; util: number }[];
}
const rows: Row[] = [];
type Counts = Record<string, number>;
const bump = (c: Counts, k: string, n = 1): void => { c[k] = (c[k] ?? 0) + n; };
const switchesAll: Counts = {}; // kind|phase|status where status is present | absent | unkeyed
const walkedByStatus: Counts = {}; // adult ticks spent on the abandoned leg, by status (phase travel only)
const purity = { checked: 0, hashFail: 0, serialChecked: 0, serialFail: 0 };
const regen = { checked: 0, keysDiffer: 0, differs: [] as string[] };
const errorsSeen: string[] = [];
let adultWalkTicks = 0;
let absentSeq = 0, presentSeq = 0;
const idleCheckOnPresent: Counts = {};

const pendingBounce = new Map<number, Row[]>();

// ───────────────────────────────────────────────────── the callback ─────────────────────────────────────────────────────
function onSwitch(s: OrdinarySwitch): void {
  const { world, p, a, ctx, best, key, currentPresent } = s;
  const adult = ageYears(world, p) >= 12;
  const status = key === undefined ? 'unkeyed' : currentPresent ? 'present' : 'absent';
  bump(switchesAll, `${a.kind}|${a.phase}|${status}`);
  const snap = starts.get(a.id);
  const walked = a.phase === 'travel' ? world.tick - a.start : 0;
  if (adult && walked > 0) bump(walkedByStatus, status, walked);
  if (status === 'present') {
    // a check on the swap itself, on every tenth present switch: with the person set not busy, is a key that was present while busy still offered?
    presentSeq++;
    if (presentSeq % 10 === 0) {
      const saved = p.activity;
      try {
        p.activity = null;
        const idle = generateOptions(world, p, false, true);
        bump(idleCheckOnPresent, `${a.kind}|${idle.options.some((o) => o.key === key) ? 'still offered' : 'lost when idle'}`);
      } catch (e) { errorsSeen.push('idle-check: ' + String(e).slice(0, 120)); } finally { p.activity = saved; }
    }
  }
  if (status !== 'absent') return;

  absentSeq++;
  const h0 = hashWorld(world);
  const doSerial = absentSeq <= 30 || absentSeq % 100 === 0;
  const s0 = doSerial ? serializeWorld(world) : null;
  const items = itemsOfActivity(p, a);
  let f: boolean | null = null, fUtil: number | null = null, g: boolean | null = null, gf: boolean | null = null, h: boolean | null = null;
  let destSwap: { type: string; nearestNow: number | null; nearestStart: number | null; swap: boolean } | null = null;
  let fOnly: { hunger: boolean; thirst: boolean; energy: boolean } | null = null;
  let a1 = false, a2: boolean | null = null, idleSameKind = false, idleSameItem = false, regenPresent = false;
  let blockedSame: string[] = [], idleBlocked: string[] = [], scopeBlocked = false;
  let reasonRun: string | null = null, reasonIdle: string | null = null;
  const norm = (t: string | undefined): string | null => (t ? t.replace(/[0-9]+(.[0-9]+)?/g, '#').slice(0, 90) : null);
  let materialNeedNow: string[] | null = null;
  const savedActivity = p.activity, savedIntentions = p.intentions, savedCommitments = p.commitments, savedNeeds = { ...p.needs };
  const snap0 = starts.get(a.id);
  try {
    // the planner as the person sees it now, observer form, with the ruled-out options recorded
    const run = generateOptions(world, p, true, true);
    regen.checked++;
    regenPresent = run.options.some((o) => o.key === key);
    const wanted = new Set(ctx.options.map((o) => o.key)), got = new Set(run.options.map((o) => o.key));
    if (wanted.size !== got.size || [...wanted].some((k) => !got.has(k))) {
      regen.keysDiffer++;
      if (regen.differs.length < 10) regen.differs.push(`${a.kind}|${key}: review ${wanted.size} keys, observer ${got.size}; only-review ${[...wanted].filter((k) => !got.has(k)).slice(0, 4).join(',')}; only-observer ${[...got].filter((k) => !wanted.has(k)).slice(0, 4).join(',')}`);
    }
    for (const b of run.blocked) if (b.key === key || (b.targetId === a.targetId && b.kind === a.kind)) blockedSame.push(`${b.key === key ? '[same key] ' : ''}${(b.blocked ?? '').slice(0, 110)}`);
    reasonRun = norm(run.blocked.find((b) => b.key === key || (a.targetId !== 0 && b.targetId === a.targetId))?.blocked);
    scopeBlocked = run.blocked.some((b) => b.key === key && /estimated time|room in my pack/.test(b.blocked ?? ''));

    // f: with the person's needs set back to what they were when the activity began (the planner's gates on hunger, thirst and tiredness
    // read the drives; a long walk lets them rise past a gate that was open at the start). Everything else as it is now.
    if (snap0) {
      Object.assign(p.needs, snap0.needs);
      const fo = generateOptions(world, p, false, true).options.find((o) => o.key === key);
      f = !!fo;
      fUtil = fo ? fo.util : null;
      Object.assign(p.needs, savedNeeds);
      if (f) {
        // which need? put back ONE at a time, the others as they are now
        fOnly = { hunger: false, thirst: false, energy: false };
        for (const k of ['hunger', 'thirst', 'energy'] as const) {
          p.needs[k] = snap0.needs[k];
          fOnly[k] = generateOptions(world, p, false, true).options.some((o) => o.key === key);
          p.needs[k] = savedNeeds[k];
        }
        Object.assign(p.needs, savedNeeds);
      }
    }
    // g: with the world clock put back to the tick the activity began (the needs as they are now), and gf: clock and needs both put back.
    // What the planner reads of the time itself (how recent a sight is, whether a batch is ready, a failure's cooldown, day or night) is then
    // as it was at the start; positions, beliefs and packs are as they are now.
    if (snap0 && snap0.tick < world.tick) {
      const tNow = world.tick;
      try {
        world.tick = snap0.tick;
        g = generateOptions(world, p, false, true).options.some((o) => o.key === key);
        Object.assign(p.needs, snap0.needs);
        gf = generateOptions(world, p, false, true).options.some((o) => o.key === key);
      } finally { world.tick = tNow; Object.assign(p.needs, savedNeeds); }
    }
    // h: with the PERSON put back where they were when the activity began (everything else as it is now): the planner reads the person's own
    // position (walking cost, and which workshop of a kind is nearest, which production.ts takes as the place a batch is made).
    // destSwap asks that last question directly for a target that is itself a workshop: was it the nearest of its type at the start, is it now?
    if (snap0 && (snap0.x !== p.x || snap0.y !== p.y)) {
      const px = p.x, py = p.y;
      try {
        p.x = snap0.x; p.y = snap0.y;
        h = generateOptions(world, p, false, true).options.some((o) => o.key === key);
        const tb = p.beliefs[a.targetId];
        if (tb?.kind === 'building' && tb.btype) {
          const nearestStart = facilitiesOf(ctx, tb.btype as BuildingType)[0]?.b.id ?? null;
          p.x = px; p.y = py;
          const nearestNow = facilitiesOf(ctx, tb.btype as BuildingType)[0]?.b.id ?? null;
          destSwap = { type: tb.btype, nearestNow, nearestStart, swap: nearestNow === a.targetId && nearestStart !== a.targetId };
        }
      } finally { p.x = px; p.y = py; }
    }
    // a1: as if the person were not busy
    p.activity = null;
    const idle = generateOptions(world, p, false, true);
    a1 = idle.options.some((o) => o.key === key);
    idleSameKind = idle.options.some((o) => o.kind === a.kind);
    idleSameItem = items.length > 0 && idle.options.some((o) => o.kind === a.kind && intersects(items, itemsOfOption(p, o)));
    if (!a1) {
      // a2: and without the plans, journeys and promises that this activity serves
      const forPlan = a.data.forPlan as number | undefined, journeyId = a.data.journeyId as number | undefined, commitmentId = a.data.commitmentId as number | undefined;
      const hide = (i: Person['intentions'][number]): boolean => i.id === forPlan || i.id === journeyId || i.stepKey === key || i.journey?.key === key;
      p.intentions = savedIntentions.filter((i) => !hide(i));
      p.commitments = savedCommitments.filter((c) => c.id !== commitmentId);
      const bare = generateOptions(world, p, false, true);
      a2 = bare.options.some((o) => o.key === key);
      p.intentions = savedIntentions;
      p.commitments = savedCommitments;
      // why was it not offered when idle: the planner's own words for what it ruled out
      const idleC = generateOptions(world, p, true, true);
      reasonIdle = norm(idleC.blocked.find((b) => a.targetId !== 0 && b.targetId === a.targetId)?.blocked);
      for (const b of idleC.blocked) {
        if (b.targetId === a.targetId || (b.kind === a.kind && items.some((it) => (b.label ?? '').toLowerCase().includes(it)))) idleBlocked.push(`${(b.blocked ?? '').slice(0, 110)} [${b.kind} ${b.targetId}]`);
        if (idleBlocked.length >= 5) break;
      }
      // the want itself, for raw materials
      if (items.some((it) => it === 'wood' || it === 'stone' || it === 'clay' || it === 'ore')) {
        try {
          materialNeedNow = materialNeeds(idleC).filter((n) => items.includes(n.item)).slice(0, 4).map((n) => `${n.item}:${n.n}:${n.tag}:${n.why.slice(0, 60)}`);
        } catch (e) { errorsSeen.push('materialNeeds: ' + String(e).slice(0, 120)); }
      }
    }
  } catch (e) {
    errorsSeen.push(String(e).slice(0, 200));
  } finally {
    p.activity = savedActivity;
    p.intentions = savedIntentions;
    p.commitments = savedCommitments;
    Object.assign(p.needs, savedNeeds);
  }

  // b: another place for the same thing
  const sameKindOther = ctx.options.some((o) => o.key !== key && o.kind === a.kind && o.targetId !== a.targetId);
  const sameItemOther = items.length ? ctx.options.some((o) => o.key !== key && o.kind === a.kind && o.targetId !== a.targetId && intersects(items, itemsOfOption(p, o))) : null;

  // c: the person's own knowledge of the target, then and now
  const nowB = p.beliefs[a.targetId];
  let c: Row['c'] = null;
  if (snap) {
    const sb = snap.belief, nb = snapBelief(nowB);
    const sum = (x: Record<string, number> | null | undefined): number => { let n = 0; if (x) for (const it of items) n += x[it] ?? 0; return n; };
    const sumAll = (x: Record<string, number> | null | undefined): number => { let n = 0; if (x) for (const v of Object.values(x)) n += v as number; return n; };
    const beliefGone = !!sb && !nb;
    const newerSight = !!sb && !!nb && nb.seen > sb.seen;
    const amountDown = !!sb && !!nb && nb.amount < sb.amount;
    const itemsDown = !!sb && !!nb && (items.length ? sum(nb.items as never) < sum(sb.items as never) : sumAll(nb.items as never) < sumAll(sb.items as never));
    const needDown = !!sb && !!nb && (items.length ? sum(nb.need as never) < sum(sb.need as never) : sumAll(nb.need as never) < sumAll(sb.need as never));
    const heldChanged = !!sb && !!nb && JSON.stringify(nb.ops?.held ?? null) !== JSON.stringify(sb.ops?.held ?? null);
    const outputChanged = !!sb && !!nb && JSON.stringify(nb.ops?.output ?? null) !== JSON.stringify(sb.ops?.output ?? null);
    const f = p.failures[a.targetId];
    const failureNew = !!f && !f.resolved && f.tick > snap.tick && !!recentFailure(world, p, a.targetId, 600);
    const estNow = nowB && ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot', 'rock', 'tree', 'clay_pit', 'ore_vein', 'outcrop'].includes(nowB.kind) ? estimatedAmount(world, nowB) : null;
    const estStart = sb ? sb.amount : null;
    const changed = sb && nb ? changedFields(sb.whole, nb.whole) : [];
    const anyChange = changed.length > 0;
    // units the person may take from a workshop, counted as the planner counts them (site_supply.ts benchStock: earmarks held for others are not theirs), at the start and now
    let takeStart: number | null = null, takeNow: number | null = null;
    if (nowB?.ops && sb?.opsFull && items.length) {
      try {
        const then = { ...clone(nowB), ops: clone(sb.opsFull) as Belief['ops'], items: (clone(sb.items) ?? undefined) as Belief['items'] } as Belief;
        takeStart = 0; takeNow = 0;
        for (const it of items) { takeStart += benchStock(world, then, it as never, then.items?.[it as never] ?? 0, p); takeNow += benchStock(world, nowB, it as never, nowB.items?.[it as never] ?? 0, p); }
      } catch (e) { errorsSeen.push('take: ' + String(e).slice(0, 100)); }
    }
    const storeExcluded = takeNow !== null && takeStart !== null && takeNow < 1 && takeStart >= 1;
    const needMet = !!sb?.need && items.length > 0 && items.every((it) => !(((nb?.need as Record<string, number> | null | undefined) ?? {})[it] > 0)) && items.some((it) => ((sb.need as Record<string, number>)[it] ?? 0) > 0);
    const itemsGone = !nowB?.ops && items.length > 0 && !!sb?.items && sum(nb?.items as never) < 1 && sum(sb.items as never) >= 1;
    const sourceEmpty = estNow !== null && estNow < 1;
    // a person as the target (a gift to a dependant, a chat): what the carer can tell of them now against what they could tell at the start
    let person: PersonChange | null = null;
    if (snap.person && world.byId.get(a.targetId)?.ent === 'person') {
      const now = snapPerson(p, a.targetId), then = snap.person;
      const foodNow = now.carrying.some(isFoodKind), foodThen = then.carrying.some(isFoodKind);
      const lostSight = then.inSight && !now.inSight;
      const nowFed = now.inSight && foodNow && !foodThen;
      const nowAsleep = now.inSight && now.asleep && !then.asleep;
      const nowEased = now.inSight && (then.hungry || then.thirsty || then.cold) && !(now.hungry || now.thirsty || now.cold);
      person = { lostSight, nowFed, nowAsleep, nowEased, excluded: lostSight || nowFed || nowAsleep || nowEased };
    }
    const personExcluded = person?.excluded === true;
    // the person's own sight, since the start, rules the target out: it is gone from their knowledge, a failure was noted there, the person
    // they were heading for is seen fed, asleep or out of sight, or a NEWER SIGHT shows the source empty, the units they may take gone (taken, or
    // earmarked for others), the goods gone, or the site no longer short of what they carry
    const excluded = beliefGone || failureNew || personExcluded || (newerSight && (sourceEmpty || storeExcluded || needMet || itemsGone));
    c = { newerSight, beliefGone, amountDown, itemsDown, needDown, heldChanged, outputChanged, takeStart, takeNow, storeExcluded, needMet, itemsGone, sourceEmpty, person, estNow, estStart, failureNew, anyChange, changed, excluded };
  }

  // the target as the person's own beliefs have it now, and the checks the generators make of such a target
  let tgt: Row['tgt'] = null;
  try {
    if (nowB) {
      const room: Record<string, number> = {}, bench: Record<string, number> = {}, its: Record<string, number> = {}, need: Record<string, number> = {};
      for (const it of items) { room[it] = invRoom(world, p, it as never); its[it] = (nowB.items as Record<string, number> | undefined)?.[it] ?? 0; if (nowB.ops) bench[it] = benchStock(world, nowB, it as never, its[it], p); }
      for (const k of Object.keys(nowB.need ?? {})) need[k] = (nowB.need as Record<string, number>)[k];
      const sourceLike = ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot', 'rock', 'tree', 'clay_pit', 'ore_vein', 'outcrop'].includes(nowB.kind);
      const u = sourceLike ? sourceUsable(ctx, nowB, 1) : null;
      const f = p.failures[a.targetId];
      tgt = {
        kind: nowB.kind, seenAge: world.tick - nowB.seen, amount: nowB.amount, est: sourceLike ? estimatedAmount(world, nowB) : null, items: its, need,
        bench: Object.keys(bench).length ? bench : null, room, usable: u ? (u.ok ? 'ok' : u.why ?? 'no') : null,
        failure: f && !f.resolved ? `${world.tick - f.tick} ticks ago: ${f.reason.slice(0, 60)}` : null, danger: Math.round(dangerAt(ctx, nowB.x, nowB.y) * 100) / 100,
      };
    }
  } catch (e) { errorsSeen.push('tgt: ' + String(e).slice(0, 120)); }

  // d: demand gone; and what the person wanted it for, and whether that still shows
  const d = items.length ? !idleSameItem : null;
  const plan = a.data.forPlan !== undefined ? p.intentions.find((i) => i.id === a.data.forPlan) : undefined;
  const planWants = plan && items.length ? items.some((it) => ((plan.wants as Record<string, number>)[it] ?? 0) > 0) : null;
  const planShort = plan && items.length ? items.some((it) => (p.inv[it as keyof typeof p.inv] ?? 0) < ((plan.wants as Record<string, number>)[it] ?? 0)) : null;
  let hhFoodShort: boolean | null = null;
  try {
    if (items.some((it) => ['berries', 'fruit', 'fish', 'grain', 'bread', 'flour', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat'].includes(it))) {
      const hs = hhState(ctx);
      hhFoodShort = hs.foodStock < hs.foodTarget;
    }
  } catch { /* none */ }

  const cls = a1 ? 'a1_self_excluded' : a2 ? 'a2_held_claims' : sameItemOther ? 'b_same_item_elsewhere' : c?.excluded ? 'c_target_changed' : d ? 'd_demand_gone' : 'e_unexplained';
  const clsAlt = a1 ? 'a1_self_excluded' : a2 ? 'a2_held_claims' : c?.excluded ? 'c_target_changed' : sameItemOther ? 'b_same_item_elsewhere' : d ? 'd_demand_gone' : 'e_unexplained';

  const row: Row = {
    tick: world.tick, person: p.id, adult, kind: a.kind, phase: a.phase, key: key!, target: a.targetId, purpose: typeof a.data.purpose === 'string' ? a.data.purpose : null,
    items, progress: progressOf(p, a, snap), sinceStart: world.tick - a.start, walked,
    switchWhy: s.why, ranWhy: String(a.data.why ?? '').slice(0, 160), replKind: best.kind, replKey: best.key,
    replSameKindItem: best.kind === a.kind && items.length > 0 && intersects(items, itemsOfOption(p, best)), replPurpose: best.tag ?? null,
    tests: { a1, a2, bItem: sameItemOther, bKind: sameKindOther, c: c ? c.excluded : null, d, idleSameKind, regenPresent, f, g, gf, h, destSwap, fOnly, startSnap: snap ? (snap.loadedRunning ? 'load' : 'start') : 'none' },
    c, tgt,
    cf: {
      storedUtil: Math.round(a.utility * 10) / 10, bestUtil: Math.round(best.util * 10) / 10,
      wouldSwitchStored: best.util > a.utility * (1.08 + 0.35 * (a.duration > 0 ? Math.min(1, a.progress / a.duration) : 0)) * SWITCH_MARGIN + 3,
      fUtil: fUtil === null ? null : Math.round(fUtil * 10) / 10,
      wouldSwitchF: fUtil === null ? null : best.util > fUtil * (1.08 + 0.35 * (a.duration > 0 ? Math.min(1, a.progress / a.duration) : 0)) * SWITCH_MARGIN + 3,
    },
    drives: {
      start: snap ? { hunger: driveOf(p, 'hunger', snap.needs), thirst: driveOf(p, 'thirst', snap.needs), energy: driveOf(p, 'energy', snap.needs) } : null,
      now: { hunger: Math.round(ctx.drives.hunger), thirst: Math.round(ctx.drives.thirst), energy: Math.round(ctx.drives.energy) },
      nightChanged: snap ? snap.night !== ctx.night : null, replNeed: best.need,
    },
    want: {
      planActive: plan ? plan.status === 'active' : a.data.forPlan !== undefined ? false : null, planWantsItem: planWants, planShort,
      need: a.need, needAtStart: snap?.need ?? null, needNow: a.need ? Math.round(p.needs[a.need]) : null, hhFoodShort, materialNeedNow,
    },
    blockedSame, idleBlocked, scopeBlocked, reason: reasonRun ?? reasonIdle, class: cls, classAlt: clsAlt, group: groupOf(a.kind), cause: '',
    bounce: { checked: true, censored: false, within: false, ticks: null, by: null },
  };
  if (nextSampleIndex(cls) < (cls === 'e_unexplained' ? 400 : 40)) row.top5 = s.ranked.slice(0, 5).map((o) => ({ key: o.key, kind: o.kind, util: Math.round(o.util * 10) / 10 }));
  row.cause = causeOf(row);
  rows.push(row);
  const q = pendingBounce.get(p.id) ?? [];
  q.push(row);
  pendingBounce.set(p.id, q);

  // purity of the whole analysis
  purity.checked++;
  if (hashWorld(world) !== h0) purity.hashFail++;
  if (s0 !== null) {
    purity.serialChecked++;
    if (serializeWorld(world) !== s0) purity.serialFail++;
  }
}
const sampleCount: Counts = {};
/** how many rows of this class have been kept with their ranked list so far (every unexplained one keeps it, a few of each other class) */
function nextSampleIndex(cls: string): number { const n = sampleCount[cls] ?? 0; sampleCount[cls] = n + 1; return n; }

function progressOf(p: Person, a: Activity, snap: StartSnap | undefined): number | null {
  if (a.phase === 'work') return a.duration > 0 ? Math.min(1, a.progress / a.duration) : null;
  if (!snap) return null;
  const total = Math.hypot(snap.spotX - snap.x, snap.spotY - snap.y);
  if (total < 0.5) return null;
  return Math.max(0, Math.min(1, 1 - Math.hypot(a.spotX - p.x, a.spotY - p.y) / total));
}

// ───────────────────────────────────────────────────── the world's own hooks (start snapshots and the bounce) ─────────────────────────────────────────────────────
function installHooks(world: World): void {
  world.hooks = {
    onActivityStart(p, a) {
      takeSnap(p, a, false);
      const q = pendingBounce.get(p.id);
      if (!q) return;
      const now = world.tick;
      const aItems = itemsOfActivity(p, a);
      const keep: Row[] = [];
      for (const r of q) {
        if (now - r.tick > BOUNCE_WINDOW) continue; // window over, no bounce
        if (now === r.tick && a.data.optKey === r.replKey && !r.sawReplacement) { r.sawReplacement = true; keep.push(r); continue; }
        if (!r.bounce.within) {
          const byKey = a.data.optKey === r.key;
          const byKindItem = a.kind === r.kind && r.items.length > 0 && intersects(r.items, aItems);
          if (byKey || byKindItem) { r.bounce.within = true; r.bounce.ticks = now - r.tick; r.bounce.by = byKey ? 'key' : 'kindItem'; continue; }
        }
        keep.push(r);
      }
      if (keep.length) pendingBounce.set(p.id, keep); else pendingBounce.delete(p.id);
    },
    onActivityEnd(_p, a) { starts.delete(a.id); },
  };
  for (const p of world.persons) if (p.alive && p.activity) takeSnap(p, p.activity, true);
}

// ───────────────────────────────────────────────────── run ─────────────────────────────────────────────────────
const t0 = Date.now();
if (!noHook) {
  installHooks(w);
  probe.on = true;
  probe.onSwitch = onSwitch;
}
while (w.tick < stopTick) {
  if (!noHook) for (const p of w.persons) if (p.alive && p.activity && ageYears(w, p) >= 12 && timeCategory(p, w.tick) === 'travel') adultWalkTicks++;
  stepWorld(w);
}
probe.on = false;
probe.onSwitch = null;
const finalHash = hashWorld(w);
// a stricter equality than hashWorld, which looks at positions, needs, packs and activities only: the whole serialised world, folded to 32 bits
const finalSerial = (() => { const t = serializeWorld(w); let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return `${t.length}:${h.toString(16)}`; })();
const seconds = (Date.now() - t0) / 1000;
if (noHook) {
  const line = JSON.stringify({ noHook: true, seed: w.settings.seed, loaded, startTick, endTick: w.tick, rulesVersion: w.settings.rulesVersion ?? null, finalHash, finalSerial, seconds });
  console.log(line);
  if (out) writeFileSync(out, line + '\n');
  process.exit(0);
}

// ───────────────────────────────────────────────────── summary ─────────────────────────────────────────────────────
for (const r of rows) {
  const censored = r.tick + BOUNCE_WINDOW > w.tick;
  if (!r.bounce.within && censored) r.bounce.censored = true;
}
const classes = ['a1_self_excluded', 'a2_held_claims', 'b_same_item_elsewhere', 'c_target_changed', 'd_demand_gone', 'e_unexplained'];
interface Cell { n: number; adultN: number; bounceN: number; bounceByKey: number; bounceDenom: number; walked: number; sameKindItemRepl: number }
const emptyCell = (): Cell => ({ n: 0, adultN: 0, bounceN: 0, bounceByKey: 0, bounceDenom: 0, walked: 0, sameKindItemRepl: 0 });
function tally(group: (r: Row) => string, clsOf: (r: Row) => string = (r) => r.class): Record<string, Cell> {
  const t: Record<string, Cell> = {};
  for (const r of rows) {
    const cell = (t[`${group(r)}|${clsOf(r)}`] ??= emptyCell());
    cell.n++;
    if (r.adult) { cell.adultN++; cell.walked += r.walked; }
    if (!r.bounce.censored) { cell.bounceDenom++; if (r.bounce.within) { cell.bounceN++; if (r.bounce.by === 'key') cell.bounceByKey++; } }
    if (r.replSameKindItem) cell.sameKindItemRepl++;
  }
  return t;
}
const byKindPhase = tally((r) => `${r.kind}|${r.phase}`);
const byClass = tally(() => 'all');
const byClassAlt = tally(() => 'all', (r) => r.classAlt);
const byCauseGroup = tally((r) => r.group, (r) => r.cause);
const byCauseKindPhase = tally((r) => `${r.kind}|${r.phase}`, (r) => r.cause);
const byCausePooled = tally(() => 'all', (r) => r.cause);
const byCauseWalkGW = tally((r) => (r.phase === 'travel' && (r.kind === 'gather' || r.kind === 'withdraw') ? r.kind : 'other-kinds-or-phases'), (r) => r.cause);
const byKindClass = tally((r) => r.kind);
const walkRows = rows.filter((r) => r.phase === 'travel' && (r.kind === 'gather' || r.kind === 'withdraw'));
const byClassWalk = (() => { const t: Record<string, Cell> = {}; for (const r of walkRows) { const c = (t[`${r.kind}|${r.class}`] ??= emptyCell()); c.n++; if (r.adult) { c.adultN++; c.walked += r.walked; } if (!r.bounce.censored) { c.bounceDenom++; if (r.bounce.within) { c.bounceN++; if (r.bounce.by === 'key') c.bounceByKey++; } } } return t; })();
const flag = (f: (r: Row) => boolean): number => rows.filter(f).length;
const tests = {
  absentRows: rows.length,
  a1: flag((r) => r.tests.a1), a2OnlyWhenNotA1: flag((r) => r.tests.a2 === true),
  bItem: flag((r) => r.tests.bItem === true), bKind: flag((r) => r.tests.bKind),
  cExcluded: flag((r) => r.tests.c === true), cNoSnapshot: flag((r) => r.tests.startSnap === 'none'), cSnapAtLoad: flag((r) => r.tests.startSnap === 'load'),
  cNewerSight: flag((r) => r.c?.newerSight === true), cBeliefGone: flag((r) => r.c?.beliefGone === true), cFailureNew: flag((r) => r.c?.failureNew === true), cAnyChange: flag((r) => r.c?.anyChange === true),
  dDemandGone: flag((r) => r.tests.d === true), dNotApplicable: flag((r) => r.tests.d === null),
  bAndC: flag((r) => r.tests.bItem === true && r.tests.c === true), bAndD: flag((r) => r.tests.bItem === true && r.tests.d === true),
  wouldSwitchAnywayStored: flag((r) => r.cf.wouldSwitchStored), fWouldSwitchAnyway: flag((r) => r.cf.wouldSwitchF === true), fWouldHold: flag((r) => r.cf.wouldSwitchF === false),
  hMovedBack: flag((r) => r.tests.h === true), destSwap: flag((r) => r.tests.destSwap?.swap === true), destSwapOnly: flag((r) => r.tests.destSwap?.swap === true && r.tests.h !== true),
  gClockDrift: flag((r) => r.tests.g === true), gfBoth: flag((r) => r.tests.gf === true), gAndNotF: flag((r) => r.tests.g === true && r.tests.f !== true),
  fNeedsDrift: flag((r) => r.tests.f === true), fApplicable: flag((r) => r.tests.f !== null), fAndE: flag((r) => r.tests.f === true && r.class === 'e_unexplained'),
  scopeBlocked: flag((r) => r.scopeBlocked), regenPresent: flag((r) => r.tests.regenPresent),
  replSameKindItem: flag((r) => r.replSameKindItem),
  foundEmptyReason: flag((r) => /empty/.test(r.switchWhy)),
};
const walkShare = (cls: string): number | null => (adultWalkTicks ? Math.round((rows.filter((r) => r.adult && r.class === cls).reduce((s, r) => s + r.walked, 0) / adultWalkTicks) * 100000) / 1000 : null);
const walkShareByClass: Record<string, number | null> = {};
for (const c of classes) walkShareByClass[c] = walkShare(c);
const fOnlyByKind: Record<string, Counts> = {};
for (const r of rows) if (r.tests.fOnly) { const c = (fOnlyByKind[`${r.group}:${r.kind}`] ??= {}); bump(c, 'rows'); for (const k of ['hunger', 'thirst', 'energy'] as const) if (r.tests.fOnly[k]) bump(c, `restoring ${k} alone brings the key back`); if (!r.tests.fOnly.hunger && !r.tests.fOnly.thirst && !r.tests.fOnly.energy) bump(c, 'no single need alone does'); }
const reasonsByGroup: Record<string, Counts> = {};
for (const r of rows) if (r.cause === 'planner_reason' || r.cause === 'scope_window') bump((reasonsByGroup[r.group] ??= {}), `${r.kind}: ${r.reason}`);
const sightChangedFields: Record<string, Counts> = {};
for (const r of rows) if (r.cause === 'sight_changed_other' && r.c) for (const f of r.c.changed) bump((sightChangedFields[`${r.group}:${r.kind}`] ??= {}), f);
const newerSightDetail: Record<string, Counts> = {};
for (const r of rows) if (r.cause === 'newer_sight' && r.c) {
  const c = (newerSightDetail[`${r.kind}|${r.phase}`] ??= {});
  bump(c, 'rows');
  for (const k of ['beliefGone', 'failureNew', 'storeExcluded', 'needMet', 'itemsGone', 'sourceEmpty'] as const) if (r.c[k]) bump(c, k);
  if (r.c.person) for (const k of ['lostSight', 'nowFed', 'nowAsleep', 'nowEased'] as const) if (r.c.person[k]) bump(c, 'person.' + k);
  if (r.c.storeExcluded) { if (r.c.heldChanged) bump(c, 'store: earmarks (held) changed'); if (r.c.outputChanged) bump(c, 'store: output changed'); if (r.c.itemsDown) bump(c, 'store: believed items down'); }
}
const walkShareByCause: Record<string, number | null> = {};
for (const c of ['self', 'held_claims', 'newer_sight', 'needs_drift', 'clock_drift', 'needs_and_clock', 'target_became_dest', 'walk_moved_other', 'scope_window', 'planner_reason', 'sight_changed_other', 'reaimed', 'demand_gone', 'unexplained']) walkShareByCause[c] = adultWalkTicks ? Math.round((rows.filter((r) => r.adult && r.cause === c).reduce((x, r) => x + r.walked, 0) / adultWalkTicks) * 100000) / 1000 : null;
const samples: Record<string, Row[]> = {};
for (const c of classes) {
  const all = rows.filter((r) => r.class === c);
  const spread = (xs: Row[], cap: number): Row[] => { const step = Math.max(1, Math.floor(xs.length / cap)); return xs.filter((_, i) => i % step === 0).slice(0, cap); };
  // spread the picks through the run, not only the first ones; for the unexplained, two thirds from what people were working at
  samples[c] = c === 'e_unexplained'
    ? [...spread(all.filter((r) => r.group === 'work'), Math.round(SAMPLE_CAP_E * 2 / 3)), ...spread(all.filter((r) => r.group !== 'work'), Math.round(SAMPLE_CAP_E / 3))]
    : spread(all, SAMPLE_CAP_OTHER);
}
// the rows no test explains at all (cause 'unexplained'), full: the 30 samples asked for
const unexplainedAll = rows.filter((r) => r.cause === 'unexplained');
const spreadOf = (xs: Row[], cap: number): Row[] => { const step = Math.max(1, Math.floor(xs.length / cap)); return xs.filter((_, i) => i % step === 0).slice(0, cap); };
const samplesUnexplained = [...spreadOf(unexplainedAll.filter((r) => r.group === 'work'), 20), ...spreadOf(unexplainedAll.filter((r) => r.group !== 'work'), 10)];
const presentAll: Counts = {};
for (const [k, v] of Object.entries(switchesAll)) presentAll[k] = v;
const summary = {
  script: 'scripts/option_absent_diagnostic.ts',
  seed: w.settings.seed, loaded: loaded || null, startDay, startTick, endTick: w.tick, days, rulesVersion: w.settings.rulesVersion ?? null, arrivals: w.settings.immigration,
  people: w.persons.filter((p) => p.alive).length, finalHash, finalSerial, seconds, adultWalkTicks,
  purity, regen, errors: errorsSeen.slice(0, 10),
  switchesByKindPhaseStatus: switchesAll,
  idleCheckOnEveryTenthPresentSwitch: idleCheckOnPresent,
  walkedTicksOnAbandonedLegByStatusAdults: walkedByStatus,
  tests,
  needsDriftWhichNeed: fOnlyByKind,
  newerSightDetail,
  sightChangedFieldsOther: sightChangedFields,
  plannerReasons: reasonsByGroup,
  causesPooled: byCausePooled, causesByGroup: byCauseGroup, causesByKindPhase: byCauseKindPhase, causesWalkingGatherWithdraw: byCauseWalkGW,
  classesByKindPhase: byKindPhase, classesPooled: byClass, classesPooledAltOrder: byClassAlt, classesByKind: byKindClass, classesWalkingGatherWithdraw: byClassWalk,
  walkingTicksThrownAwayShareOfAdultWalking_percent: walkShareByClass,
  walkingTicksThrownAwayShareOfAdultWalkingByCause_percent: walkShareByCause,
  samples,
  samplesUnexplained,
  note: 'classes in order a1, a2, b, c, d, e; Alt order puts c before b. bounce = same optKey or same kind for the same item started again within 600 ticks after the switch (replacement itself excluded); censored rows (window cut by the end of the run) are left out of the bounce denominator.',
};
const text = JSON.stringify(summary, null, 1);
if (out) writeFileSync(out, text);
if (out && writeRows) writeFileSync(out + '.rows.jsonl', rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(text);
