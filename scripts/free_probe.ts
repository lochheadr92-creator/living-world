// SCRATCH ONLY (free block experiment, 17 November 2026). Runner for the free block gate (src/sim/free_block.ts). Its loop is
// scripts/day_probe.ts's loop, step for step: the same order of operations, the same purity check every 120 ticks, the same conservation
// stop, with TimeBudget, DayShape and LifeTally attached as there. Added to that loop: OutdoorCompany (as scripts/regime_probe.ts
// attaches it), FreeWindow (scripts/observers/free_window.ts, the window accounting, which runs in every run whether or not the gate is
// on), and TripShape (scripts/observers/trip_shape.ts) as the one existing source of units gathered by kind and jobs finished, which
// the brief's tables ask for and DayShape does not hold. The save is always continued unchanged (arm A of the earlier probes); the
// staged feeding arm is not part of this probe. Nothing here changes a rule.
//
//   node node_modules/vite-node/dist/cli.mjs scripts/free_probe.ts -- --load <save> --days N --out <fresh folder> [--block-from F] [--nudge N]
//
//   --block-from F  turns the gate on, the window starting at day fraction F (0 to 1, exclusive) and ending at each person's own bedtime.
//                   Absent means the gate is off and the world runs bit for bit as it did.
//   --ignore-food   (with --block-from) the upper bound: the gate applies to every person of 12 or over inside their window with no need
//                   under CRITICAL, whatever they believe their household holds (src/sim/free_block.ts). The arm is labelled UD or UE.
//   --nudge N       N extra draws from world.rng before the first step and nothing else, exactly as scripts/generation_trace.ts lines
//                   50 to 51 (the lab's `nudge:N`).
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import { DAY } from '../src/sim/constants';
import { ageYears } from '../src/sim/people';
import { winterDepth } from '../src/sim/hardship';
import { plentyFactors } from '../src/sim/plenty';
import { freeBlockStats, setFreeBlock } from '../src/sim/free_block';
import type { World } from '../src/sim/types';
import { TimeBudget, TIME_CATEGORIES } from './observers/time_budget';
import { DayShape, wakingCounts } from './observers/day_shape';
import { OutdoorCompany } from './observers/outdoor_company';
import { TripShape } from './observers/trip_shape';
import { FreeWindow } from './observers/free_window';
import { WithdrawCheck } from './observers/withdraw_check';
import { gitProvenance, sourceManifest } from './observers/provenance';
import { LifeTally } from './lab/lab';

// `git status` may refresh the index; ask it not to take optional locks, so the run touches no repository state
process.env.GIT_OPTIONAL_LOCKS = '0';

const args = process.argv.slice(2).filter((a) => a !== '--');
const arg = (key: string, fallback = ''): string => { const i = args.indexOf('--' + key); return i < 0 ? fallback : args[i + 1]; };
const has = (key: string): boolean => args.includes('--' + key);
const out = arg('out'), days = Number(arg('days', '30')), input = arg('load');
if (has('arm')) throw new Error('--arm is not a flag of this probe: the save is always continued unchanged');
if (!out || existsSync(out)) throw new Error('--out must name a folder that does not exist yet');
if (!input || !existsSync(input)) throw new Error('--load must name an existing save');
if (!Number.isFinite(days) || days <= 0) throw new Error('--days must be positive');
const blockFrom = has('block-from') ? Number(arg('block-from')) : null;
if (blockFrom !== null && (!Number.isFinite(blockFrom) || blockFrom <= 0 || blockFrom >= 1)) throw new Error('--block-from must be a day fraction above 0 and below 1');
const ignoreFood = has('ignore-food');
if (ignoreFood && blockFrom === null) throw new Error('--ignore-food needs --block-from');
const withdrawCheck = has('withdraw-check'); // trip waste measurement (18 November 2026): attaches WithdrawCheck, a read-only observer, and writes withdraws.json and withdraws.jsonl
const nudge = has('nudge') ? Number(arg('nudge')) : 0;
if (!Number.isInteger(nudge) || nudge < 0) throw new Error('--nudge must be a whole number of draws, 0 or more');
const gateLabel = blockFrom === null ? '' : (ignoreFood ? 'U' : '') + (blockFrom === 0.62 ? 'D' : blockFrom === 0.5 ? 'E' : `block-${blockFrom}`);
const armLabel = gateLabel + (nudge > 0 ? (gateLabel ? '+' : '') + `N${nudge}` : '') || 'A';

setFreeBlock(blockFrom, ignoreFood); // before the save is loaded; off (null) leaves the world as it was
const w: World = deserializeWorld(readFileSync(input, 'utf8'));
const from = w.tick, until = from + Math.round(days * DAY), began = performance.now();
const startHash = hashWorld(w);
// the lab's `nudge:N` (scripts/generation_trace.ts lines 50 to 51): N extra draws from the world's random state at the start, and nothing else
for (let k = 0; k < nudge; k++) w.rng.next();
const nudgedHash = hashWorld(w);
mkdirSync(out, { recursive: true });
const paths = ['src', 'scripts/observers'].flatMap((root) => readdirSync(root, { recursive: true }).map(String).filter((p) => p.endsWith('.ts')).map((p) => root + '/' + p.replace(/\\/g, '/'))).concat('scripts/free_probe.ts', 'scripts/lab/lab.ts').sort();
const manifest = () => sourceManifest(paths);
const source = manifest();
writeFileSync(out + '/provenance.json', JSON.stringify({ ...gitProvenance(), arm: armLabel, blockFrom, ignoreFood, nudge, commandLine: process.argv.slice(1), settings: w.settings, input, from, until, plentyFactors: plentyFactors(), source }, null, 2));

const startPeople = new Set(w.persons.filter((p) => p.alive).map((p) => p.id));
const startDeaths = w.deceased.length;
const life = new LifeTally();
w.hooks = { onActivityEnd: (p, a, outcome) => life.end(w, p, a, outcome) };
const observer = new TimeBudget(), detach = observer.attach(w);
const shape = new DayShape();
const outdoor = new OutdoorCompany();
const trips = new TripShape(), detachTrips = trips.attach(w);
const freeWin = new FreeWindow();
const wcheck = withdrawCheck ? new WithdrawCheck() : null, detachWcheck = wcheck ? wcheck.attach(w) : () => {};
const dayRows: { day: number; people: number; deathsSoFar: number; winter: number; hardship: string }[] = [];
let stop = 'horizon', purityChecks = 0;
while (w.tick < until) {
  const check = w.tick % 120 === 0;
  const before = check ? serializeWorld(w) : '';
  if (w.tick > from) life.tick(w); // the state each step left, as scripts/generation_trace.ts reads it
  observer.sampleTick(w);
  shape.sampleTick(w);
  outdoor.sampleTick(w);
  trips.sampleTick(w);
  freeWin.sampleTick(w);
  wcheck?.sampleTick(w);
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
detachWcheck();
detach();
if (JSON.stringify(source) !== JSON.stringify(manifest())) throw new Error('Source changed during run');

const tb = observer.report();
if (Object.values(tb.totals).reduce((a, b) => a + b, 0) !== tb.livingTicks) throw new Error('Time categories do not partition living-person ticks');
const ds = shape.report();
const tr = trips.report(tb.totals.travel);
const rows = trips.tripRows();
const oc = outdoor.report();
const fw = freeWin.report();
const wc = wcheck ? wcheck.report() : null;
const wcRows = wcheck ? wcheck.rows() : [];
// the withdraw walking ticks WithdrawCheck counted (all ages) against the ticks TripShape counted for kind withdraw: same state, same test
const wcTicks = wcRows.reduce((s, r) => s + r.travelTicks, 0) + (wcheck ? wcheck.openTravelTicks() : 0);
const wcTripTicks = rows.filter((r) => r.kind === 'withdraw').reduce((s, r) => s + r.walkingTicks, 0);
const withdrawCheckSelf = wc ? { withdrawTravelTicksWithdrawCheck: wcTicks, withdrawTravelTicksTripShape: wcTripTicks, equal: wcTicks === wcTripTicks } : null;

// the travel totals must be one number: DayShape and TripShape read the same state through the same function TimeBudget uses
const travelCheck = { dayShapeTravelTicks: ds.walking.travelTicks, tripShapeTravelTicks: tr.counts.walkingTicksAll, timeBudgetTravelTicks: tb.totals.travel, equal: ds.walking.travelTicks === tb.totals.travel && tr.counts.walkingTicksAll === tb.totals.travel };
// LifeTally samples the states at ticks from+1 .. until; DayShape the states at from .. until-1. Reconcile them by moving the boundary.
const lastCounts = wakingCounts(w), firstCounts = ds.firstSampleCounts ?? { tick: from, awake: 0, hungryAwake: 0 };
const expectedAwake = ds.hungryTime.wakingTicks - firstCounts.awake + lastCounts.awake;
const expectedHungry = ds.hungryTime.hungryWakingTicks - firstCounts.hungryAwake + lastCounts.hungryAwake;
const lifeTallyCheck = {
  note: 'LifeTally counts the states at ticks from+1..until, DayShape those at from..until-1: DayShape less its first tick plus the end state should equal LifeTally',
  lifeAwakeTicks: life.awakeTicks, expectedAwakeTicks: expectedAwake, lifeHungryTicks: life.hungryTicks, expectedHungryTicks: expectedHungry,
  equal: life.awakeTicks === expectedAwake && life.hungryTicks === expectedHungry,
};
// FreeWindow's age bands must sum to what OutdoorCompany and DayShape count by their own definitions
const bandSum = (f: 'waking' | 'company' | 'hungry' | 'hungryNoFood'): number => fw.bands['12_and_over'][f] + fw.bands.under_12[f];
let dayShapeHungryNoFood = 0;
for (const r of ds.hungryTime.crossTab) if (r.packFood !== 'food' && r.homeStoreFood !== 'food') dayShapeHungryNoFood += r.ticks;
const windowCheck = {
  note: 'FreeWindow (both age bands) against OutdoorCompany and DayShape, each by its own definition',
  freeWindowWaking: bandSum('waking'), outdoorCompanyWaking: oc.counts.all.waking,
  freeWindowCompany: bandSum('company'), outdoorCompanyCompany: oc.counts.all.company,
  freeWindowHungry: bandSum('hungry'), dayShapeHungryWaking: ds.hungryTime.hungryWakingTicks,
  freeWindowHungryNoFood: bandSum('hungryNoFood'), dayShapeHungryNoFood,
  equal: bandSum('waking') === oc.counts.all.waking && bandSum('company') === oc.counts.all.company && bandSum('hungry') === ds.hungryTime.hungryWakingTicks && bandSum('hungryNoFood') === dayShapeHungryNoFood,
};
const deaths = w.deceased.slice(startDeaths);
const causes: Record<string, number> = {};
for (const d of deaths) causes[d.cause] = (causes[d.cause] ?? 0) + 1;
let born = 0, came = 0;
for (const p of w.persons) if (!startPeople.has(p.id)) { if (ageYears(w, p) < 1) born++; else came++; }
const people = { start: startPeople.size, end: w.persons.filter((p) => p.alive).length, born, came, died: deaths.length, causes };
const lifeCounters = {
  hungryShare: life.hungryShare, thirstyShare: life.thirstyShare, fedWindowShare: life.fedWindowShare,
  awakeTicks: life.awakeTicks, hungryTicks: life.hungryTicks,
  lifeShare: life.lifeShare, survivalShare: life.survivalShare, workShare: life.workShare, sleepShare: life.sleepShare,
  chats: life.chats, familyTime: life.familyTime, childPlay: life.childPlay, foragingPractice: life.foragingPractice, coaching: life.coaching, otherTalk: life.otherTalk,
  mealsSat: life.mealsSat, visits: life.visits, spareTime: life.spareTime, fireSits: life.fireSits, storiesTold: life.storiesTold, storyHearers: life.storyHearers,
  toysMade: life.toysMade, toysGiven: life.toysGiven, soloPlay: life.solo, marketsCalled: life.marketsCalled,
  approachesFailed: life.approachesFailed, approachFailShare: life.approachFailShare,
  mealsFromPack: life.mealsFromPack, mealsFromStore: life.mealsFromStore, rationTrips: life.rationTrips, siteDeliveries: life.siteDeliveries, workplaceJobs: life.workplaceJobs,
  leanDays: life.leanDays, dryDays: life.dryDays,
};
const report = {
  seed: w.settings.seed, arm: armLabel, blockFrom, ignoreFood, nudge, rulesVersion: w.settings.rulesVersion, immigration: w.settings.immigration,
  input, commandLine: process.argv.slice(1), command: ['node', 'node_modules/vite-node/dist/cli.mjs', 'scripts/free_probe.ts', '--', ...args].join(' '), cwd: process.cwd(), from, until, tick: w.tick, startDay: from / DAY, endDay: w.tick / DAY, stop, seconds: Math.round((performance.now() - began) / 100) / 10,
  startHash, nudgedHash, hash: hashWorld(w), plentyFactors: plentyFactors(),
  people,
  travelCheck, lifeTallyCheck, windowCheck,
  conservation: conservationReport(w), purityChecks,
  freeBlock: { from: blockFrom, ignoreFood, stats: freeBlockStats },
  timeCategories: TIME_CATEGORIES,
  timeBudget: { livingTicks: tb.livingTicks, totals: tb.totals, criticalTicks: tb.criticalTicks, criticalByNeed: tb.criticalByNeed, starts: tb.starts },
  lifeCounters,
  days: dayRows,
  tripFile: { path: 'trips.jsonl', lines: rows.length },
  tripShape: tr,
  dayShape: ds,
  outdoor: oc,
  freeWindow: fw,
  ...(wc ? { withdrawCheck: wc, withdrawCheckSelf } : {}),
};
writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
writeFileSync(out + '/meals.json', JSON.stringify(shape.mealRows()));
writeFileSync(out + '/trips.jsonl', '');
for (let i = 0; i < rows.length; i += 2000) appendFileSync(out + '/trips.jsonl', rows.slice(i, i + 2000).map((r) => JSON.stringify(r)).join('\n') + '\n');
if (wcheck) { writeFileSync(out + '/withdraws.jsonl', ''); for (let i = 0; i < wcRows.length; i += 2000) appendFileSync(out + '/withdraws.jsonl', wcRows.slice(i, i + 2000).map((r) => JSON.stringify(r)).join('\n') + '\n'); }
console.log(JSON.stringify({ withdrawCheckSelf, seed: report.seed, arm: armLabel, blockFrom, ignoreFood, nudge, tick: report.tick, stop, seconds: report.seconds, startHash, nudgedHash, hash: report.hash, people, travelEqual: travelCheck.equal, lifeTallyEqual: lifeTallyCheck.equal, windowCheckEqual: windowCheck.equal, dayShapeSelfChecks: ds.selfChecks, tripSelfChecks: tr.selfChecks, gate: freeBlockStats, conservation: report.conservation.ok, purityChecks }));
if (stop !== 'horizon' || !travelCheck.equal || !lifeTallyCheck.equal || !windowCheck.equal) process.exitCode = 1;
