// SCRATCH ONLY (pace probe, 17 November 2026). Runner for the pace experiment: is the simulated day too short for the world's physical
// scale? A day N times longer, with needs, work, growth and decay kept in proportion, gives a resident the same time budget as a day
// of today's length in which everything that moves covers N times the ground per tick. This runner sets that N (src/sim/pace.ts,
// scratch setter) before the save is loaded, then runs scripts/trip_probe.ts's loop, step for step (which is day_probe.ts's, which is
// regime_probe.ts's): the same arm A and arm C, the same arm C top-up, the same order of operations, the same purity check every 120
// ticks and conservation stop. TripShape and DayShape are both attached (both only read), DayShape sampled exactly as day_probe.ts
// samples it. Nothing here changes a rule; arm C is STAGED and done in this runner, exactly as trip_probe and regime_probe do it.
//
//   node node_modules/vite-node/dist/cli.mjs scripts/pace_probe.ts -- --load <save> --days N --arm A|C --pace <f> --out <fresh folder>
//
//   --pace f  the pace factor (finite, above 0). People, wolves, deer and sheep each cover f times the ground per tick they did. At 1
//             the world is bit for bit what it was (a product with 1 is exact), so the hash is the unmodified tree's.
//   A  control: the save continued unchanged.
//   C  fed (STAGED): at the start and at each dawn every household's home store is topped up to FED_DAYS days of food a head with
//      bread, through economy.ts `produce` under the ledger reason STAGED_REASON, bounded by the store's room (regime_probe.ts).
//   B  (plenty) is refused: it is not part of this probe.
//
// Writes report.json, provenance.json, trips.jsonl (one line per walk) and meals.json into the fresh --out folder. The pace is recorded
// at the top level of report.json and in provenance.json. Exits 1 if the run did not reach its horizon or either travel tick total
// (TripShape's, DayShape's) differs from TimeBudget's travel total.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import { conservationReport, produce } from '../src/sim/economy';
import { DAY, SUNRISE } from '../src/sim/constants';
import { dayFraction } from '../src/sim/environment';
import { hungerRate } from '../src/sim/metabolism';
import { nutritionOf } from '../src/sim/bread_feeds';
import { ageYears } from '../src/sim/people';
import { winterDepth } from '../src/sim/hardship';
import { plentyFactors } from '../src/sim/plenty';
import { paceFactor, setPace } from '../src/sim/pace';
import type { FoodKind, World } from '../src/sim/types';
import { TimeBudget } from './observers/time_budget';
import { DayShape, wakingCounts } from './observers/day_shape';
import { TripShape } from './observers/trip_shape';
import { gitProvenance, sourceManifest } from './observers/provenance';
import { LifeTally } from './lab/lab';

// `git status` may refresh the index; ask it not to take optional locks, so the run touches no repository state
process.env.GIT_OPTIONAL_LOCKS = '0';

const args = process.argv.slice(2).filter((a) => a !== '--');
const arg = (key: string, fallback = ''): string => { const i = args.indexOf('--' + key); return i < 0 ? fallback : args[i + 1]; };
const out = arg('out'), days = Number(arg('days', '30')), arm = arg('arm', 'A'), input = arg('load');
if (!out || existsSync(out)) throw new Error('--out must name a folder that does not exist yet');
if (!input || !existsSync(input)) throw new Error('--load must name an existing save');
if (!Number.isFinite(days) || days <= 0) throw new Error('--days must be positive');
if (arm === 'B') throw new Error('--arm B (plenty) is refused: this probe runs arm A (control) or arm C (fed, staged)');
if (!['A', 'C'].includes(arm)) throw new Error('--arm is A (control) or C (fed, staged)');
if (!args.includes('--pace')) throw new Error('--pace <f> is required (finite, above 0; 1 is the unmodified pace)');
const pace = Number(arg('pace'));
if (!Number.isFinite(pace) || pace <= 0) throw new Error('--pace must be finite and greater than 0');
setPace(pace); // before the save is loaded and before the first step

const FED_DAYS = 3;
const STAGED_REASON = 'staged_regime_topup';
const FOOD: readonly FoodKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat'];
const ARM_NAME: Record<string, string> = { A: 'control', C: 'fed (STAGED)' };

const w: World = deserializeWorld(readFileSync(input, 'utf8'));
const from = w.tick, until = from + Math.round(days * DAY), began = performance.now();
const startHash = hashWorld(w);
mkdirSync(out, { recursive: true });
const paths = ['src', 'scripts/observers'].flatMap((root) => readdirSync(root, { recursive: true }).map(String).filter((p) => p.endsWith('.ts')).map((p) => root + '/' + p.replace(/\\/g, '/'))).concat('scripts/pace_probe.ts', 'scripts/lab/lab.ts').sort();
const manifest = () => sourceManifest(paths);
const source = manifest();
writeFileSync(out + '/provenance.json', JSON.stringify({ ...gitProvenance(), arm, armName: ARM_NAME[arm], staged: arm === 'C', pace: paceFactor(), commandLine: process.argv.slice(1), settings: w.settings, input, from, until, plentyFactors: plentyFactors(), source }, null, 2));

// Arm C only. STAGED: units appear from outside the world. They are entered in the ledger under STAGED_REASON, so the
// conservation check still balances and the delta is exactly ledger.reasons['+' + STAGED_REASON]. (As regime_probe.ts.)
const topUps: { tick: number; day: number; households: number; noHome: number; headsNoHome: number; wanted: number; placed: number }[] = [];
function topUp(world: World): void {
  const perHead = FED_DAYS * hungerRate(world) * DAY;
  const loaf = nutritionOf(world, 'bread');
  const row = { tick: world.tick, day: Math.round((world.tick / DAY) * 100) / 100, households: 0, noHome: 0, headsNoHome: 0, wanted: 0, placed: 0 };
  for (const hh of world.households) {
    const heads = hh.members.filter((id) => { const m = world.byId.get(id); return !!m && m.ent === 'person' && m.alive; }).length;
    if (heads === 0) continue;
    const home = world.byId.get(hh.homeId);
    if (!home || home.ent !== 'building' || !home.store) { row.noHome++; row.headsNoHome += heads; continue; }
    let have = 0;
    for (const k of FOOD) have += (home.store.items[k] ?? 0) * nutritionOf(world, k);
    const want = Math.ceil(Math.max(0, perHead * heads - have) / loaf);
    row.households++;
    if (want <= 0) continue;
    row.wanted += want;
    row.placed += produce(world, home.store.items, home.store.cap, 'bread', want, STAGED_REASON);
  }
  topUps.push(row);
}
const isDawn = (tick: number): boolean => dayFraction(tick) >= SUNRISE && dayFraction(tick - 1) < SUNRISE;

const startPeople = new Set(w.persons.filter((p) => p.alive).map((p) => p.id));
const startDeaths = w.deceased.length;
const life = new LifeTally();
w.hooks = { onActivityEnd: (p, a, outcome) => life.end(w, p, a, outcome) };
const observer = new TimeBudget(), detach = observer.attach(w);
const trips = new TripShape(), detachTrips = trips.attach(w);
const shape = new DayShape();
const dayRows: { day: number; people: number; deathsSoFar: number; winter: number; hardship: string }[] = [];
let stop = 'horizon', purityChecks = 0;
while (w.tick < until) {
  if (arm === 'C' && (w.tick === from || isDawn(w.tick))) topUp(w); // staged, and the only write this runner makes to the world
  const check = w.tick % 120 === 0;
  const before = check ? serializeWorld(w) : '';
  if (w.tick > from) life.tick(w); // the state each step left, as scripts/generation_trace.ts reads it
  observer.sampleTick(w);
  trips.sampleTick(w);
  shape.sampleTick(w);
  if (check) {
    observer.samplePlans(w);
    if (serializeWorld(w) !== before) throw new Error('Observation mutated saved state or RNG');
    purityChecks++;
  }
  stepWorld(w);
  if (w.tick % DAY === 0) {
    dayRows.push({ day: w.tick / DAY, people: w.persons.filter((p) => p.alive).length, deathsSoFar: w.deceased.length - startDeaths, winter: Math.round(winterDepth(w) * 100) / 100, hardship: w.hardship ? w.hardship.kind : '' });
    if (!conservationReport(w).ok) { stop = 'conservation'; break; }
  }
}
life.tick(w);
trips.finish(w); // the state after the last step: settles walks the last step ended; counts no ticks
detachTrips();
detach();
if (JSON.stringify(source) !== JSON.stringify(manifest())) throw new Error('Source changed during run');

const tb = observer.report();
if (Object.values(tb.totals).reduce((a, b) => a + b, 0) !== tb.livingTicks) throw new Error('Time categories do not partition living-person ticks');
const tr = trips.report(tb.totals.travel);
const rows = trips.tripRows();
const ds = shape.report();

// the travel totals must be one number: TripShape and DayShape read the same state through the same function TimeBudget uses
const tripTicks = tr.counts.walkingTicksAll;
const travelCheck = { tripTicks, timeBudgetTravelTicks: tb.totals.travel, equal: tripTicks === tb.totals.travel };
const dayTravelCheck = { dayShapeTravelTicks: ds.walking.travelTicks, timeBudgetTravelTicks: tb.totals.travel, equal: ds.walking.travelTicks === tb.totals.travel };
// LifeTally samples the states at ticks from+1 .. until; TripShape and DayShape the states at from .. until-1. Reconcile them by moving the boundary.
const lastCounts = wakingCounts(w), firstCounts = trips.firstSampleCounts ?? { tick: from, awake: 0 };
const expectedAwake = trips.awakePersonTicks - firstCounts.awake + lastCounts.awake;
const lifeTallyCheck = {
  note: 'LifeTally counts the states at ticks from+1..until, TripShape those at from..until-1: TripShape less its first tick plus the end state should equal LifeTally',
  lifeAwakeTicks: life.awakeTicks, expectedAwakeTicks: expectedAwake, equal: life.awakeTicks === expectedAwake,
};
const dayFirstCounts = ds.firstSampleCounts ?? { tick: from, awake: 0, hungryAwake: 0 };
const dayExpectedAwake = ds.hungryTime.wakingTicks - dayFirstCounts.awake + lastCounts.awake;
const dayExpectedHungry = ds.hungryTime.hungryWakingTicks - dayFirstCounts.hungryAwake + lastCounts.hungryAwake;
const dayLifeTallyCheck = {
  note: 'LifeTally counts the states at ticks from+1..until, DayShape those at from..until-1: DayShape less its first tick plus the end state should equal LifeTally',
  lifeAwakeTicks: life.awakeTicks, expectedAwakeTicks: dayExpectedAwake, lifeHungryTicks: life.hungryTicks, expectedHungryTicks: dayExpectedHungry,
  equal: life.awakeTicks === dayExpectedAwake && life.hungryTicks === dayExpectedHungry,
  lifeMealsFromPack: life.mealsFromPack, lifeMealsFromStore: life.mealsFromStore, lifeMealsSat: life.mealsSat,
  dayShapeMealStarts: ds.meals.count, dayShapeOwnPackStarts: ds.meals.bySource.own_pack.count,
  dayShapeStoreStarts: ds.meals.bySource.home_store.count + ds.meals.bySource.other_building_store.count + ds.meals.bySource.other.count,
};
const deaths = w.deceased.slice(startDeaths);
const causes: Record<string, number> = {};
for (const d of deaths) causes[d.cause] = (causes[d.cause] ?? 0) + 1;
let born = 0, came = 0;
for (const p of w.persons) if (!startPeople.has(p.id)) { if (ageYears(w, p) < 1) born++; else came++; }
const people = { start: startPeople.size, end: w.persons.filter((p) => p.alive).length, born, came, died: deaths.length, causes };
const staged = arm === 'C' ? { reason: STAGED_REASON, fedDays: FED_DAYS, kind: 'bread', loafWorth: nutritionOf(w, 'bread'), unitsCreated: w.ledger.reasons['+' + STAGED_REASON] ?? 0, wanted: topUps.reduce((n, r) => n + r.wanted, 0), placed: topUps.reduce((n, r) => n + r.placed, 0), topUps } : null;
const report = {
  seed: w.settings.seed, arm, armName: ARM_NAME[arm], staged: arm === 'C', pace: paceFactor(), rulesVersion: w.settings.rulesVersion, immigration: w.settings.immigration,
  input, commandLine: process.argv.slice(1), command: ['node', 'node_modules/vite-node/dist/cli.mjs', 'scripts/pace_probe.ts', '--', ...args].join(' '), cwd: process.cwd(), from, until, tick: w.tick, startDay: from / DAY, endDay: w.tick / DAY, stop, seconds: Math.round((performance.now() - began) / 100) / 10,
  startHash, hash: hashWorld(w), plentyFactors: plentyFactors(),
  people,
  travelCheck, dayTravelCheck, lifeTallyCheck, dayLifeTallyCheck,
  conservation: conservationReport(w), purityChecks, stagedTopUp: staged,
  timeBudget: { livingTicks: tb.livingTicks, totals: tb.totals },
  days: dayRows,
  tripFile: { path: 'trips.jsonl', lines: rows.length },
  tripShape: tr,
  dayShape: ds,
};
writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
writeFileSync(out + '/trips.jsonl', '');
for (let i = 0; i < rows.length; i += 2000) appendFileSync(out + '/trips.jsonl', rows.slice(i, i + 2000).map((r) => JSON.stringify(r)).join('\n') + '\n');
writeFileSync(out + '/meals.json', JSON.stringify(shape.mealRows()));
console.log(JSON.stringify({ seed: report.seed, arm, pace: report.pace, tick: report.tick, stop, seconds: report.seconds, startHash, hash: report.hash, people, travelEqual: travelCheck.equal, dayTravelEqual: dayTravelCheck.equal, travelTicks: tripTicks, walks: tr.counts.walksAll, measuredWalks: tr.counts.walksMeasured, meals: ds.meals.count, hungryWakingTicks: ds.hungryTime.hungryWakingTicks, wakingTicks: ds.hungryTime.wakingTicks, lifeTallyEqual: lifeTallyCheck.equal, dayLifeTallyEqual: dayLifeTallyCheck.equal, tripRows: rows.length, tripSelfChecks: tr.selfChecks, daySelfChecks: ds.selfChecks, conservation: report.conservation.ok, purityChecks }));
if (stop !== 'horizon' || !travelCheck.equal || !dayTravelCheck.equal) process.exitCode = 1;
