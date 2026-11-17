// SCRATCH ONLY (trip probe, 17 November 2026). Read-only observer: it reads people, activities, households, buildings and packs, keeps
// its own tallies, and writes nothing to the world or to anything reachable from it. It never calls the world's random generator (it
// calls no function that does) and never changes the order of any sim collection. Call `sampleTick(world)` once a tick, before the
// world steps (the same moment TimeBudget.sampleTick and DayShape.sampleTick read), `finish(world)` once after the last step, then
// `report()` and `tripRows()`. `attach(world)` chains an end-of-activity hook (world.hooks.onActivityEnd, types.ts), exactly as
// TimeBudget.attach does; the hook only copies what it is handed.
//
// WHAT A WALK IS. A maximal run of consecutive samples for one person in which timeCategory (time_budget.ts, the function TimeBudget
// calls) is 'travel' and the activity identity does not change. The sim names an activity by a unique id (activities.ts newActivity,
// `world.nextId++`). The id alone is not enough: social.ts openConversation rewrites kind (socialize becomes converse) and
// exchange_journeys.ts rewrites kind and target on the same id, so the identity used here is id + kind + targetId. A walk therefore ends when
// the category stops being travel (arrival into the work phase, a pause on a.blocked, the activity being suspended for a conversation,
// the activity ending) or when id, kind or target changes. One activity can have several walks (legIndex); a walk that is followed
// later by another walk of the same activity is labelled continued_same_activity and the later walk carries the real outcome.
//
// MOVEMENT. A walking tick is a start-of-tick state, as TimeBudget counts it. The step that follows moves the person, and the next
// sample shows where they are, so a walk's movement is the displacement from the sample of its first tick to the first sample after
// its last tick. (When an activity is replaced inside a step, that step's movement lands on the walk whose tick it was; this is a
// stated convention, not a measurement of intent.)
//
// OUTCOMES (decided from state after the walk, plus the sim's own end-of-activity record):
//   arrived_did_job          the same activity reached its work phase and work was seen: a sample showed phase 'work', or it ended in
//                            success, or it ended with progress or cycle above zero (activities.ts beginWork sets phase 'work' before
//                            the handler's begin runs, so a begin that refuses leaves progress 0 and cycle 0).
//   arrived_no_job           reached the end of its path (the sim's arrival test, activities.ts stepTravel) or the work phase, and the
//                            activity ended with no work seen and no progress or cycle. The sim's own words are kept in endDetail.
//   switched_mid_walk        the activity ended before arrival with the sim's outcome 'interrupted' (any detail except 'died'). The sim's
//                            detail string (for example 'something better came up', 'switched to something else') is kept; this
//                            observer does not decide which of those are changes of mind. toKind is the kind of what the person is doing at the next
//                            sample.
//   gave_up_before_arrival   the activity ended before arrival with the sim's outcome 'failed' or 'partial' ('path blocked',
//                            'took too long', and so on). Not a switch, and not an arrival.
//   ended_other              the person died, the activity reported success before arrival, or it left with no end record.
//   continued_same_activity  the walk stopped but the same activity walked again later (pause cause recorded).
//   censored                 still open at the end of the run (still walking, or paused and unresolved).
// Walks that were already under way at the first sample are flagged leftCensored and kept out of distributions and outcome shares.
import { readFileSync } from 'node:fs';
import { AGE_ADULT, AGE_CHILD, AGE_ELDER, BASE_SPEED, BASKET_BONUS, CARRY_CAP, CART_SPEED_EMPTY, CART_SPEED_LOADED, DAY, MIN_COMMIT, REVIEW_EVERY, SWITCH_MARGIN, WEIGHT } from '../../src/sim/constants';
import { foodUnits, weightOf } from '../../src/sim/economy';
import { ageYears, carryCap, stageOf } from '../../src/sim/people';
import { CHILD_PACE, LITTLE_PACE } from '../../src/sim/child_pace';
import type { Activity, Household, ItemKind, Person, World } from '../../src/sim/types';
import { lifeGroupOf } from './day_shape';
import { timeCategory } from './time_budget';

export type Outcome = 'arrived_did_job' | 'arrived_no_job' | 'switched_mid_walk' | 'gave_up_before_arrival' | 'ended_other' | 'continued_same_activity' | 'censored';
export const OUTCOMES: readonly Outcome[] = ['arrived_did_job', 'arrived_no_job', 'switched_mid_walk', 'gave_up_before_arrival', 'ended_other', 'continued_same_activity', 'censored'];
/** kinds that take goods up into the pack (gain) or put them down out of it (loss); cart_haul loads ride in the cart, not the pack, so it is not here */
export const HAULING_GAIN: readonly string[] = ['gather', 'withdraw', 'fetch_water', 'harvest'];
export const HAULING_LOSS: readonly string[] = ['deposit', 'haul'];
export const HAULING_KINDS: readonly string[] = [...HAULING_GAIN, ...HAULING_LOSS];
/** two walks to the same kind of place count as a repeat when their targets are this close (tiles) */
export const SAME_PLACE_TILES = 2;

const r2 = (x: number): number => Math.round(x * 100) / 100;
const r3 = (x: number): number => Math.round(x * 1000) / 1000;
const bump = (r: Record<string, number>, k: string, n = 1): void => { r[k] = (r[k] ?? 0) + n; };
const share = (n: number, d: number): number | null => (d > 0 ? r3(n / d) : null);
const sum = (v: number[]): number => { let s = 0; for (const x of v) s += x; return s; };

/** p10, p25, median, p75, p90, mean (and n, min, max) by linear interpolation between order statistics (type 7); null fields when empty */
export function dist(v: number[]) {
  if (!v.length) return { n: 0, mean: null, min: null, p10: null, p25: null, median: null, p75: null, p90: null, max: null };
  const s = [...v].sort((a, b) => a - b);
  const q = (f: number): number => { const x = (s.length - 1) * f, lo = Math.floor(x), hi = Math.ceil(x); return s[lo] + (s[hi] - s[lo]) * (x - lo); };
  return { n: s.length, mean: r3(sum(s) / s.length), min: r3(s[0]), p10: r3(q(0.1)), p25: r3(q(0.25)), median: r3(q(0.5)), p75: r3(q(0.75)), p90: r3(q(0.9)), max: r3(s[s.length - 1]) };
}

export interface Pack { units: number; food: number; wood: number; weight: number; cap: number; items: Record<string, number> }
/** a copy of what a person carries: counts only, so nothing here points back into the world */
export function snapPack(world: World, p: Person): Pack {
  const items: Record<string, number> = {};
  let units = 0;
  for (const k in p.inv) { const n = p.inv[k as ItemKind] ?? 0; if (n > 0) { items[k] = n; units += n; } }
  return { units, food: foodUnits(p.inv), wood: items.wood ?? 0, weight: r3(weightOf(p.inv)), cap: carryCap(world, p), items };
}

interface EndInfo {
  tick: number; outcome: string; detail: string; kind: string; phase: string; pathTries: number; pi: number; pathLen: number;
  progress: number; cycle: number; amount: number; moved: Record<string, number> | null; pack: Pack;
}

interface Trip {
  seq: number; person: number; stage: 'under_12' | '12_and_over'; simStage: string;
  actId: number; legIndex: number; actStart: number; actAgeAtStart: number; leftCensored: boolean;
  kind: string; tgtId: number; targetType: string; kindAfter: string; group: string; plan: string; need: string; sub: string; run: boolean; startIndoors: boolean;
  startTick: number; lastTick: number; ticks: number;
  sx: number; sy: number; ex: number; ey: number; tiles: number; walked: number;
  hasTarget: boolean; tx: number; ty: number; txEnd: number; tyEnd: number;
  spotX: number; spotY: number; spotEndX: number; spotEndY: number;
  home: { x: number; y: number } | null; hasHome: boolean;
  hunger: number; planned: number | null;
  packStart: Pack; packEnd: Pack | null; packAfter: Pack | null; packAfterBasis: string;
  outcome: Outcome | ''; evidence: string; pauseCause: string;
  endOutcome: string; endDetail: string; endTick: number; gapToEnd: number | null; toKind: string;
  actCycle: number | null; actProgress: number | null; actMoved: Record<string, number> | null;
}

interface DayRec { person: number; day: number; samples: number; awake: number; changes: number }
interface PState {
  open: Trip | null; pending: Trip[]; lastX: number; lastY: number; prevTravel: boolean; prevActId: number; prevSuspId: number; dayRec: DayRec | null;
}

// ───────────────────────────── source facts ─────────────────────────────
interface FactSpec { id: string; topic: string; file: string; after?: string; find: string; span?: number; value?: unknown }
const SIM = 'src/sim/';
function factSpecs(): FactSpec[] {
  return [
    // what a walk and an activity are
    { id: 'activity_id', topic: 'every activity gets a unique id when it is built', file: SIM + 'activities.ts', after: 'export function newActivity', find: 'id: world.nextId++,' },
    { id: 'activity_phase_type', topic: 'an activity is in the travel phase or the work phase', file: SIM + 'types.ts', after: 'export interface Activity', find: "phase: 'travel' | 'work';" },
    { id: 'travel_category', topic: "timeCategory calls a non-blocked activity in the travel phase 'travel' (the test TimeBudget and this observer share)", file: 'scripts/observers/time_budget.ts', find: "if (a.phase === 'travel') return 'travel';" },
    { id: 'blocked_is_waiting', topic: "a blocked activity is 'waiting', so a pause on a.blocked ends a walk", file: 'scripts/observers/time_budget.ts', find: "if (a.blocked) return 'waiting';" },
    { id: 'kind_rewritten_converse', topic: 'a socialize activity is rewritten into converse on the same id (identity must include kind)', file: SIM + 'social.ts', after: 'function openConversation', find: "actA.kind = 'converse';" },
    { id: 'kind_target_rewritten_exchange', topic: 'an exchange_journey activity is rewritten into socialize with a new target on the same id', file: SIM + 'exchange_journeys.ts', find: "a.kind='socialize';a.targetId=q.id;" },
    { id: 'suspend', topic: 'a person spoken to has the activity put on hold (p.suspended); work reverts to travel with the path cleared', file: SIM + 'activities.ts', after: 'export function suspendActivity', find: 'p.suspended = a;' },
    { id: 'suspend_reverts_to_travel', topic: 'suspending a work-phase activity sets it back to the travel phase', file: SIM + 'activities.ts', after: 'export function suspendActivity', find: "a.phase = 'travel';" },
    { id: 'resume', topic: 'a held activity is picked up again on the same object (same id)', file: SIM + 'activities.ts', after: 'export function resumeSuspended', find: 'p.activity = a;' },
    // arrival and the work phase
    { id: 'arrival_test', topic: 'the sim\'s arrival test: the path is used up', file: SIM + 'activities.ts', after: 'function stepTravel', find: "return a.pi >= a.path.length && !a.data.floodRetreat ? 'arrived' : 'moving';" },
    { id: 'path_ends_at_spot', topic: 'the last waypoint of a path is the exact stand spot, so arriving means standing on a.spotX, a.spotY', file: SIM + 'pathfinding.ts', find: 'pts[pts.length - 2] = opts.exact.x;' },
    { id: 'snap_to_waypoint', topic: 'a step that reaches a waypoint puts the walker exactly on it', file: SIM + 'activities.ts', after: 'function stepTravel', find: 'if (d <= remaining) {', span: 3 },
    { id: 'arrival_begins_work', topic: 'on arrival the work phase begins in the same step, and work runs the same tick', file: SIM + 'activities.ts', after: 'recordRouteArrival(world,p,a);', find: 'beginWork(world, p, a);', span: 2 },
    { id: 'begin_work_phase', topic: "beginWork sets the phase to 'work' before the handler's begin runs", file: SIM + 'activities.ts', after: 'function beginWork', find: "a.phase = 'work';" },
    { id: 'begin_refusal', topic: "a handler's begin that returns a string ends the activity 'failed' with that reason, with progress still 0", file: SIM + 'activities.ts', after: 'function beginWork', find: 'const err = h.begin(world, p, a);', span: 5 },
    { id: 'too_long', topic: "an activity past its expiry ends 'failed' (or 'partial' with cycles done) with 'took too long'", file: SIM + 'activities.ts', after: 'export function stepActivity', find: "endActivity(world, p, a.cycle > 0 ? 'partial' : 'failed', 'took too long');" },
    { id: 'path_blocked', topic: "a walk the sim cannot continue ends 'failed' with the blocked reason", file: SIM + 'activities.ts', after: 'if (r === ', find: "endActivity(world, p, 'failed', a.blocked || 'path blocked');" },
    { id: 'travel_blocker', topic: 'a handler may make a walk wait (a.blocked set, no movement)', file: SIM + 'activities.ts', after: 'export function stepActivity', find: 'const waiting = h.travelBlocker?.(world,p,a);' },
    // the record of how an activity ended
    { id: 'end_hook_call', topic: 'the single place an activity ends; the hook is called with outcome and detail', file: SIM + 'activities.ts', after: 'export function endActivity', find: 'world.hooks?.onActivityEnd?.(p, a, outcome, detail);' },
    { id: 'end_hook_type', topic: 'the hook is observation only, never saved', file: SIM + 'types.ts', find: 'onActivityEnd?: (p: Person, a: Activity, outcome:' },
    { id: 'switch_by_start', topic: "starting a new activity over a running one ends the old one 'interrupted' with 'switched to something else'", file: SIM + 'activities.ts', after: 'export function startActivity', find: "endActivity(world, p, 'interrupted', 'switched to something else');" },
    { id: 'review_switch_rule', topic: 'the review: a new option must beat the current one by SWITCH_MARGIN and 3 points, and the minimum commitment must be over', file: SIM + 'decision.ts', after: 'export function reviewActivity', find: 'const better = !external && best.util > cur * SWITCH_MARGIN + 3;' },
    { id: 'review_reason', topic: "the reason a review writes when it drops the current activity ('danger nearby', 'a more urgent need', FOUND_EMPTY_REASON or 'something better came up')", file: SIM + 'decision.ts', after: 'export function reviewActivity', find: "const why = danger ? 'danger nearby'" },
    { id: 'review_ends_old', topic: "the review ends the old activity 'interrupted' with that reason, then starts the new one", file: SIM + 'decision.ts', after: 'export function reviewActivity', find: "endActivity(world, p, 'interrupted', why);" },
    { id: 'death_abort', topic: "a death ends the activity 'interrupted' with detail 'died'", file: SIM + 'lifecycle.ts', find: "abortActivity(world, p, 'died');" },
    { id: 'review_interval', topic: 'how often a person reconsiders what to do (ticks)', file: SIM + 'constants.ts', find: 'export const REVIEW_EVERY', value: REVIEW_EVERY },
    { id: 'min_commit', topic: 'default minimum commitment of an activity (ticks from its start)', file: SIM + 'constants.ts', find: 'export const MIN_COMMIT', value: MIN_COMMIT },
    { id: 'switch_margin', topic: 'a new option must beat the current one by this factor', file: SIM + 'constants.ts', find: 'export const SWITCH_MARGIN', value: SWITCH_MARGIN },
    { id: 'step_order', topic: 'within a person\'s step the review (which may switch) runs before the activity is stepped (which moves)', file: SIM + 'world.ts', after: 'function stepPerson', find: '} else if (tick >= p.nextThink || urgentInterrupt(world, p)) {', span: 4 },
    { id: 'tick_increment', topic: 'the world tick advances after every person has stepped, so a start-of-tick sample sees the result of the whole previous step', file: SIM + 'world.ts', after: 'export function stepWorld', find: 'world.tick++;' },
    // age, speed, load
    { id: 'age_child', topic: 'under this age (years) a person is a child; the headline stage split is under 12 versus 12 and over', file: SIM + 'constants.ts', find: 'export const AGE_CHILD', value: AGE_CHILD },
    { id: 'age_adult', topic: 'youth to adult', file: SIM + 'constants.ts', find: 'export const AGE_ADULT', value: AGE_ADULT },
    { id: 'age_elder', topic: 'adult to elder', file: SIM + 'constants.ts', find: 'export const AGE_ELDER', value: AGE_ELDER },
    { id: 'base_speed', topic: 'base walking speed in tiles per tick', file: SIM + 'constants.ts', find: 'export const BASE_SPEED', value: BASE_SPEED },
    { id: 'speed_start', topic: 'moveSpeed starts from the base speed', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 'let s = BASE_SPEED;' },
    { id: 'speed_age', topic: 'age: a child walks at childPace, a youth at 0.97, an elder at 0.8', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: "s *= st === 'child' ? childPace(world, p)" },
    { id: 'speed_little_pace', topic: 'a child under seven walks at this share of a grown person (rules 212 and later)', file: SIM + 'child_pace.ts', find: 'export const LITTLE_PACE', value: LITTLE_PACE },
    { id: 'speed_child_pace', topic: 'a child of seven to eleven walks at this share', file: SIM + 'child_pace.ts', find: 'export const CHILD_PACE', value: CHILD_PACE },
    { id: 'speed_load', topic: 'load: up to 22 percent slower at a full pack by weight', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 's *= 1 - 0.22 * Math.min(1, weightOf(p.inv) / cap);' },
    { id: 'speed_health', topic: 'health below 70 slows the walker', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 'if (p.health < 70) s *=' },
    { id: 'speed_injury', topic: 'injury slows the walker', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 'if (p.injury) s *= injuryFactor(world, p);' },
    { id: 'speed_terrain', topic: 'terrain under the walker (shallows, forest, wear)', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 's *= terrainSpeed(world, p.x, p.y);' },
    { id: 'terrain_shallow', topic: 'shallow water is 0.6 of full speed', file: SIM + 'pathfinding.ts', after: 'export function terrainSpeed', find: 'if (t === T.SHALLOW) s = 0.6;' },
    { id: 'terrain_forest', topic: 'forest is 0.92 of full speed', file: SIM + 'pathfinding.ts', after: 'export function terrainSpeed', find: 'else if (t === T.FOREST) s = 0.92;' },
    { id: 'terrain_wear', topic: 'a worn path or road is up to 22 percent faster', file: SIM + 'pathfinding.ts', after: 'export function terrainSpeed', find: 's *= 1 + 0.22 * Math.min(1, world.wear[i]);' },
    { id: 'speed_flood', topic: 'flooded ground slows the walker', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 's *= floodSpeed(world,p);' },
    { id: 'speed_cart', topic: 'pulling a cart', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 'if (p.cartId) s *= cartSpeedFactor(world, p);' },
    { id: 'cart_loaded', topic: 'speed with a loaded cart', file: SIM + 'constants.ts', find: 'export const CART_SPEED_LOADED', value: CART_SPEED_LOADED },
    { id: 'cart_empty', topic: 'speed with an empty cart', file: SIM + 'constants.ts', find: 'export const CART_SPEED_EMPTY', value: CART_SPEED_EMPTY },
    { id: 'speed_dark', topic: 'darkness', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 'if (world.light < 0.3) s *= 0.93;' },
    { id: 'speed_storm', topic: 'storm', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 's *= 1 - 0.16 * world.weather.storm;' },
    { id: 'speed_tired', topic: 'tiredness', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 'if (p.needs.energy < 15) s *= 0.82;' },
    { id: 'speed_run', topic: 'running', file: SIM + 'activities.ts', after: 'export function moveSpeed', find: 'if (run) s *= 1.42;' },
    { id: 'carry_cap_table', topic: 'carrying capacity by stage, in WEIGHT units (not item counts)', file: SIM + 'constants.ts', find: 'export const CARRY_CAP', value: CARRY_CAP },
    { id: 'basket_bonus', topic: 'a basket adds this much capacity', file: SIM + 'constants.ts', find: 'export const BASKET_BONUS', value: BASKET_BONUS },
    { id: 'carry_cap_fn', topic: 'carryCap: the stage capacity (elders scaled in a rich world) plus the basket bonus', file: SIM + 'people.ts', find: 'export function carryCap', span: 6 },
    { id: 'weight_table', topic: 'what one unit of each item weighs (wood 2, stone 3, berries 1, water 1.5 ...)', file: SIM + 'constants.ts', find: 'export const WEIGHT' },
    { id: 'weight_of', topic: 'weightOf: the sum of count x weight in a container', file: SIM + 'economy.ts', find: 'export function weightOf', span: 4 },
    { id: 'room_for', topic: 'room for k more units is the spare weight divided by one unit\'s weight', file: SIM + 'economy.ts', find: 'export function roomFor', span: 3 },
    // hauling handlers and where the unit counts are kept
    { id: 'gather_cycle', topic: 'gather: one unit into the pack per finished cycle, counted in a.cycle', file: SIM + 'act_resource.ts', after: 's.lastTakeTick = world.tick;', find: 'a.cycle++;' },
    { id: 'gather_into_pack', topic: 'gather: the unit goes from the source into the pack', file: SIM + 'act_resource.ts', after: "registerHandler('gather'", find: 'got = gatherFromSource(world, s, p, 1);' },
    { id: 'deposit_cycle', topic: 'deposit: units put down, a.cycle = moved', file: SIM + 'act_resource.ts', after: "registerHandler('deposit'", find: 'a.cycle = moved;' },
    { id: 'haul_cycle', topic: 'haul (to a building site): units delivered, a.cycle = moved', file: SIM + 'act_resource.ts', after: "registerHandler('haul'", find: 'a.cycle = moved;' },
    { id: 'withdraw_cycle', topic: 'withdraw: units taken from a store, a.cycle = moved', file: SIM + 'act_resource.ts', after: "registerHandler('withdraw'", find: 'a.cycle = moved;' },
    { id: 'fetch_water_cycle', topic: 'fetch_water: units drawn, a.cycle++', file: SIM + 'act_resource.ts', after: "registerHandler('fetch_water'", find: 'a.cycle++;' },
    { id: 'fetch_water_cycle_open_water', topic: 'fetch_water from open water: one unit drawn, a.cycle++', file: SIM + 'act_resource.ts', after: "addFx(world, 'splash', a.data.wx, a.data.wy, 0);", find: 'a.cycle++;' },
    { id: 'suspended_released_without_end_record', topic: 'abortActivity releases a held activity without calling the end hook, so a held walk can vanish with no end record (counted as activity_vanished_without_end_event)', file: SIM + 'activities.ts', after: 'export function abortActivity', find: 'p.suspended = null;' },
    { id: 'harvest_cycle', topic: 'harvest: grain and seed into the pack, a.cycle = grain + seeds', file: SIM + 'act_farm.ts', after: "registerHandler('harvest'", find: 'a.cycle = got.grain + got.seeds;' },
    { id: 'plan_link', topic: 'an activity chosen as a plan step carries data.forPlan', file: SIM + 'decision.ts', after: 'function launch', find: 'if (plan) act.data.forPlan = plan.id;' },
    { id: 'day_length', topic: 'ticks in a day', file: SIM + 'constants.ts', find: 'export const DAY =', value: DAY },
  ];
}
function quote(spec: FactSpec) {
  const lines = readFileSync(spec.file, 'utf8').split(/\r?\n/);
  let from = 0;
  if (spec.after) {
    const first = spec.after.split('\n')[0];
    from = lines.findIndex((l) => l.includes(first));
    if (from < 0) return { id: spec.id, topic: spec.topic, file: spec.file, found: false, note: 'not found (anchor ' + JSON.stringify(first) + ')' };
  }
  const first = spec.find.split('\n')[0];
  const at = lines.findIndex((l, i) => i >= from && l.includes(first));
  if (at < 0) return { id: spec.id, topic: spec.topic, file: spec.file, found: false, note: 'not found' };
  const text = lines.slice(at, at + (spec.span ?? 1)).map((l) => l.trim()).join('\n');
  return { id: spec.id, topic: spec.topic, file: spec.file, line: at + 1, found: true, text: text.length > 500 ? text.slice(0, 500) + ' ...' : text, ...(spec.value !== undefined ? { liveValue: spec.value } : {}) };
}

// ───────────────────────────── the observer ─────────────────────────────
export class TripShape {
  private readonly people = new Map<number, PState>();
  private readonly all: Trip[] = [];
  /** activity id -> its walks, from the first walk until the activity ends */
  private readonly legs = new Map<number, Trip[]>();
  /** end-of-activity records since the last sample, by activity id (written only by the hook) */
  private readonly ends = new Map<number, EndInfo>();
  /** walks already known to have reached work whose activity has not ended yet (waiting for the pack after the work) */
  private readonly awaitEnd = new Map<number, Trip[]>();
  private readonly workSeenTick = new Map<number, number>();
  private readonly personDays: DayRec[] = [];
  private seq = 0;
  private sampled = 0;
  private firstTick: number | null = null;
  private lastTick = 0;
  private firstCounts: { tick: number; awake: number } | null = null;
  private livingTicks = 0;
  private wakingTicks = 0;
  private ownTravelTicks = 0;
  private readonly ownTravelByStage: Record<string, number> = { under_12: 0, '12_and_over': 0 };
  private readonly livingByStage: Record<string, number> = { under_12: 0, '12_and_over': 0 };
  private readonly awakeByStage: Record<string, number> = { under_12: 0, '12_and_over': 0 };
  private ownTileChanges = 0;
  private vanished = 0;
  private readonly names = new Set<string>();
  private nameCount = -1;
  private hhMap: Map<number, Household> | null = null;
  private hhTick = -1;
  private censored = false;
  private finished = false;

  /** Chain the end-of-activity hook (as TimeBudget.attach does). Returns the function that puts the previous hooks back. */
  attach(world: World): () => void {
    const prior = world.hooks;
    world.hooks = {
      ...prior,
      onActivityEnd: (p, a, outcome, detail) => {
        prior?.onActivityEnd?.(p, a, outcome, detail);
        this.noteEnd(world, p, a, outcome, detail);
      },
    };
    return () => { world.hooks = prior; };
  }

  private noteEnd(world: World, p: Person, a: Activity, outcome: string, detail: string): void {
    if (!this.legs.has(a.id)) return; // an activity never seen walking is of no interest
    const moved = a.data.moved as Record<string, number> | undefined;
    this.ends.set(a.id, {
      tick: world.tick, outcome, detail, kind: a.kind, phase: a.phase, pathTries: a.pathTries, pi: a.pi, pathLen: a.path.length,
      progress: a.progress, cycle: a.cycle, amount: a.amount, moved: moved ? { ...moved } : null, pack: snapPack(world, p),
    });
  }

  sampleTick(world: World): void {
    if (this.firstTick === null) {
      this.firstTick = world.tick;
      let awake = 0;
      for (const p of world.persons) if (p.alive && p.pose !== 'sleep') awake++;
      this.firstCounts = { tick: world.tick, awake };
    }
    this.sampled++;
    this.lastTick = world.tick;
    this.core(world, true);
  }

  /** One last look at the state after the final step: resolves what the last step settled. It counts no ticks and opens no walks. */
  finish(world: World): void {
    if (this.finished) return;
    this.core(world, false);
    this.finished = true;
    this.censorAll();
  }

  get firstSampleCounts(): { tick: number; awake: number } | null { return this.firstCounts; }
  get awakePersonTicks(): number { return this.wakingTicks; }

  /** a reason string with digits shown as # and the names of the people in this world shown as NAME, so reasons group */
  private norm(s: string): string {
    let t = s.replace(/[0-9]+(\.[0-9]+)?/g, '#');
    if (this.names.size) t = t.replace(/\b[A-Z][a-z]+\b/g, (w) => (this.names.has(w) ? 'NAME' : w));
    return t.slice(0, 70);
  }

  private homeCenter(world: World, p: Person): { x: number; y: number } | null {
    if (this.hhTick !== world.tick) { this.hhMap = null; this.hhTick = world.tick; }
    this.hhMap ??= new Map(world.households.map((h) => [h.id, h]));
    const hh = this.hhMap.get(p.hhId);
    if (!hh || !hh.homeId) return null;
    const e = world.byId.get(hh.homeId);
    return e && e.ent === 'building' ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : null;
  }

  private core(world: World, counting: boolean): void {
    const tick = world.tick;
    if (this.nameCount !== world.persons.length) {
      for (const p of world.persons) for (const part of p.name.split(/\s+/)) if (part.length > 1 && /^[A-Z]/.test(part)) this.names.add(part);
      this.nameCount = world.persons.length;
    }
    this.processAwaitEnds();
    const seen = new Set<number>();
    for (const p of world.persons) {
      if (!p.alive) continue;
      seen.add(p.id);
      let st = this.people.get(p.id);
      const fresh = !st;
      if (!st) {
        st = { open: null, pending: [], lastX: p.x, lastY: p.y, prevTravel: false, prevActId: p.activity ? p.activity.id : 0, prevSuspId: p.suspended ? p.suspended.id : 0, dayRec: null };
        this.people.set(p.id, st);
      }
      const a = p.activity;
      const cat = timeCategory(p, tick);
      const travelling = !!a && cat === 'travel';
      if (a && a.phase === 'work' && this.legs.has(a.id)) this.workSeenTick.set(a.id, tick);
      // an independent count of tile changes in the step after every walking tick, for the self check
      if (st.prevTravel && (Math.floor(p.x) !== Math.floor(st.lastX) || Math.floor(p.y) !== Math.floor(st.lastY))) this.ownTileChanges++;
      if (st.open) this.moveOpen(st, p);
      if (st.open && !(travelling && a!.id === st.open.actId && a!.kind === st.open.kind && a!.targetId === st.open.tgtId)) this.closeOpen(world, st, p, a, travelling);
      if (st.pending.length) this.settle(st, p, a, travelling);
      if (counting) {
        this.livingTicks++;
        const awake = p.pose !== 'sleep';
        if (awake) this.wakingTicks++;
        const stage = ageYears(world, p) < AGE_CHILD ? 'under_12' : '12_and_over';
        this.livingByStage[stage]++;
        if (awake) this.awakeByStage[stage]++;
        if (cat === 'travel') { this.ownTravelTicks++; this.ownTravelByStage[stage]++; }
        // activity identity changes while awake, by calendar day
        const day = Math.floor(tick / DAY);
        let rec = st.dayRec;
        if (!rec || rec.day !== day) { if (rec) this.personDays.push(rec); rec = st.dayRec = { person: p.id, day, samples: 0, awake: 0, changes: 0 }; }
        rec.samples++;
        if (awake) rec.awake++;
        if (!fresh && awake && a && a.id !== st.prevActId && a.id !== st.prevSuspId) rec.changes++;
        if (travelling) {
          if (!st.open) this.open(world, st, p, a!, tick, fresh, stage);
          const t = st.open!;
          t.ticks++;
          t.lastTick = tick;
          t.txEnd = a!.tx; t.tyEnd = a!.ty; t.spotEndX = a!.spotX; t.spotEndY = a!.spotY;
        }
      } else if (st.open) {
        st.open.packEnd = snapPack(world, p);
      }
      st.lastX = p.x;
      st.lastY = p.y;
      st.prevTravel = counting && travelling;
      st.prevActId = a ? a.id : 0;
      st.prevSuspId = p.suspended ? p.suspended.id : 0;
    }
    if (this.people.size !== seen.size) this.dropGone(world, seen);
    for (const id of this.ends.keys()) this.closeActivity(id);
    this.ends.clear();
  }

  private open(world: World, st: PState, p: Person, a: Activity, tick: number, fresh: boolean, stage: 'under_12' | '12_and_over'): void {
    const forPlan = a.data.forPlan;
    const plan = forPlan === undefined ? null : p.intentions.find((i) => i.id === forPlan);
    const home = this.homeCenter(world, p);
    const legs = this.legs.get(a.id) ?? [];
    const items = a.data.items as Record<string, number> | undefined;
    const planned = items ? sum(Object.values(items)) : a.amount > 0 ? a.amount : null;
    let sub = '';
    if (a.kind === 'gather') sub = `gather | purpose=${typeof a.data.purpose === 'string' ? a.data.purpose : 'none'} | stype=${String(a.data.stype ?? 'none')}`;
    else if (a.kind === 'deposit') sub = 'deposit | ' + (a.data.ration ? 'ration' : a.data.basketRoom ? 'basketRoom' : a.data.packMaterials ? 'packMaterials' : 'other');
    else if (a.kind === 'eat_store') sub = 'eat_store | ' + (a.data.steal ? 'from another household (steal)' : 'own or shared store');
    const t: Trip = {
      seq: this.seq++, person: p.id, stage, simStage: stageOf(world, p),
      actId: a.id, legIndex: legs.length + 1, actStart: a.start, actAgeAtStart: tick - a.start,
      leftCensored: fresh && tick === this.firstTick && a.start < tick - 1,
      kind: a.kind, tgtId: a.targetId, targetType: a.targetType, kindAfter: '', group: lifeGroupOf(a).group,
      plan: forPlan === undefined ? 'no_plan' : plan ? plan.kind : 'plan_not_found', need: a.need ?? 'none', sub, run: a.data.run === true, startIndoors: !!p.indoors,
      startTick: tick, lastTick: tick, ticks: 0,
      sx: p.x, sy: p.y, ex: p.x, ey: p.y, tiles: 0, walked: 0,
      hasTarget: a.targetId !== 0 || a.targetType !== '', tx: a.tx, ty: a.ty, txEnd: a.tx, tyEnd: a.ty,
      spotX: a.spotX, spotY: a.spotY, spotEndX: a.spotX, spotEndY: a.spotY,
      home, hasHome: home !== null,
      hunger: r2(p.needs.hunger), planned,
      packStart: snapPack(world, p), packEnd: null, packAfter: null, packAfterBasis: '',
      outcome: '', evidence: '', pauseCause: '',
      endOutcome: '', endDetail: '', endTick: -1, gapToEnd: null, toKind: '',
      actCycle: null, actProgress: null, actMoved: null,
    };
    // a later walk of an activity that had reached work: the pack now is the pack after that work
    const waiting = this.awaitEnd.get(a.id);
    if (waiting) { for (const w of waiting) { w.packAfter = t.packStart; w.packAfterBasis = 'next_walk_start'; } this.awaitEnd.delete(a.id); }
    legs.push(t);
    this.legs.set(a.id, legs);
    this.all.push(t);
    st.open = t;
  }

  private moveOpen(st: PState, p: Person): void {
    const t = st.open!;
    t.walked += Math.hypot(p.x - st.lastX, p.y - st.lastY);
    if (Math.floor(p.x) !== Math.floor(st.lastX) || Math.floor(p.y) !== Math.floor(st.lastY)) t.tiles++;
    t.ex = p.x;
    t.ey = p.y;
  }

  private closeOpen(world: World, st: PState, p: Person, a: Activity | null, travelling: boolean): void {
    const t = st.open!;
    st.open = null;
    t.packEnd = snapPack(world, p);
    if (a && a.id === t.actId) {
      if (a.phase === 'work') t.pauseCause = '';
      else if (a.blocked) t.pauseCause = 'blocked: ' + this.norm(a.blocked);
      else if (travelling) t.pauseCause = 'identity_changed_within_activity: ' + a.kind;
      else t.pauseCause = 'same_activity_not_walking';
    } else if (p.suspended && p.suspended.id === t.actId) t.pauseCause = 'suspended_for: ' + (a ? a.kind : 'none');
    st.pending.push(t);
  }

  private fillEnd(t: Trip, info: EndInfo): void {
    t.endOutcome = info.outcome; t.endDetail = info.detail; t.endTick = info.tick;
    t.actCycle = info.cycle; t.actProgress = info.progress; t.actMoved = info.moved;
    if (!t.kindAfter) t.kindAfter = info.kind;
  }

  private resolveByEnd(t: Trip, info: EndInfo, a: Activity | null): void {
    this.fillEnd(t, info);
    t.gapToEnd = info.tick - t.lastTick;
    const workAfter = (this.workSeenTick.get(t.actId) ?? -1) > t.lastTick;
    const arrived = workAfter || info.phase === 'work' || (info.pathTries > 0 && info.pi >= info.pathLen);
    if (arrived) {
      const did = workAfter || info.outcome === 'success' || info.progress > 0 || info.cycle > 0;
      if (did) {
        t.outcome = 'arrived_did_job';
        t.evidence = workAfter ? 'seen_in_work_phase' : info.outcome === 'success' ? 'ended_success_before_any_work_sample' : 'work_progress_recorded';
        t.packAfter = info.pack; t.packAfterBasis = 'activity_end';
      } else {
        t.outcome = 'arrived_no_job';
        t.evidence = info.phase === 'work' ? 'work_phase_entered_ended_with_no_progress' : 'path_used_up_ended_with_no_progress';
      }
    } else if (info.outcome === 'interrupted' && info.detail === 'died') { t.outcome = 'ended_other'; t.evidence = 'person_died'; }
    else if (info.outcome === 'interrupted') { t.outcome = 'switched_mid_walk'; t.evidence = 'interrupted_before_arrival'; t.toKind = a ? a.kind : 'none'; }
    else if (info.outcome === 'success') { t.outcome = 'ended_other'; t.evidence = 'success_reported_before_arrival'; }
    else { t.outcome = 'gave_up_before_arrival'; t.evidence = 'failed_or_partial_before_arrival'; }
  }

  private settle(st: PState, p: Person, a: Activity | null, travelling: boolean): void {
    const keep: Trip[] = [];
    for (const t of st.pending) {
      const info = this.ends.get(t.actId);
      if (info) { this.resolveByEnd(t, info, a); continue; }
      if (a && a.id === t.actId) {
        if (a.phase === 'work') {
          t.outcome = 'arrived_did_job'; t.evidence = 'seen_in_work_phase'; t.kindAfter = a.kind;
          const w = this.awaitEnd.get(t.actId);
          if (w) w.push(t); else this.awaitEnd.set(t.actId, [t]);
          continue;
        }
        if (travelling) { t.outcome = 'continued_same_activity'; t.evidence = t.pauseCause || 'same_activity_walked_again'; continue; }
        keep.push(t); // paused on a.blocked, still in the travel phase
        continue;
      }
      if (p.suspended && p.suspended.id === t.actId) { keep.push(t); continue; } // held for a conversation
      this.vanished++;
      t.outcome = 'ended_other'; t.evidence = 'activity_vanished_without_end_event';
    }
    st.pending = keep;
  }

  private processAwaitEnds(): void {
    for (const [id, info] of this.ends) {
      const ts = this.awaitEnd.get(id);
      if (!ts) continue;
      for (const t of ts) { this.fillEnd(t, info); t.packAfter = info.pack; t.packAfterBasis = 'activity_end'; }
      this.awaitEnd.delete(id);
    }
  }

  /** the activity ended: every walk of it learns how it ended, and its bookkeeping goes */
  private closeActivity(id: number): void {
    const info = this.ends.get(id);
    const legs = this.legs.get(id);
    if (info && legs) for (const t of legs) if (!t.endOutcome) this.fillEnd(t, info);
    this.legs.delete(id);
    this.workSeenTick.delete(id);
    this.awaitEnd.delete(id);
  }

  private dropGone(world: World, seen: Set<number>): void {
    for (const [id, st] of [...this.people]) {
      if (seen.has(id)) continue;
      if (st.open) { const t = st.open; st.open = null; t.pauseCause = ''; st.pending.push(t); }
      for (const t of st.pending) {
        const info = this.ends.get(t.actId);
        if (info) this.resolveByEnd(t, info, null);
        else { t.outcome = 'ended_other'; t.evidence = 'person_gone_without_end_event'; }
      }
      st.pending = [];
      if (st.dayRec) this.personDays.push(st.dayRec);
      this.people.delete(id);
    }
  }

  private censorAll(): void {
    if (this.censored) return;
    this.censored = true;
    for (const st of this.people.values()) {
      if (st.open) { const t = st.open; st.open = null; t.outcome = 'censored'; t.evidence = 'still_walking_at_run_end'; }
      for (const t of st.pending) { t.outcome = 'censored'; t.evidence = 'paused_unresolved_at_run_end: ' + (t.pauseCause || 'none'); }
      st.pending = [];
      if (st.dayRec) { this.personDays.push(st.dayRec); st.dayRec = null; }
    }
  }

  // ───────────────────────────── rows and report ─────────────────────────────
  private derived(t: Trip) {
    const dEnd = Math.hypot(t.ex - t.sx, t.ey - t.sy);
    const dSpot = Math.hypot(t.spotX - t.sx, t.spotY - t.sy);
    const dTarget = t.hasTarget ? Math.hypot(t.tx - t.sx, t.ty - t.sy) : null;
    const dEndSpot = Math.hypot(t.spotX - t.ex, t.spotY - t.ey);
    const dEndToEndSpot = Math.hypot(t.spotEndX - t.ex, t.spotEndY - t.ey);
    const covered = dSpot > 0 ? Math.max(0, Math.min(1, 1 - dEndSpot / dSpot)) : null;
    const px = t.hasTarget ? t.tx : t.ex, py = t.hasTarget ? t.ty : t.ey;
    const homeDistTarget = t.home ? Math.hypot(px - t.home.x, py - t.home.y) : null;
    const homeDistStart = t.home ? Math.hypot(t.sx - t.home.x, t.sy - t.home.y) : null;
    const delta = this.packDelta(t);
    const hauling = HAULING_KINDS.includes(t.kind);
    const cap = t.packEnd ? t.packEnd.cap : t.packStart.cap;
    let moved: { units: number; weight: number; mainItem: string; byItem: Record<string, number> } | null = null;
    if (hauling && delta) {
      const gain = HAULING_GAIN.includes(t.kind);
      const byItem: Record<string, number> = {};
      let units = 0, weight = 0, mainItem = '', mainW = -1;
      for (const [k, d] of Object.entries(delta)) {
        const n = gain ? d : -d;
        if (n <= 0) continue;
        byItem[k] = n;
        units += n;
        const w = n * (WEIGHT[k as ItemKind] ?? 1);
        weight += w;
        if (w > mainW) { mainW = w; mainItem = k; }
      }
      moved = { units, weight: r3(weight), mainItem: mainItem || 'none', byItem };
    }
    return { dEnd, dSpot, dTarget, dEndSpot, dEndToEndSpot, covered, homeDistTarget, homeDistStart, delta, hauling, cap, moved };
  }

  /** pack after the work minus the pack at the end of the walk (item counts), or null when either is unknown */
  private packDelta(t: Trip): Record<string, number> | null {
    if (!t.packAfter) return null;
    const before = (t.packEnd ?? t.packStart).items;
    const out: Record<string, number> = {};
    for (const k of new Set([...Object.keys(before), ...Object.keys(t.packAfter.items)])) {
      const d = (t.packAfter.items[k] ?? 0) - (before[k] ?? 0);
      if (d !== 0) out[k] = d;
    }
    return out;
  }

  tripRows() {
    const packRow = (k: Pack | null) => (k ? { units: k.units, food: k.food, wood: k.wood, weight: k.weight, cap: k.cap, items: k.items } : null);
    return this.all.map((t) => {
      const d = this.derived(t);
      return {
        person: t.person, stage: t.stage, simStage: t.simStage, actId: t.actId, legIndex: t.legIndex, actStart: t.actStart, actAgeAtStart: t.actAgeAtStart, leftCensored: t.leftCensored,
        startTick: t.startTick, endTick: t.lastTick, walkingTicks: t.ticks,
        startPos: [r2(t.sx), r2(t.sy)], endPos: [r2(t.ex), r2(t.ey)],
        startTile: [Math.floor(t.sx), Math.floor(t.sy)], endTile: [Math.floor(t.ex), Math.floor(t.ey)],
        targetTile: t.hasTarget ? [Math.floor(t.tx), Math.floor(t.ty)] : null, spotTile: [Math.floor(t.spotX), Math.floor(t.spotY)], targetType: t.targetType,
        tilesMoved: t.tiles, walkedDistance: r2(t.walked),
        distStartEnd: r2(d.dEnd), distStartTarget: d.dTarget === null ? null : r2(d.dTarget), distStartSpot: r2(d.dSpot), distEndSpot: r2(d.dEndSpot), distEndToEndSpot: r2(d.dEndToEndSpot), coveredShare: d.covered === null ? null : r3(d.covered),
        hasHome: t.hasHome, homeDistTarget: d.homeDistTarget === null ? null : r2(d.homeDistTarget), homeDistStart: d.homeDistStart === null ? null : r2(d.homeDistStart),
        kind: t.kind, kindAfter: t.kindAfter, lifeGroup: t.group, planKind: t.plan, need: t.need, subKind: t.sub, run: t.run, startIndoors: t.startIndoors,
        hungerStart: t.hunger, plannedUnits: t.planned,
        packStart: packRow(t.packStart), packEnd: packRow(t.packEnd), packAfter: packRow(t.packAfter), packAfterBasis: t.packAfterBasis,
        packDelta: d.delta, hauling: d.hauling, moved: d.moved,
        loadFraction: d.moved && d.cap > 0 ? r3(d.moved.weight / d.cap) : null,
        outcome: t.outcome, outcomeEvidence: t.evidence, pauseCause: t.pauseCause,
        endOutcome: t.endOutcome, endDetail: t.endDetail, activityEndTick: t.endTick, gapToEnd: t.gapToEnd, toKind: t.toKind,
        actCycle: t.actCycle, actProgress: t.actProgress, actMoved: t.actMoved,
      };
    });
  }

  report(timeBudgetTravelTicks?: number) {
    this.censorAll();
    const all = this.all;
    const measured = all.filter((t) => t.outcome !== 'censored' && !t.leftCensored);
    const D = new Map(all.map((t) => [t, this.derived(t)] as const));
    const dv = (t: Trip) => D.get(t)!;
    const personDayCount = this.livingTicks / DAY;
    const wakingDayCount = this.wakingTicks / DAY;
    const byGroup = <T>(ts: Trip[], key: (t: Trip) => string, f: (g: Trip[]) => T): Record<string, T> => {
      const m = new Map<string, Trip[]>();
      for (const t of ts) { const k = key(t); const g = m.get(k); if (g) g.push(t); else m.set(k, [t]); }
      return Object.fromEntries([...m.entries()].sort((a, b) => sum(b[1].map((t) => t.ticks)) - sum(a[1].map((t) => t.ticks)) || a[0].localeCompare(b[0])).map(([k, g]) => [k, f(g)]));
    };
    // the outcome of the last walk of each activity: the activity-level fate, with paused-and-resumed walks merged into it
    const lastLeg = new Map<number, Trip>();
    for (const t of all) { const l = lastLeg.get(t.actId); if (!l || l.seq < t.seq) lastLeg.set(t.actId, t); }
    const finalOutcome = (t: Trip): string => lastLeg.get(t.actId)!.outcome;
    const zero = (): Record<string, number> => Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
    const outcomeBlock = (ts: Trip[], pick: (t: Trip) => string = (t) => t.outcome) => {
      const count = zero(), ticks = zero();
      for (const t of ts) { const o = pick(t) || 'unset'; bump(count, o); bump(ticks, o, t.ticks); }
      const n = ts.length, tk = sum(ts.map((t) => t.ticks));
      const shareOf = (m: Record<string, number>, d: number) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, share(v, d)]));
      return {
        walks: n, walkingTicks: tk, count, ticks, shareByCount: shareOf(count, n), shareByTicks: shareOf(ticks, tk),
        keyShareOfWalkingTicks: {
          note: 'cause (c): the share of walking ticks spent on walks that ended switched_mid_walk or arrived_no_job; the wider figure adds gave_up_before_arrival',
          switchedMidWalkOrArrivedNoJob: share(ticks.switched_mid_walk + ticks.arrived_no_job, tk),
          plusGaveUpBeforeArrival: share(ticks.switched_mid_walk + ticks.arrived_no_job + ticks.gave_up_before_arrival, tk),
          arrivedDidJob: share(ticks.arrived_did_job, tk),
          continuedSameActivity: share(ticks.continued_same_activity, tk),
        },
      };
    };
    const walkBlock = (ts: Trip[]) => ({
      walks: ts.length, walkingTicks: sum(ts.map((t) => t.ticks)),
      walkingTicksPerWalk: dist(ts.map((t) => t.ticks)),
      tilesMovedPerWalk: dist(ts.map((t) => t.tiles)),
      straightLineStartToEnd: dist(ts.map((t) => dv(t).dEnd)),
      straightLineStartToTarget: dist(ts.filter((t) => dv(t).dTarget !== null).map((t) => dv(t).dTarget!)),
      plannedStraightLineStartToSpot: dist(ts.map((t) => dv(t).dSpot)),
      detourRatioTilesMovedOverStraightLine: dist(ts.filter((t) => dv(t).dEnd > 0).map((t) => t.tiles / dv(t).dEnd)),
      detourRatioWhereStraightLineAtLeast3Tiles: dist(ts.filter((t) => dv(t).dEnd >= 3).map((t) => t.tiles / dv(t).dEnd)),
      walkedDistanceOverStraightLine: dist(ts.filter((t) => dv(t).dEnd > 0).map((t) => t.walked / dv(t).dEnd)),
      walkedDistanceOverStraightLineWhereStraightLineAtLeast3Tiles: dist(ts.filter((t) => dv(t).dEnd >= 3).map((t) => t.walked / dv(t).dEnd)),
      outcomes: outcomeBlock(ts),
      outcomesByTheFinalOutcomeOfTheActivity: { note: 'each walk takes the outcome of the last walk of its activity, so a walk paused for a conversation and resumed counts with how the activity finally went', ...outcomeBlock(ts, finalOutcome) },
    });
    const speedBlock = (ts: Trip[]) => {
      const ticks = sum(ts.map((t) => t.ticks)), tiles = sum(ts.map((t) => t.tiles)), walked = sum(ts.map((t) => t.walked));
      return { walks: ts.length, walkingTicks: ticks, tilesMoved: tiles, walkedDistanceTiles: r2(walked), tilesMovedPerWalkingTick: ticks ? r3(tiles / ticks) : null, walkedDistancePerWalkingTick: ticks ? r3(walked / ticks) : null, walkedPerTickOverBaseSpeed: ticks ? r3(walked / ticks / BASE_SPEED) : null };
    };
    const stages = ['under_12', '12_and_over'] as const;
    const stageTrips = (s: string, ts: Trip[]) => ts.filter((t) => t.stage === s);

    // jobs
    const jobEnd = (ts: Trip[]) => {
      const c: Record<string, number> = {}, k: Record<string, number> = {};
      for (const t of ts) if (t.outcome === 'arrived_did_job') { const e = t.endOutcome || 'activity_open_at_run_end'; bump(c, e); bump(k, e, t.ticks); }
      return { note: 'what the activity finally came to for walks counted arrived_did_job (the spec defines did_job as the work phase being entered; this splits it by how the activity then ended)', count: c, walkingTicks: k };
    };

    // by kind
    const byKind = byGroup(measured, (t) => t.kind, (g) => {
      const done = g.filter((t) => t.outcome === 'arrived_did_job').length;
      const tk = sum(g.map((t) => t.ticks));
      const homeRows = g.filter((t) => dv(t).homeDistTarget !== null);
      return {
        ...walkBlock(g),
        walkingTicksPerCompletedJob: { allWalkingTicksOfThisKind: tk, completedJobs: done, ticksPerCompletedJob: done ? r2(tk / done) : null },
        targetDistanceFromHome: { walksWithAHome: homeRows.length, tiles: dist(homeRows.map((t) => dv(t).homeDistTarget!)) },
        speed: speedBlock(g),
      };
    });

    // switched: from kind to to kind
    const sw = measured.filter((t) => t.outcome === 'switched_mid_walk');
    const fromTo: Record<string, { walks: number; walkingTicks: number }> = {};
    for (const t of sw) { const k = `${t.kind} -> ${t.toKind || 'none'}`; const r = (fromTo[k] ??= { walks: 0, walkingTicks: 0 }); r.walks++; r.walkingTicks += t.ticks; }
    const reasons = (ts: Trip[]) => {
      const m: Record<string, { walks: number; walkingTicks: number }> = {};
      for (const t of ts) { const k = `${t.endOutcome || 'none'} | ${this.norm(t.endDetail || 'none')}`; const r = (m[k] ??= { walks: 0, walkingTicks: 0 }); r.walks++; r.walkingTicks += t.ticks; }
      return Object.fromEntries(Object.entries(m).sort((a, b) => b[1].walkingTicks - a[1].walkingTicks).slice(0, 25));
    };
    const covered = sw.filter((t) => dv(t).covered !== null).map((t) => dv(t).covered!);
    const switched = {
      walks: sw.length, walkingTicks: sum(sw.map((t) => t.ticks)),
      fromKindToKindTop20ByWalkingTicks: Object.entries(fromTo).sort((a, b) => b[1].walkingTicks - a[1].walkingTicks || a[0].localeCompare(b[0])).slice(0, 20).map(([k, v]) => ({ fromTo: k, ...v })),
      shareOfPlannedStraightLineCoveredBeforeTheSwitch: { note: 'covered = 1 - (straight distance from where they were to the stand spot) / (straight distance from the start to the stand spot), clipped to 0..1; walks with a planned distance of 0 are left out', ...dist(covered), walksCovered0: covered.filter((c) => c === 0).length, walksCoveredOver50pc: covered.filter((c) => c > 0.5).length },
      walkingTicksPerWalk: dist(sw.map((t) => t.ticks)),
      endReasonsTop25ByWalkingTicks: reasons(sw),
      walksWhereTheEndCameMoreThanOneTickAfterTheWalk: sw.filter((t) => (t.gapToEnd ?? 0) > 0).length,
    };
    const beforeArrival = measured.filter((t) => t.outcome === 'gave_up_before_arrival');
    const noJob = measured.filter((t) => t.outcome === 'arrived_no_job');
    const endReasons = {
      note: "the sim's own record of how an activity ended (outcome | detail, digits shown as #), for walks that did not do the job",
      switched_mid_walk: switched.endReasonsTop25ByWalkingTicks,
      gave_up_before_arrival: reasons(beforeArrival),
      arrived_no_job: reasons(noJob),
      ended_other: reasons(measured.filter((t) => t.outcome === 'ended_other')),
      continuedSameActivityPauseCauses: Object.fromEntries(Object.entries(measured.filter((t) => t.outcome === 'continued_same_activity').reduce((m, t) => { const k = this.norm(t.pauseCause || 'none'); const r = (m[k] ??= { walks: 0, walkingTicks: 0 }); r.walks++; r.walkingTicks += t.ticks; return m; }, {} as Record<string, { walks: number; walkingTicks: number }>)).sort((a, b) => b[1].walkingTicks - a[1].walkingTicks).slice(0, 15)),
    };

    // load
    const hauls = measured.filter((t) => dv(t).hauling);
    const withMove = hauls.filter((t) => t.outcome === 'arrived_did_job' && dv(t).moved !== null);
    const fullness = (ts: Trip[], at: 'start' | 'end') => {
      const pk = (t: Trip) => (at === 'start' ? t.packStart : t.packEnd ?? t.packStart);
      return {
        walks: ts.length,
        unitsCarriedOverCapacity: dist(ts.map((t) => pk(t).cap > 0 ? pk(t).units / pk(t).cap : 0)),
        weightCarriedOverCapacity: dist(ts.map((t) => pk(t).cap > 0 ? pk(t).weight / pk(t).cap : 0)),
        unitsCarried: dist(ts.map((t) => pk(t).units)),
        walksCarryingNothing: ts.filter((t) => pk(t).units === 0).length,
      };
    };
    const loadBlock = (ts: Trip[]) => {
      const m = ts.map((t) => dv(t).moved!);
      const cycleMatch = ts.filter((t) => t.actCycle !== null).length;
      const agree = ts.filter((t) => t.actCycle !== null && t.actCycle === dv(t).moved!.units).length;
      return {
        walks: ts.length,
        unitsMovedPerWalk: dist(m.map((x) => x.units)),
        weightMovedPerWalk: dist(m.map((x) => x.weight)),
        loadFractionWeightMovedOverCapacity: dist(ts.map((t) => dv(t).cap > 0 ? dv(t).moved!.weight / dv(t).cap : 0)),
        unitsMovedOverCapacity: dist(ts.map((t) => dv(t).cap > 0 ? dv(t).moved!.units / dv(t).cap : 0)),
        plannedUnits: dist(ts.filter((t) => t.planned !== null).map((t) => t.planned!)),
        movedOverPlanned: dist(ts.filter((t) => t.planned !== null && t.planned > 0).map((t) => dv(t).moved!.units / t.planned!)),
        walksMovingNothing: m.filter((x) => x.units === 0).length,
        packDeltaAgreesWithActivityCycle: { walksWithACycleCount: cycleMatch, equal: agree },
      };
    };
    const load = {
      note: "Capacity is a WEIGHT limit, not a count of items (people.ts carryCap, constants.ts CARRY_CAP, WEIGHT). unitsMoved is the change in item count between the pack at the end of the walk and the pack when the activity ended (or when its next walk began); weightMoved weights each unit by constants.ts WEIGHT; loadFraction is weightMoved / capacity. Only walks counted arrived_did_job whose pack after the work is known are in the moved figures.",
      haulingKinds: { gain: HAULING_GAIN, loss: HAULING_LOSS, notIncluded: 'cart_haul (the load rides in the cart, not the pack), give, return_tool, tree_work, operate and every other kind' },
      walksOfHaulingKinds: hauls.length,
      walksWithAMeasuredMove: withMove.length,
      walksDidJobWithNoPackAfterKnown: hauls.filter((t) => t.outcome === 'arrived_did_job' && dv(t).moved === null).length,
      byKind: byGroup(hauls, (t) => t.kind, (g) => {
        const wm = g.filter((t) => t.outcome === 'arrived_did_job' && dv(t).moved !== null);
        return { walks: g.length, packAtStartOfWalk: fullness(g, 'start'), packAtEndOfWalk: fullness(g, 'end'), moved: loadBlock(wm) };
      }),
      byKindAndMainItem: byGroup(withMove, (t) => `${t.kind} | ${dv(t).moved!.mainItem}`, loadBlock),
      depositWalksPackFullnessAtStart: fullness(hauls.filter((t) => t.kind === 'deposit'), 'start'),
      gatherWalksPackFullnessAtEnd: fullness(hauls.filter((t) => t.kind === 'gather'), 'end'),
    };

    // repeats
    const repeatSet = new Set<Trip>(), gaps: number[] = [], gapByKind: Record<string, number[]> = {}, perPersonDay = new Map<string, number>(), walkDays = new Set<string>();
    const placeRepeated = new Set<Trip>(), repeatedPerPersonDay = new Map<string, number>();
    {
      const groups = new Map<string, Trip[]>();
      for (const t of measured) { const k = `${t.person}|${Math.floor(t.startTick / DAY)}|${t.kind}`; const g = groups.get(k); if (g) g.push(t); else groups.set(k, [t]); walkDays.add(`${t.person}|${Math.floor(t.startTick / DAY)}`); }
      const place = (t: Trip) => (t.hasTarget ? { x: t.tx, y: t.ty } : { x: t.spotX, y: t.spotY });
      for (const g of groups.values()) {
        g.sort((a, b) => a.startTick - b.startTick || a.seq - b.seq);
        for (let i = 1; i < g.length; i++) {
          const pi = place(g[i]);
          for (let j = i - 1; j >= 0; j--) {
            if (g[j].actId === g[i].actId) continue;
            const pj = place(g[j]);
            if (Math.hypot(pi.x - pj.x, pi.y - pj.y) <= SAME_PLACE_TILES) {
              repeatSet.add(g[i]);
              for (const x of [g[i], g[j]]) if (!placeRepeated.has(x)) { placeRepeated.add(x); const k = `${x.person}|${Math.floor(x.startTick / DAY)}`; repeatedPerPersonDay.set(k, (repeatedPerPersonDay.get(k) ?? 0) + 1); }
              const gap = g[i].startTick - g[j].lastTick;
              gaps.push(gap); (gapByKind[g[i].kind] ??= []).push(gap);
              const pd = `${g[i].person}|${Math.floor(g[i].startTick / DAY)}`;
              perPersonDay.set(pd, (perPersonDay.get(pd) ?? 0) + 1);
              break;
            }
          }
        }
      }
    }
    const repeats = {
      definition: `a walk is a repeat when the same person, on the same calendar day (tick / ${DAY}), already made an earlier walk of the same activity kind, from a different activity, to a target (the stand spot when the activity has no target) within ${SAME_PLACE_TILES} tiles; the gap runs from the last walking tick of the nearest earlier such walk to the start of the repeat. Walks of one activity (legs) are never repeats of each other. repeatWalks counts the later walk of each such pair; walksToAPlaceVisitedMoreThanOnceThatDay counts both walks of each pair.`,
      walksConsidered: measured.length,
      repeatWalks: repeatSet.size,
      shareOfWalksThatAreRepeats: share(repeatSet.size, measured.length),
      personDaysWithAnyWalk: walkDays.size,
      personDaysWithAtLeastOneRepeat: perPersonDay.size,
      shareOfPersonDaysWithARepeat: share(perPersonDay.size, walkDays.size),
      repeatWalksPerPersonDayWithAnyWalk: dist([...walkDays].map((d) => perPersonDay.get(d) ?? 0)),
      walksToAPlaceVisitedMoreThanOnceThatDay: placeRepeated.size,
      shareOfWalksToAPlaceVisitedMoreThanOnceThatDay: share(placeRepeated.size, measured.length),
      walksToAPlaceVisitedMoreThanOncePerPersonDayWithAnyWalk: dist([...walkDays].map((d) => repeatedPerPersonDay.get(d) ?? 0)),
      gapTicksBetweenRepeats: dist(gaps),
      byKind: Object.fromEntries(Object.entries(byGroup(measured, (t) => t.kind, (g) => ({ walks: g.length, repeats: g.filter((t) => repeatSet.has(t)).length }))).map(([k, v]) => [k, { ...v, shareRepeat: share(v.repeats, v.walks), gapTicks: dist(gapByKind[k] ?? []) }])),
    };

    // switches
    const fullDays = this.personDays.filter((r) => r.samples === DAY);
    const totalChanges = sum(this.personDays.map((r) => r.changes));
    const switches = {
      definition: "an activity identity change while awake: at a sample, the person's activity has an id that is neither the id they had at the previous sample nor the id of the activity they had on hold (a resume is not a change), and pose is not sleep. Counted by calendar day (tick / DAY).",
      totalChanges, perWakingPersonDay: this.wakingTicks ? r3((totalChanges / this.wakingTicks) * DAY) : null,
      fullPersonDays: fullDays.length, partialPersonDaysLeftOut: this.personDays.length - fullDays.length,
      changesPerFullPersonDay: dist(fullDays.map((r) => r.changes)),
      changesPerFullPersonDayPerAwakeDayEquivalent: dist(fullDays.filter((r) => r.awake > 0).map((r) => (r.changes * DAY) / r.awake)),
      awakeTicksPerFullPersonDay: dist(fullDays.map((r) => r.awake)),
    };

    // home distance
    const homeRows = measured.filter((t) => dv(t).homeDistTarget !== null);
    const homeDistance = {
      definition: "straight-line tiles from the walk's target (target position at the start of the walk; the end position when the activity has no target) to the centre of the household's home building",
      walksWithAHome: homeRows.length, walksWithoutAHome: measured.length - homeRows.length,
      overall: dist(homeRows.map((t) => dv(t).homeDistTarget!)),
      startOfWalkToHome: dist(homeRows.map((t) => dv(t).homeDistStart!)),
      byKind: Object.fromEntries(Object.entries(byGroup(homeRows, (t) => t.kind, (g) => dist(g.map((t) => dv(t).homeDistTarget!))))),
    };

    // how "arrived" lines up with where people stood at the end of the walk (straight tiles from the stand spot the walk was heading for at its last tick)
    const geometryOf = (ts: Trip[]) => {
      const v = ts.map((t) => dv(t).dEndToEndSpot);
      return { walks: ts.length, tilesFromTheStandSpotAtTheEndOfTheWalk: dist(v), within0_5Tile: ts.filter((t, i) => v[i] <= 0.5).length, over2Tiles: ts.filter((t, i) => v[i] > 2).length };
    };
    const arrivalGeometry = {
      note: "the sim's arrival is the path being used up, which puts the walker exactly on the stand spot (pathfinding.ts, activities.ts stepTravel); a conversation can begin before that when the person is close enough, and a person being chased moves the stand spot",
      arrived_did_job: geometryOf(measured.filter((t) => t.outcome === 'arrived_did_job')),
      arrived_no_job: geometryOf(noJob),
      switched_mid_walk: geometryOf(sw),
      arrivedWalksMoreThan2TilesFromTheirSpotByKind: Object.fromEntries(Object.entries(byGroup(measured.filter((t) => t.outcome.startsWith('arrived') && dv(t).dEndToEndSpot > 2), (t) => t.kind, (g) => g.length))),
    };

    // checks
    const ticksAll = sum(all.map((t) => t.ticks));
    const outcomeSum = OUTCOMES.reduce((n, o) => n + all.filter((t) => t.outcome === o).length, 0);
    const selfChecks = {
      tripTicksEqualOwnTravelTickCount: ticksAll === this.ownTravelTicks,
      tripTicksByStageEqualOwnCounts: stages.every((s) => sum(stageTrips(s, all).map((t) => t.ticks)) === this.ownTravelByStage[s]),
      ...(timeBudgetTravelTicks !== undefined ? { tripTicksEqualTimeBudgetTravelTicks: ticksAll === timeBudgetTravelTicks } : {}),
      everyWalkHasExactlyOneOutcome: outcomeSum === all.length && all.every((t) => (OUTCOMES as readonly string[]).includes(t.outcome)),
      tileChangesEqualOwnCount: sum(all.map((t) => t.tiles)) === this.ownTileChanges,
      noWalkLeftUnresolved: all.every((t) => t.outcome !== ''),
      noActivityVanishedWithoutAnEndRecord: this.vanished === 0,
      leftCensoredOnlyAtTheFirstSample: all.every((t) => !t.leftCensored || t.startTick === this.firstTick),
      livingTicksEqualSampledPersonTicks: this.livingTicks === sum([...this.personDays].map((r) => r.samples)),
    };

    const notMeasured = [
      { item: 'target tile for walks whose activity carries no target (targetId 0 and no targetType)', walks: all.filter((t) => !t.hasTarget).length, why: 'the sim holds only the stand spot for them; targetTile is null and the spot is recorded instead' },
      { item: 'home distance for people whose household has no home building', walks: all.filter((t) => !t.hasHome).length, why: 'nothing to measure from; the fields are null' },
      { item: 'pack after the work for walks that reached work while the activity was still running at the end of the run', walks: all.filter((t) => t.outcome === 'arrived_did_job' && !t.packAfter).length, why: 'the activity had not ended, so there is no end of the non-travel phase to read; load figures leave them out' },
      { item: 'load fraction for cart_haul', walks: all.filter((t) => t.kind === 'cart_haul').length, why: 'the load rides in the cart, which is not the pack, so pack capacity does not describe it' },
      { item: "why a switch happened beyond the sim's own detail string", walks: sw.length, why: 'the string (for example something better came up, switched to something else, danger nearby) is recorded; whether each is a change of mind is not decided here' },
      { item: 'the first step of an activity chosen and ended inside one step', walks: null, why: 'never visible at a start-of-tick sample, so it has no walk' },
      { item: 'a person walking with the per-tick speed split into terrain, load and age', walks: null, why: 'moveSpeed is not called (the observer calls nothing that could change state); the constants are cited in sourceFacts and the realised speed per walking tick is reported instead' },
      { item: 'walks already under way at the first sample', walks: all.filter((t) => t.leftCensored).length, why: 'their start is before the run; kept in the tick totals, left out of distributions and outcome shares (flag leftCensored)' },
      { item: 'work done by a multi-walk activity attributed to one walk', walks: all.filter((t) => t.legIndex > 1).length, why: 'when an activity walks more than once, end-of-activity facts (progress, cycle, pack after) belong to the activity; the pack after is given to the last walk that reached work' },
    ];

    const stageCounts = Object.fromEntries(stages.map((s) => [s, { walks: stageTrips(s, all).length, walkingTicks: sum(stageTrips(s, all).map((t) => t.ticks)) }]));
    const nonLeft = all.filter((t) => !t.leftCensored);
    return {
      observer: 'TripShape',
      readOnly: 'reads the world only; no write, no random draw; the runner checks the saved state is byte-identical around a sample every 120 ticks, and the end hash is compared with the day probe run on the same save',
      definitions: {
        walk: 'a maximal run of consecutive start-of-tick samples for one person with timeCategory travel and the same activity identity (id + kind + targetId); see the header of scripts/observers/trip_shape.ts',
        outcomes: Object.fromEntries(OUTCOMES.map((o) => [o, ({
          arrived_did_job: 'the same activity reached its work phase and work was seen, or it ended in success, or it ended with progress or cycle above zero',
          arrived_no_job: "reached the end of its path (the sim's arrival test) or the work phase, and ended with no work seen and no progress or cycle",
          switched_mid_walk: "ended before arrival with the sim's outcome interrupted (not 'died'); the sim's detail is kept",
          gave_up_before_arrival: "ended before arrival with the sim's outcome failed or partial",
          ended_other: 'the person died, or the activity reported success before arrival, or it left with no end record',
          continued_same_activity: 'the same activity walked again after a pause (blocked, held for a conversation, or its kind or target was rewritten)',
          censored: 'still walking, or paused and unresolved, at the end of the run',
        } as Record<Outcome, string>)[o]])),
        measuredWalks: 'closed walks that were not under way at the first sample and are not censored: distributions and outcome shares use these',
        movement: 'tiles moved = count of changes of floor(x), floor(y) between consecutive samples across the walk including the step after its last tick (a tile boundary crossed counts one, so a straight diagonal walk scores up to 1.41 times its length); walkedDistance = the sum of the straight steps between those samples, which is the true path length, so walkedDistanceOverStraightLine is the cleaner detour figure',
        ageStage: `under_12 is ageYears < ${AGE_CHILD} at the first walking tick (AGE_CHILD); simStage is the sim's four stages`,
      },
      sampledTicks: this.sampled, firstTick: this.firstTick, lastTick: this.lastTick, livingPersonTicks: this.livingTicks, awakePersonTicks: this.wakingTicks,
      personDays: r2(personDayCount), awakePersonDays: r2(wakingDayCount), firstSampleCounts: this.firstCounts,
      counts: {
        walksAll: all.length,
        walksStartedInsideTheRun: nonLeft.length,
        walksMeasured: measured.length,
        walksCensoredAtRunEnd: all.filter((t) => t.outcome === 'censored' && !t.leftCensored).length,
        walksLeftCensored: all.filter((t) => t.leftCensored).length,
        walkingTicksAll: ticksAll,
        walkingTicksMeasured: sum(measured.map((t) => t.ticks)),
        walksPerHeadPerDay: personDayCount ? r2(nonLeft.length / personDayCount) : null,
        walksPerAwakeHeadDay: wakingDayCount ? r2(nonLeft.length / wakingDayCount) : null,
        walkingShareOfAwakeTicks: this.wakingTicks ? r3(ticksAll / this.wakingTicks) : null,
        byStage: stageCounts,
        legsOfActivitiesWithMoreThanOneWalk: all.filter((t) => t.legIndex > 1).length,
      },
      headline: {
        overall: walkBlock(measured),
        byStage: Object.fromEntries(stages.map((s) => [s, {
          counts: {
            ...stageCounts[s], walksStartedInsideTheRun: stageTrips(s, nonLeft).length, walksMeasured: stageTrips(s, measured).length,
            personDays: r2(this.livingByStage[s] / DAY), walksPerHeadPerDay: this.livingByStage[s] ? r2(stageTrips(s, nonLeft).length / (this.livingByStage[s] / DAY)) : null,
            walksPerAwakeHeadDay: this.awakeByStage[s] ? r2(stageTrips(s, nonLeft).length / (this.awakeByStage[s] / DAY)) : null,
            walkingShareOfAwakeTicks: this.awakeByStage[s] ? r3(stageCounts[s].walkingTicks / this.awakeByStage[s]) : null,
          },
          ...walkBlock(stageTrips(s, measured)),
        }])),
      },
      arrivedDidJobSplitByHowTheActivityEnded: jobEnd(measured),
      byKind,
      speed: {
        note: 'realised movement per walking tick over all walks (left-censored and censored walks included, so it matches the tick totals); modifiers in the source are cited in sourceFacts',
        baseSpeedTilesPerTick: BASE_SPEED,
        overall: speedBlock(all),
        byStage: Object.fromEntries(stages.map((s) => [s, speedBlock(stageTrips(s, all))])),
        bySimStage: byGroup(all, (t) => t.simStage, speedBlock),
        running: speedBlock(all.filter((t) => t.run)),
        notRunning: speedBlock(all.filter((t) => !t.run)),
      },
      switchedMidWalk: switched,
      endReasons,
      arrivalGeometry,
      load,
      repeatVisits: repeats,
      walkingTicksPerCompletedJobByKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, v.walkingTicksPerCompletedJob])),
      activitySwitchesPerPersonPerWakingDay: switches,
      homeDistance,
      selfChecks,
      notMeasured,
      sourceFacts: {
        note: 'Each fact is a line (or a few) read from the source file in this worktree when the report was made: file, 1-based line, text. liveValue is the exported constant itself where there is one. "found: false" means the line was not found by that anchor.',
        facts: factSpecs().map(quote),
      },
    };
  }
}
