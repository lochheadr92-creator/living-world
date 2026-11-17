// SCRATCH ONLY (day probe, 17 November 2026). Read-only observer: it reads people, activities, households, buildings, stores, piles,
// carts and sites, keeps its own tallies, and writes nothing to the world or to anything reachable from it. It never calls the
// world's random generator (it calls no function that does). Call `sampleTick(world)` once a tick, before the world steps.
//
// Four measures, kept in separate tallies. Every count is a person-tick (or a store-unit count) at the START of a tick, the same
// moment TimeBudget.sampleTick reads, so its categories can be reused exactly.
//
//   A  walking by purpose  every living person whose tick `timeCategory` (time_budget.ts) calls 'travel', attributed to the kind of
//                          the activity they are travelling for, its need, the plan kind when `a.data.forPlan` names one of their
//                          intentions, and LifeTally's life / survival / sleep / work grouping (scripts/lab/lab.ts LifeTally sets).
//   B  hungry time         every living awake (pose !== 'sleep') person with hunger < 62: TimeBudget category x food in the pack x
//                          food in the household's home store x hunger band x distance to the home building.
//   C  meals               the first tick a person's activity is eating: kind 'eat' or 'eat_store' in the work phase, or a shared
//                          meal (attend_meal / host_meal) whose `data.eating` is set; hunger then, the source, the wait since hunger
//                          last fell below 62, whether the person is under 12. Plus an audit of every bite (`lastAteTick` moving).
//   D  where the food is   once a day, at tick % DAY === 0, food units a head in packs, home stores, other building stores, piles,
//                          and the other places the conservation count (economy.ts totalItems) looks in.
import { readFileSync } from 'node:fs';
import { AGE_CHILD, CRITICAL, DAY, DRIVE_BANDS, HUNGER_RATE, NUTRITION, REVIEW_EVERY, SWITCH_MARGIN, isHomeType } from '../../src/sim/constants';
import { foodUnits } from '../../src/sim/economy';
import { ageYears } from '../../src/sim/people';
import { HUNGER_RATE_195, hasMetabolism, hungerRate } from '../../src/sim/metabolism';
import { RATION_HUNGER, RATION_KEEP, RATION_KEEP_206, RATION_REACH, hasRation, hasRationTwo, rationApplies, rationPortions } from '../../src/sim/light_pack';
import { MEAL_DUE, MEAL_GAP, hasChildFeeding } from '../../src/sim/child_feeding';
import { hasEatInHand } from '../../src/sim/eat_in_hand';
import { eatsAtTheStore } from '../../src/sim/tableeating';
import { DAY_FOOD, LOW_FOOD_DAYS, RESERVE_CAP, RESERVE_DAYS } from '../../src/sim/provision';
import type { Activity, Building, FoodKind, Household, Items, Person, World } from '../../src/sim/types';
import { LifeTally } from '../lab/lab';
import { TIME_CATEGORIES, timeCategory } from './time_budget';

/** the hungry line LifeTally uses (scripts/lab/lab.ts LifeTally.tick: `p.needs.hunger < 62`) */
export const HUNGRY_BELOW = 62;
/** the food kinds scripts/lab/lab.ts counts (FOOD_ITEMS, lab.ts:186; the const is not exported, so it is copied here verbatim) */
export const LAB_FOOD_ITEMS: readonly FoodKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat'];

const labFood = (items: Items | undefined): number => {
  if (!items) return 0;
  let n = 0;
  for (const k of LAB_FOOD_ITEMS) n += items[k] ?? 0;
  return n;
};
const fatOf = (items: Items | undefined): number => (items ? items.rendered_fat ?? 0 : 0);
const r2 = (x: number): number => Math.round(x * 100) / 100;
const r3 = (x: number): number => Math.round(x * 1000) / 1000;
const bump = (r: Record<string, number>, k: string, n = 1): void => { r[k] = (r[k] ?? 0) + n; };

type Tally = { ticks: number; hungry: number };
const tally = (m: Record<string, Tally>, k: string, hungry: boolean): void => {
  const t = (m[k] ??= { ticks: 0, hungry: 0 });
  t.ticks++;
  if (hungry) t.hungry++;
};
const tallyRows = (m: Record<string, Tally>) => Object.entries(m).map(([key, t]) => ({ key, ticks: t.ticks, hungry: t.hungry, notHungry: t.ticks - t.hungry })).sort((a, b) => b.ticks - a.ticks || a.key.localeCompare(b.key));
const sortedCounts = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));

/** quartiles by linear interpolation between order statistics (type 7); null fields when there is nothing to summarise */
export function stats(v: number[]) {
  if (!v.length) return { n: 0, mean: null, min: null, p25: null, median: null, p75: null, max: null };
  const s = [...v].sort((a, b) => a - b);
  const q = (f: number): number => { const x = (s.length - 1) * f, lo = Math.floor(x), hi = Math.ceil(x); return s[lo] + (s[hi] - s[lo]) * (x - lo); };
  let sum = 0;
  for (const x of s) sum += x;
  return { n: s.length, mean: r2(sum / s.length), min: r2(s[0]), p25: r2(q(0.25)), median: r2(q(0.5)), p75: r2(q(0.75)), max: r2(s[s.length - 1]) };
}

const HUNGER_HIST_BANDS = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'] as const;
function histogram10(v: number[]): Record<string, number> {
  const h: Record<string, number> = Object.fromEntries(HUNGER_HIST_BANDS.map((b) => [b, 0]));
  for (const x of v) h[HUNGER_HIST_BANDS[Math.max(0, Math.min(9, Math.floor(x / 10)))]]++;
  return h;
}

/** LifeTally's grouping of an activity (lab.ts LifeTally.end: SURVIVAL or a food gather, else SLEEP, else LIFE, else work), and the basis for it */
export function lifeGroupOf(a: Activity): { group: 'survival' | 'sleep' | 'life' | 'work'; basis: string } {
  const food = a.kind === 'gather' && LifeTally.FOOD_SOURCES.has(String(a.data.stype));
  if (LifeTally.SURVIVAL.has(a.kind)) return { group: 'survival', basis: 'in LifeTally.SURVIVAL' };
  if (food) return { group: 'survival', basis: 'gather of a food source (LifeTally.FOOD_SOURCES)' };
  if (LifeTally.SLEEP.has(a.kind)) return { group: 'sleep', basis: 'in LifeTally.SLEEP' };
  if (LifeTally.LIFE.has(a.kind)) return { group: 'life', basis: 'in LifeTally.LIFE' };
  return { group: 'work', basis: 'in no LifeTally set: reaches work only through the final else' };
}

/** awake and hungry-awake person counts for the state of a world as it stands (LifeTally.tick's awakeTicks / hungryTicks for one tick) */
export function wakingCounts(world: World): { awake: number; hungryAwake: number } {
  let awake = 0, hungryAwake = 0;
  for (const p of world.persons) {
    if (!p.alive || p.pose === 'sleep') continue;
    awake++;
    if (p.needs.hunger < HUNGRY_BELOW) hungryAwake++;
  }
  return { awake, hungryAwake };
}

interface PState {
  below: boolean;
  since: number;
  /** the person was first seen already below 62, so `since` is when the observer first saw them, not when they fell */
  censored: boolean;
  lastAte: number;
  prev: { id: number; kind: string; purpose: string } | null;
}
interface MealRow {
  tick: number;
  person: number;
  actId: number;
  kind: string;
  hunger: number;
  hungerAtDecision: number;
  walkTicks: number;
  source: string;
  detail: string;
  child: boolean;
  wait: number;
  censored: boolean;
  bites: number;
}
interface FoodRow {
  day: number;
  tick: number;
  heads: number;
  units: Record<string, number>;
  perHead: Record<string, number>;
  otherBuildingsByType: Record<string, number>;
  renderedFatUnits: number;
  standing: { wildSources: number; plotGrainStock: number };
}

// ───────────────────────────── source facts ─────────────────────────────
interface FactSpec { id: string; topic: string; file: string; after?: string; find: string; span?: number; value?: unknown }
const SIM = 'src/sim/';
function factSpecs(): FactSpec[] {
  return [
    // the drive that makes a person want to eat
    { id: 'hunger_drive_band', topic: 'the hunger drive: starts below 62, strongly pressing at 36', file: SIM + 'constants.ts', after: 'export const DRIVE_BANDS', find: 'hunger: [62, 36]', value: DRIVE_BANDS.hunger },
    { id: 'drive_formula', topic: 'drive(): 0 at or above the first band value, 0 to 60 across the band, 60 to 100 below the second', file: SIM + 'needs.ts', find: 'export function drive(', span: 8 },
    { id: 'critical_hunger', topic: 'the critical hunger line (a critical need filters the options in decision.ts rankOptions)', file: SIM + 'constants.ts', find: 'export const CRITICAL', value: CRITICAL.hunger },
    { id: 'eat_option_needs_drive', topic: 'no eating option at all is built when the hunger drive is 0 (hunger 62 or more)', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'if (dr <= 0) return;' },
    // the score of each way of eating
    { id: 'score_eat_pack', topic: 'score of "Eat what I am carrying": the drive plus 4', file: SIM + 'options_survival.ts', after: 'function optEat', find: "new Scorer().add('hungry', dr).add('food in pack', 4)" },
    { id: 'score_eat_store', topic: 'score of eating from a store: 0.92 x drive, less the walk (pen), +2 for the person\'s own home, +1 granary, -18 another household\'s home, -1 otherwise', file: SIM + 'options_survival.ts', after: 'function optEat', find: "add('hungry', dr * 0.92)" },
    { id: 'score_gather_to_eat', topic: 'score of gathering wild food to ease hunger: 0.85 x drive x a yield factor', file: SIM + 'options_survival.ts', after: 'export function foragePlans', find: "if (o.mode === 'eat') sc.add('hungry', o.urgency * 0.85" },
    { id: 'gather_to_eat_amount', topic: 'how many units a hungry gather aims at', file: SIM + 'options_survival.ts', after: 'export function foragePlans', find: "const need = o.mode === 'eat'" },
    { id: 'walk_penalty', topic: 'the walk costs 0.07 score points a tick', file: SIM + 'optutil.ts', find: 'export function pen(', span: 3 },
    { id: 'walk_eta', topic: 'walking ticks estimate (distance x 1.18 / speed)', file: SIM + 'optutil.ts', find: 'export function eta(', span: 3 },
    // what counts as food in the pack, and what holds a meal back
    { id: 'pack_food_test', topic: 'the eat option\'s test for food in the pack: foodUnits(p.inv) from rules 45', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'const food = runsRulesVersion(world, 45)' },
    { id: 'food_units_fn', topic: 'economy.ts foodUnits: sums FOOD_ORDER kinds (rendered_fat included)', file: SIM + 'economy.ts', find: 'export function foodUnits', span: 5 },
    { id: 'food_order', topic: 'FOOD_ORDER, the kinds foodUnits and pickFood count', file: SIM + 'economy.ts', find: 'const FOOD_ORDER' },
    { id: 'keep_for_dependants', topic: 'food kept back for dependants: two portions each, only while hunger is above 20, not for a child (rules with childhood)', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'const keep = p.needs.hunger > 20' },
    { id: 'blocked_for_dependants', topic: 'the pack meal is blocked, "saving the food for dependents", when carried food does not exceed the keep', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'saving the food for dependents' },
    { id: 'ration_home_lookup', topic: 'the ration applies (rationApplies) only if the person carries food; the home store is looked up from their belief', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'const rationHome = rationApplies' },
    { id: 'ration_held_call', topic: 'the pack meal is held back when rationHeld says so (food known at home, no recent failure there, walk home estimate)', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'const held = !!rationHome' },
    { id: 'ration_blocked_message', topic: 'the pack meal blocked as "keeping my ration for the road; there is food at home"', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'keeping my ration for the road' },
    { id: 'ration_held_fn', topic: 'rationHeld: held when carried <= RATION_KEEP, food known at home, hunger above RATION_HUNGER, walk home within RATION_REACH', file: SIM + 'light_pack.ts', find: 'export function rationHeld', span: 3 },
    { id: 'ration_keep', topic: 'portions kept on the person at rules 205', file: SIM + 'light_pack.ts', find: 'export const RATION_KEEP = ', value: RATION_KEEP },
    { id: 'ration_keep_206', topic: 'portions kept from rules 206', file: SIM + 'light_pack.ts', find: 'export const RATION_KEEP_206', value: RATION_KEEP_206 },
    { id: 'ration_hunger', topic: 'hunger at or below which the held ration may be eaten wherever the person is', file: SIM + 'light_pack.ts', find: 'export const RATION_HUNGER', value: RATION_HUNGER },
    { id: 'ration_reach', topic: 'walking ticks to home beyond which the ration is eaten on the road', file: SIM + 'light_pack.ts', find: 'export const RATION_REACH', value: RATION_REACH },
    { id: 'ration_applies', topic: 'who the ration applies to: not a child from rules 208', file: SIM + 'light_pack.ts', find: 'export function rationApplies', span: 3 },
    { id: 'ration_portions', topic: 'the ration is two portions from rules 206, one at 205', file: SIM + 'light_pack.ts', find: 'export const rationPortions' },
    { id: 'meal_leaves_ration', topic: 'a meal at a store leaves up to the ration in the pack', file: SIM + 'light_pack.ts', find: 'export function mealLeaves', span: 3 },
    // eating at a store / at home
    { id: 'store_candidates', topic: 'which stores a person will eat from: their household\'s home (or cellar), a storehouse, a pile they may take from', file: SIM + 'options_survival.ts', after: 'function optEat', find: "const mine = b.kind === 'building'" },
    { id: 'tempted_by_other_homes', topic: 'another household\'s home store is a candidate only for a very hungry (drive above 50) adult with no carried food', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'const tempted' },
    { id: 'store_known_empty', topic: 'a store remembered as empty is blocked', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'remembers it being empty' },
    { id: 'store_recent_failure', topic: 'a store where the person found nothing within 400 ticks is blocked', file: SIM + 'options_survival.ts', after: 'function optEat', find: 'went there recently and found nothing' },
    { id: 'store_meal_size', topic: 'a meal taken at a store takes up to ceil((92 - hunger) / 18) units', file: SIM + 'act_resource.ts', find: 'let want = Math.ceil((92 - p.needs.hunger) / 18)' },
    { id: 'meal_stop', topic: 'a meal ends when no food is left, hunger reaches 88, or the keep for dependants is reached', file: SIM + 'act_resource.ts', find: 'if (!next || p.needs.hunger >= 88' },
    { id: 'meal_bite_duration', topic: 'ticks a bite takes (WORK.eat)', file: SIM + 'constants.ts', find: '  eat: 10,' },
    // deferral by commitment and review
    { id: 'review_interval', topic: 'how often a person reconsiders what to do', file: SIM + 'constants.ts', find: 'export const REVIEW_EVERY', value: REVIEW_EVERY },
    { id: 'switch_margin', topic: 'a new option must beat the current activity by this factor (and 3 points)', file: SIM + 'constants.ts', find: 'export const SWITCH_MARGIN', value: SWITCH_MARGIN },
    { id: 'switch_rule', topic: 'the switch test in reviewActivity: not while committed (tick < minCommit), and only if better by the margin', file: SIM + 'decision.ts', find: 'const better = !external && best.util > cur * SWITCH_MARGIN + 3;' },
    { id: 'meal_under_way_kept', topic: 'a meal under way is finished while hunger is below 86 and some progress is made', file: SIM + 'decision.ts', find: "a.kind === 'eat_store') && a.phase === 'work' && a.need" },
    { id: 'min_commit_eat', topic: 'minimum commitment of an eat activity (ticks from its start)', file: SIM + 'options_survival.ts', after: "label: 'Eating',", find: 'minCommit: 20' },
    { id: 'min_commit_eat_store', topic: 'minimum commitment of an eat_store activity', file: SIM + 'options_survival.ts', after: "label: mine ? 'Eating at home'", find: 'minCommit: 40' },
    { id: 'eat_in_hand', topic: 'rules 158: a person serving hunger some other way eats food from their pack when that scores higher', file: SIM + 'eat_in_hand.ts', find: 'export function eatInHand', span: 6 },
    // the provision reserve and carers' feeding
    { id: 'reserve_day_food', topic: 'units of food a person eats in a day, as provision.ts assumes', file: SIM + 'provision.ts', find: 'export const DAY_FOOD', value: DAY_FOOD },
    { id: 'reserve_days', topic: 'days of food in the home reserve', file: SIM + 'provision.ts', find: 'export const RESERVE_DAYS', value: RESERVE_DAYS },
    { id: 'reserve_cap', topic: 'most units in the reserve', file: SIM + 'provision.ts', find: 'export const RESERVE_CAP', value: RESERVE_CAP },
    { id: 'reserve_target', topic: 'the household food target: DAY_FOOD x RESERVE_DAYS x members, capped, and bounded by room at home', file: SIM + 'provision.ts', find: 'const target = Math.min(DAY_FOOD * RESERVE_DAYS * members' },
    { id: 'reserve_low', topic: 'a household counts as low on food below DAY_FOOD x members x LOW_FOOD_DAYS', file: SIM + 'provision.ts', find: 'const low = inStore + carried', value: LOW_FOOD_DAYS },
    { id: 'low_food_days', topic: 'LOW_FOOD_DAYS', file: SIM + 'provision.ts', find: 'export const LOW_FOOD_DAYS' },
    { id: 'carer_meal_gap', topic: 'a carer treats a child as due a meal after this many ticks (rules 214)', file: SIM + 'child_feeding.ts', find: 'export const MEAL_GAP', value: MEAL_GAP },
    { id: 'carer_meal_due', topic: 'the hunger a carer acts on for a child who is due a meal (rules 214)', file: SIM + 'child_feeding.ts', find: 'export const MEAL_DUE', value: MEAL_DUE },
    // the drain, and what a unit is worth
    { id: 'hunger_rate_old', topic: 'base hunger drain a tick before rules 195', file: SIM + 'constants.ts', find: 'export const HUNGER_RATE', value: HUNGER_RATE },
    { id: 'hunger_rate_195', topic: 'base hunger drain a tick in a rich world from rules 195', file: SIM + 'metabolism.ts', find: 'export const HUNGER_RATE_195', value: HUNGER_RATE_195 },
    { id: 'hunger_rate_fn', topic: 'which base rate a world uses', file: SIM + 'metabolism.ts', find: 'export function hungerRate', span: 4 },
    { id: 'drain_multipliers', topic: 'hunger drain a tick: base x (child 0.85) x (harsh 1.18) x (asleep 0.55, heavy work 1.25, running 1.3)', file: SIM + 'needs.ts', find: 'const kidMul', span: 2 },
    { id: 'nutrition', topic: 'hunger restored by one unit of each food', file: SIM + 'constants.ts', find: 'export const NUTRITION', value: NUTRITION },
    // the lab's own food count, used for measure D
    { id: 'lab_food_items', topic: 'the food kinds scripts/lab/lab.ts counts as food in stores (copied as LAB_FOOD_ITEMS)', file: 'scripts/lab/lab.ts', find: 'const FOOD_ITEMS' },
    { id: 'lab_food_count', topic: 'the lab\'s count of food in building stores (outcomeOf: homeFood, allStoreFood)', file: 'scripts/lab/lab.ts', after: 'let homeFood = 0;', find: 'for (const k of FOOD_ITEMS) n += b.store.items[k] ?? 0;' },
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
  return { id: spec.id, topic: spec.topic, file: spec.file, line: at + 1, found: true, text: text.length > 700 ? text.slice(0, 700) + ' ...' : text, ...(spec.value !== undefined ? { liveValue: spec.value } : {}) };
}

// ───────────────────────────── the observer ─────────────────────────────
export class DayShape {
  // A
  private travelTicks = 0;
  private travelHungry = 0;
  private readonly aKind: Record<string, Tally> = {};
  private readonly aKindGroup: Record<string, Record<string, number>> = {};
  private readonly aKindBasis: Record<string, Set<string>> = {};
  private readonly aGroup: Record<string, Tally> = {};
  private readonly aPlan: Record<string, Tally> = {};
  private readonly aKindPlan: Record<string, Tally> = {};
  private readonly aNeed: Record<string, Tally> = {};
  private readonly aSub: Record<string, Tally> = {};
  // B
  private wakingTicks = 0;
  private livingTicks = 0;
  private hungryWaking = 0;
  private readonly bRows: Record<string, number> = {};
  private readonly bCategory: Record<string, number> = {};
  private readonly bPack: Record<string, number> = {};
  private readonly bHome: Record<string, number> = {};
  private readonly bBand: Record<string, number> = {};
  private readonly bDist: Record<string, number> = {};
  private readonly bChild: Record<string, number> = {};
  // B2: every waking tick by hunger in bands of 2, the time category, under 12 or not, and food in the pack or not
  private readonly wHunger: Record<string, number> = {};
  // C
  readonly meals: MealRow[] = [];
  private readonly state = new Map<number, PState>();
  private readonly decision = new Map<number, { tick: number; hunger: number }>();
  private readonly counted = new Map<number, MealRow>();
  private bitesTotal = 0;
  private readonly bitesByChannel: Record<string, number> = {};
  // D
  private readonly foodRows: FoodRow[] = [];
  // bookkeeping
  private ticks = 0;
  private firstTick: number | null = null;
  private lastTick = 0;
  private firstCounts: { tick: number; awake: number; hungryAwake: number } | null = null;
  private live: Record<string, unknown> = {};

  sampleTick(world: World): void {
    const tick = world.tick;
    if (this.firstTick === null) {
      this.firstTick = tick;
      this.firstCounts = { tick, ...wakingCounts(world) };
      this.live = this.liveRules(world);
    }
    this.ticks++;
    this.lastTick = tick;
    if (tick % DAY === 0) { this.sampleFood(world); this.prune(world); }
    let hhMap: Map<number, Household> | null = null;
    const homeOf = (p: Person): Building | null => {
      hhMap ??= new Map(world.households.map((h) => [h.id, h]));
      const hh = hhMap.get(p.hhId);
      if (!hh || !hh.homeId) return null;
      const e = world.byId.get(hh.homeId);
      return e && e.ent === 'building' ? e : null;
    };
    for (const p of world.persons) {
      if (!p.alive) continue;
      this.livingTicks++;
      const hunger = p.needs.hunger;
      const hungry = hunger < HUNGRY_BELOW;
      const a = p.activity;
      const cat = timeCategory(p, tick);
      let st = this.state.get(p.id);
      const firstSight = !st;
      if (!st) { st = { below: false, since: tick, censored: false, lastAte: p.lastAteTick, prev: null }; this.state.set(p.id, st); }
      if (hungry) { if (!st.below) { st.below = true; st.since = tick; st.censored = firstSight; } } else st.below = false;
      // A
      if (cat === 'travel' && a) this.addTravel(p, a, hungry);
      // B
      if (p.pose !== 'sleep') {
        this.wakingTicks++;
        bump(this.wHunger, `${Math.min(98, Math.floor(hunger / 2) * 2)}|${cat}|${ageYears(world, p) < AGE_CHILD ? 'under_12' : '12_and_over'}|${foodUnits(p.inv) > 0 ? 'food' : 'none'}`);
        if (hungry) this.addHungry(p, cat, hunger, homeOf(p), world);
      }
      // C
      if (a) this.watchMeal(world, p, st, a, hunger, tick, homeOf);
      if (p.lastAteTick !== st.lastAte) { this.noteBite(st); st.lastAte = p.lastAteTick; }
      st.prev = a ? { id: a.id, kind: a.kind, purpose: typeof a.data.purpose === 'string' ? a.data.purpose : '' } : null;
    }
  }

  // ── A ──
  private addTravel(p: Person, a: Activity, hungry: boolean): void {
    this.travelTicks++;
    if (hungry) this.travelHungry++;
    tally(this.aKind, a.kind, hungry);
    const lg = lifeGroupOf(a);
    tally(this.aGroup, lg.group, hungry);
    bump((this.aKindGroup[a.kind] ??= {}), lg.group);
    (this.aKindBasis[a.kind] ??= new Set()).add(lg.group + ': ' + lg.basis);
    const forPlan = a.data.forPlan;
    const plan = forPlan === undefined ? null : p.intentions.find((i) => i.id === forPlan);
    const planKind = forPlan === undefined ? 'no_plan' : plan ? plan.kind : 'plan_not_found';
    tally(this.aPlan, planKind, hungry);
    tally(this.aKindPlan, a.kind + ' | ' + planKind, hungry);
    tally(this.aNeed, a.need ?? 'none', hungry);
    if (a.kind === 'gather') tally(this.aSub, `gather | purpose=${typeof a.data.purpose === 'string' ? a.data.purpose : 'none'} | stype=${String(a.data.stype ?? 'none')}`, hungry);
    else if (a.kind === 'deposit') tally(this.aSub, 'deposit | ' + (a.data.ration ? 'ration' : a.data.basketRoom ? 'basketRoom' : a.data.packMaterials ? 'packMaterials' : 'other'), hungry);
    else if (a.kind === 'eat_store') tally(this.aSub, 'eat_store | ' + (a.data.steal ? 'from another household (steal)' : 'own or shared store'), hungry);
  }

  // ── B ──
  private addHungry(p: Person, cat: string, hunger: number, home: Building | null, world: World): void {
    this.hungryWaking++;
    const pack = foodUnits(p.inv) > 0 ? 'food' : 'none';
    const store = home ? (foodUnits(home.store.items) > 0 ? 'food' : 'empty') : 'no_home';
    const band = hunger < 20 ? '0-19' : hunger < 40 ? '20-39' : '40-61';
    const tiles = home ? Math.floor(Math.hypot(p.x - (home.x + home.w / 2), p.y - (home.y + home.h / 2))) : -1;
    const dist = !home ? 'no_home' : tiles <= 8 ? '0-8' : tiles <= 20 ? '9-20' : 'over20';
    bump(this.bRows, [cat, pack, store, band, dist].join('|'));
    bump(this.bCategory, cat);
    bump(this.bPack, pack);
    bump(this.bHome, store);
    bump(this.bBand, band);
    bump(this.bDist, dist);
    bump(this.bChild, ageYears(world, p) < AGE_CHILD ? 'under_12' : '12_and_over');
  }

  // ── C ──
  private watchMeal(world: World, p: Person, st: PState, a: Activity, hunger: number, tick: number, homeOf: (p: Person) => Building | null): void {
    const isEat = a.kind === 'eat' || a.kind === 'eat_store';
    const isShared = (a.kind === 'attend_meal' || a.kind === 'host_meal') && a.data.eating === true;
    if (isEat && !this.decision.has(a.id)) this.decision.set(a.id, { tick, hunger });
    if (!((isEat && a.phase === 'work') || isShared) || this.counted.has(a.id)) return;
    let source = 'other', detail = 'shared_meal:' + a.kind;
    if (a.kind === 'eat') { source = 'own_pack'; detail = 'own_pack'; }
    else if (a.kind === 'eat_store') {
      const t = world.byId.get(a.targetId);
      if (!t) detail = 'target_gone';
      else if (t.ent === 'pile') detail = 'pile';
      else if (t.ent !== 'building') detail = 'target:' + t.ent;
      else {
        const home = homeOf(p);
        const steal = a.data.steal ? ':steal' : '';
        if (home && home.id === t.id) { source = 'home_store'; detail = 'home_store:' + t.type + steal; }
        else { source = 'other_building_store'; detail = t.type + (t.hhId === p.hhId ? ':own_household' : t.hhId === 0 ? ':shared(hh0)' : ':other_household') + steal; }
      }
    }
    const d = this.decision.get(a.id);
    const row: MealRow = {
      tick, person: p.id, actId: a.id, kind: a.kind, hunger: r2(hunger), hungerAtDecision: r2(d ? d.hunger : hunger), walkTicks: d ? tick - d.tick : 0,
      source, detail, child: ageYears(world, p) < AGE_CHILD, wait: st.below ? tick - st.since : 0, censored: st.below && st.censored, bites: 0,
    };
    this.meals.push(row);
    this.counted.set(a.id, row);
    this.decision.delete(a.id);
  }

  /** a bite fell in the tick that has just been stepped; the activity the person had at the previous sample is the one that ate */
  private noteBite(st: PState): void {
    this.bitesTotal++;
    const prev = st.prev;
    let channel: string;
    if (!prev) channel = 'other: no activity';
    else if (prev.kind === 'eat' || prev.kind === 'eat_store') channel = prev.kind;
    else if (prev.kind === 'attend_meal' || prev.kind === 'host_meal') channel = 'shared_meal';
    else if (prev.kind === 'gather' && prev.purpose === 'eat') channel = 'gather_on_the_spot';
    else channel = 'other: ' + prev.kind;
    bump(this.bitesByChannel, channel);
    const row = prev ? this.counted.get(prev.id) : undefined;
    if (row) row.bites++;
  }

  private prune(world: World): void {
    const alive = new Set<number>();
    for (const p of world.persons) if (p.alive) alive.add(p.id);
    for (const id of [...this.state.keys()]) if (!alive.has(id)) this.state.delete(id);
    for (const [id, d] of [...this.decision]) if (world.tick - d.tick > 3 * DAY) this.decision.delete(id);
  }

  // ── D ──
  private sampleFood(world: World): void {
    let fat = 0;
    const u: Record<string, number> = { packs: 0, homeStores: 0, otherBuildings: 0, piles: 0, pileCarcasses: 0, buildingJobsHeld: 0, siteDelivered: 0, carts: 0, mealTables: 0 };
    const byType: Record<string, number> = {};
    const take = (bucket: string, items: Items | undefined): number => { const n = labFood(items); u[bucket] += n; fat += fatOf(items); return n; };
    let heads = 0;
    for (const p of world.persons) if (p.alive) { heads++; take('packs', p.inv); }
    for (const b of world.buildings) {
      if (isHomeType(b.type)) take('homeStores', b.store.items);
      else { const n = take('otherBuildings', b.store.items); if (n > 0) bump(byType, b.type, n); }
      if (b.ops?.job) take('buildingJobsHeld', b.ops.job.held);
    }
    for (const s of world.sites) take('siteDelivered', s.delivered);
    for (const pile of world.piles) { take('piles', pile.items); if (pile.carcass) take('pileCarcasses', pile.carcass.remaining); }
    for (const c of world.carts) take('carts', c.load);
    for (const m of world.meals) if (m.status !== 'done' && m.status !== 'cancelled') take('mealTables', m.table);
    let wild = 0, plots = 0;
    for (const s of world.sources) if (s.amount > 0 && (LAB_FOOD_ITEMS as readonly string[]).includes(s.item)) wild += s.amount;
    for (const pl of world.plots) if (pl.stock > 0) plots += pl.stock;
    u.otherHeld = u.pileCarcasses + u.buildingJobsHeld + u.siteDelivered + u.carts + u.mealTables;
    u.heldTotal = u.packs + u.homeStores + u.otherBuildings + u.piles + u.otherHeld;
    const h = Math.max(1, heads);
    const perHead: Record<string, number> = {};
    for (const k of Object.keys(u)) perHead[k] = r3(u[k] / h);
    this.foodRows.push({ day: r3(world.tick / DAY), tick: world.tick, heads, units: u, perHead, otherBuildingsByType: byType, renderedFatUnits: fat, standing: { wildSources: wild, plotGrainStock: plots } });
  }

  // ── what the world runs under, read from the pure rule functions ──
  private liveRules(world: World): Record<string, unknown> {
    return {
      rulesVersion: world.settings.rulesVersion, dynamics: world.settings.dynamics, harsh: world.settings.harsh,
      baseHungerRatePerTick: hungerRate(world), hasMetabolism195: hasMetabolism(world),
      hasRation205: hasRation(world), hasRationTwo206: hasRationTwo(world), rationPortions: rationPortions(world),
      rationAppliesToAdult: rationApplies(world, false), rationAppliesToChild: rationApplies(world, true),
      hasChildFeeding214: hasChildFeeding(world), hasEatInHand158: hasEatInHand(world), eatsAtTheStore9: eatsAtTheStore(world),
    };
  }

  // ── report ──
  /** the meals as compact rows, for a side file: columns then rows */
  mealRows() {
    return {
      columns: ['tick', 'person', 'actId', 'kind', 'hunger', 'hungerAtDecision', 'walkTicks', 'source', 'detail', 'child', 'waitTicks', 'waitCensored', 'bites'],
      rows: this.meals.map((m) => [m.tick, m.person, m.actId, m.kind, m.hunger, m.hungerAtDecision, m.walkTicks, m.source, m.detail, m.child ? 1 : 0, m.wait, m.censored ? 1 : 0, m.bites]),
    };
  }

  private mealSummary(rows: MealRow[]) {
    const wait = rows.map((m) => m.wait);
    return {
      count: rows.length,
      startedBelow62: rows.filter((m) => m.hunger < HUNGRY_BELOW).length,
      withAtLeastOneBite: rows.filter((m) => m.bites > 0).length,
      hungerAtStartHistogram10: histogram10(rows.map((m) => m.hunger)),
      hungerAtStart: stats(rows.map((m) => m.hunger)),
      hungerAtDecision: stats(rows.map((m) => m.hungerAtDecision)),
      walkTicksFromDecision: stats(rows.map((m) => m.walkTicks)),
      hungryWaitTicks: stats(wait),
      hungryWaitTicksExcludingCensored: stats(rows.filter((m) => !m.censored).map((m) => m.wait)),
      censoredWaits: rows.filter((m) => m.censored).length,
    };
  }

  report() {
    const kinds = tallyRows(this.aKind).map((r) => ({ ...r, groups: sortedCounts(this.aKindGroup[r.key] ?? {}), groupBasis: [...(this.aKindBasis[r.key] ?? [])].sort() }));
    const groupRows = tallyRows(this.aGroup);
    const sum = (m: Record<string, number>): number => Object.values(m).reduce((a, b) => a + b, 0);
    const crossRows = Object.entries(this.bRows).map(([key, ticks]) => {
      const [category, packFood, homeStoreFood, hungerBand, homeDistanceTiles] = key.split('|');
      return { category, packFood, homeStoreFood, hungerBand, homeDistanceTiles, ticks };
    }).sort((a, b) => b.ticks - a.ticks);
    const sources = ['own_pack', 'home_store', 'other_building_store', 'other'];
    const bySource = Object.fromEntries(sources.map((s) => [s, this.mealSummary(this.meals.filter((m) => m.source === s))]));
    const byChild = { under_12: this.mealSummary(this.meals.filter((m) => m.child)), age_12_and_over: this.mealSummary(this.meals.filter((m) => !m.child)) };
    const detailCounts: Record<string, number> = {};
    for (const m of this.meals) bump(detailCounts, m.source + ' / ' + m.detail);
    const foodMean = (pick: (r: FoodRow) => number): number => (this.foodRows.length ? r3(this.foodRows.reduce((a, r) => a + pick(r), 0) / this.foodRows.length) : 0);
    const typeSet = new Set<string>();
    for (const r of this.foodRows) for (const t of Object.keys(r.otherBuildingsByType)) typeSet.add(t);
    const meanPerHead: Record<string, number> = {}, meanUnits: Record<string, number> = {};
    for (const k of this.foodRows.length ? Object.keys(this.foodRows[0].units) : []) { meanPerHead[k] = foodMean((r) => r.perHead[k]); meanUnits[k] = foodMean((r) => r.units[k]); }
    const meanByType: Record<string, number> = {};
    for (const t of [...typeSet].sort()) meanByType[t] = foodMean((r) => (r.otherBuildingsByType[t] ?? 0) / Math.max(1, r.heads));
    const selfChecks = {
      travelKindsSumToTravelTicks: kinds.reduce((a, r) => a + r.ticks, 0) === this.travelTicks,
      travelGroupsSumToTravelTicks: groupRows.reduce((a, r) => a + r.ticks, 0) === this.travelTicks,
      travelPlansSumToTravelTicks: tallyRows(this.aPlan).reduce((a, r) => a + r.ticks, 0) === this.travelTicks,
      crossTabSumsToHungryWaking: crossRows.reduce((a, r) => a + r.ticks, 0) === this.hungryWaking,
      everyMarginalSumsToHungryWaking: [this.bCategory, this.bPack, this.bHome, this.bBand, this.bDist, this.bChild].every((m) => sum(m) === this.hungryWaking),
      foodRowsOnePerDay: this.foodRows.length > 0 && this.foodRows.every((r, i) => i === 0 || r.tick - this.foodRows[i - 1].tick === DAY),
      mealBitesPlusOthersEqualBites: sum(this.bitesByChannel) === this.bitesTotal,
    };
    return {
      observer: 'DayShape',
      readOnly: 'reads the world only; no write, no random draw; the runner checks the saved state is byte-identical around a sample every 120 ticks and the end hash against an unobserved run',
      sampledTicks: this.ticks, firstTick: this.firstTick, lastTick: this.lastTick, livingPersonTicks: this.livingTicks,
      firstSampleCounts: this.firstCounts,
      rulesInForce: this.live,
      walking: {
        method: "Person-ticks for which timeCategory(p, tick) (scripts/observers/time_budget.ts, the function TimeBudget itself calls) is 'travel': an activity in the travel phase that is not blocked. Attributed to the activity's kind, its need, the plan kind found by a.data.forPlan in the person's own intentions ('no_plan' when the activity carries no forPlan, 'plan_not_found' when it names a plan the person no longer holds), and the group LifeTally gives the kind (scripts/lab/lab.ts LifeTally.end). LifeTally has no explicit work set: a kind in none of its sets (and not a food gather) reaches 'work' by the final else, so every kind under 'work' here is a kind the mapping does not name; each row says which basis put it in its group. Hungry means hunger < 62.",
        travelTicks: this.travelTicks, travelHungryTicks: this.travelHungry, travelNotHungryTicks: this.travelTicks - this.travelHungry,
        byActivityKind: kinds,
        byLifeTallyGroup: groupRows,
        byPlanKind: tallyRows(this.aPlan),
        byActivityKindAndPlanKind: tallyRows(this.aKindPlan),
        byActivityNeed: tallyRows(this.aNeed),
        bySubkind: tallyRows(this.aSub),
      },
      hungryTime: {
        method: "Person-ticks of living people who are awake (pose !== 'sleep', LifeTally's test) with hunger < 62. Category is timeCategory (time_budget.ts). packFood: foodUnits(p.inv) > 0 (economy.ts foodUnits: the test optEat applies from rules 45, options_survival.ts). homeStoreFood: the household's homeId building's store, foodUnits(store.items) > 0 ('empty' when it holds none; 'no_home' when the household has no home building). Hunger bands 0-19, 20-39, 40-61. Distance: the person's (x, y) to the centre of the home building (x + w/2, y + h/2), in tiles, floored: 0-8, 9-20, over20 (21 or more); 'no_home' when there is none. A person indoors counts at the position the sim holds for them.",
        wakingTicks: this.wakingTicks, hungryWakingTicks: this.hungryWaking, hungryShareOfWaking: this.wakingTicks ? r3(this.hungryWaking / this.wakingTicks) : 0,
        crossTab: crossRows,
        wakingByHunger: Object.entries(this.wHunger).map(([key, ticks]) => { const [band, category, stage, packFood] = key.split('|'); return { hungerFrom: Number(band), category, stage, packFood, ticks }; }).sort((a, b) => a.hungerFrom - b.hungerFrom || b.ticks - a.ticks),
        marginals: {
          category: sortedCounts(this.bCategory), packFood: sortedCounts(this.bPack), homeStoreFood: sortedCounts(this.bHome),
          hungerBand: sortedCounts(this.bBand), homeDistanceTiles: sortedCounts(this.bDist), stage: sortedCounts(this.bChild),
        },
        categoriesPossible: TIME_CATEGORIES,
      },
      meals: {
        method: "A meal starts on the first sampled tick on which a person's activity is (1) kind 'eat' (a meal from the pack, source own_pack) or kind 'eat_store' (a meal at a store: source home_store when the target building is the household's homeId, other_building_store for any other building, 'other' for a pile or a store that is gone), in the work phase (phase 'work': an eat_store is not counted while it is still walking to the store; hunger then is the hunger on arrival, and hungerAtDecision is the hunger the first time the activity was seen, which is the tick after it was chosen), or (2) kind attend_meal or host_meal with data.eating set (source 'other', detail shared_meal). Each activity id is counted once. Hungry wait: ticks from the sampled tick at which hunger last went from >= 62 to < 62 to the meal start (0 when hunger is 62 or more at the start); a person first seen already below 62 has a censored wait, counted from the first sample and listed separately. Under 12: ageYears < AGE_CHILD (12). Quartiles by linear interpolation between order statistics.",
        ...this.mealSummary(this.meals),
        bySource,
        byChild,
        sourceDetailCounts: sortedCounts(detailCounts),
        biteAudit: {
          method: "Every tick in which a person's lastAteTick moved (set by every takeNutrition caller in the sim: act_resource.ts eat tick and gather-on-the-spot, meals.ts shared meal, hand_feeding.ts). Channel is the activity the person had at the previous sample. Bites outside the counted meals show what the meal list does not cover.",
          biteEvents: this.bitesTotal, byChannel: sortedCounts(this.bitesByChannel),
        },
      },
      foodWhereItIs: {
        method: "At tick % DAY === 0 (dayFraction 0.30, 07:12; in arm C the dawn top-up at tick % DAY === 2280 has already happened). Units are counted with the lab's food kinds (LAB_FOOD_ITEMS = scripts/lab/lab.ts FOOD_ITEMS, lab.ts:186: no function; outcomeOf sums b.store.items over that constant); rendered_fat, which economy.ts foodUnits counts and the lab does not, is reported apart as renderedFatUnits. packs: living persons' inv. homeStores: building stores where isHomeType(b.type). otherBuildings: every other building's store, by building type. piles: pile.items. otherHeld: carcass remains in piles, batch inputs held by workplaces (b.ops.job.held), site.delivered, cart loads, tables of meals not done or cancelled: the containers economy.ts totalItems adds up. heldTotal is the sum of those. standing (wild source stock and farm plot grain stock) is food that is not held and is outside heldTotal. A head is a living person.",
        foodKinds: LAB_FOOD_ITEMS, daily: this.foodRows, meanOverRun: { days: this.foodRows.length, perHead: meanPerHead, units: meanUnits, otherBuildingsByTypePerHead: meanByType },
      },
      selfChecks,
      sourceFacts: {
        note: 'Each fact is a line (or a few) read from the source file in this worktree when the report was made: file, 1-based line, text. liveValue is the exported constant itself where there is one. "found: false" means the line was not found by that anchor.',
        facts: factSpecs().map(quote),
      },
    };
  }
}
