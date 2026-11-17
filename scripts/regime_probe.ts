// SCRATCH ONLY (regime experiment, 17 November 2026). Modelled on scripts/autonomy_observe.ts: load a save, step N days, attach
// TimeBudget, keep its purity check. One arm a call. Nothing here changes a rule; arm C is STAGED and done in this runner.
//
//   npx vite-node scripts/regime_probe.ts -- --load <save> --days 30 --arm A|B|C --out <fresh folder>
//
//   A  control: the save continued unchanged (the plenty setter is never called).
//   B  plenty: setPlentyFactors({ wild: 6, crops: 6 }) before the first step (src/sim/plenty.ts, scratch setter).
//   C  fed (STAGED): at the start and at each dawn every household's home store is topped up to FED_DAYS days of food a head
//      with bread, through economy.ts `produce` under the ledger reason STAGED_REASON, bounded by the store's room.
//      "Days of food" is hunger points: FED_DAYS x the world's base hunger drain a day, existing home food counted at its
//      nutrition. Bread is used because a hut holds 40 weight: twelve units a head of raw food does not fit.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import { conservationReport, produce } from '../src/sim/economy';
import { DAY, SUNRISE, isHomeType } from '../src/sim/constants';
import { dayFraction } from '../src/sim/environment';
import { hungerRate } from '../src/sim/metabolism';
import { nutritionOf } from '../src/sim/bread_feeds';
import { ageYears } from '../src/sim/people';
import { winterDepth } from '../src/sim/hardship';
import { plentyFactors, setPlentyFactors } from '../src/sim/plenty';
import type { FoodKind, World } from '../src/sim/types';
import { TimeBudget, TIME_CATEGORIES } from './observers/time_budget';
import { OutdoorCompany } from './observers/outdoor_company';
import { gitProvenance, sourceManifest } from './observers/provenance';
import { LifeTally } from './lab/lab';

const args = process.argv.slice(2).filter((a) => a !== '--');
const arg = (key: string, fallback = ''): string => { const i = args.indexOf('--' + key); return i < 0 ? fallback : args[i + 1]; };
const out = arg('out'), days = Number(arg('days', '30')), arm = arg('arm', 'A'), input = arg('load');
if (!out || existsSync(out)) throw new Error('--out must name a folder that does not exist yet');
if (!input || !existsSync(input)) throw new Error('--load must name an existing save');
if (!Number.isFinite(days) || days <= 0) throw new Error('--days must be positive');
if (!['A', 'B', 'C'].includes(arm)) throw new Error('--arm is A (control), B (plenty) or C (fed, staged)');

const PLENTY_ARM = 6;
const FED_DAYS = 3;
const STAGED_REASON = 'staged_regime_topup';
const FOOD: readonly FoodKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat'];
const ARM_NAME: Record<string, string> = { A: 'control', B: 'plenty', C: 'fed (STAGED)' };

const w: World = deserializeWorld(readFileSync(input, 'utf8'));
if (arm === 'B') setPlentyFactors({ wild: PLENTY_ARM, crops: PLENTY_ARM });
const from = w.tick, until = from + Math.round(days * DAY), began = performance.now();
const startHash = hashWorld(w);
mkdirSync(out, { recursive: true });
const paths = ['src', 'scripts/observers'].flatMap((root) => readdirSync(root, { recursive: true }).map(String).filter((p) => p.endsWith('.ts')).map((p) => root + '/' + p.replace(/\\/g, '/'))).concat('scripts/regime_probe.ts', 'scripts/lab/lab.ts').sort();
const manifest = () => sourceManifest(paths);
const source = manifest();
writeFileSync(out + '/provenance.json', JSON.stringify({ ...gitProvenance(), arm, armName: ARM_NAME[arm], staged: arm === 'C', commandLine: process.argv.slice(1), settings: w.settings, input, from, until, plentyFactors: plentyFactors(), source }, null, 2));

// what the stores hold a head, as scripts/lab/lab.ts outcomeOf counts it (homeFoodPerPerson, storeFoodPerPerson)
function foodAHead(world: World): { home: number; allStores: number; people: number } {
  let home = 0, all = 0;
  for (const b of world.buildings) {
    if (!b.store) continue;
    let n = 0;
    for (const k of FOOD) n += b.store.items[k] ?? 0;
    all += n;
    if (isHomeType(b.type)) home += n;
  }
  const people = world.persons.filter((p) => p.alive).length, heads = Math.max(1, people);
  return { home: Math.round((home / heads) * 100) / 100, allStores: Math.round((all / heads) * 100) / 100, people };
}

// Arm C only. STAGED: units appear from outside the world. They are entered in the ledger under STAGED_REASON, so the
// conservation check still balances and the delta is exactly ledger.reasons['+' + STAGED_REASON].
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
const startFood = foodAHead(w);
const life = new LifeTally();
w.hooks = { onActivityEnd: (p, a, outcome) => life.end(w, p, a, outcome) };
const observer = new TimeBudget(), detach = observer.attach(w);
const outdoor = new OutdoorCompany();
const dayRows: { day: number; people: number; deathsSoFar: number; homeFoodAHead: number; storeFoodAHead: number; winter: number; hardship: string }[] = [];
let stop = 'horizon', purityChecks = 0;
while (w.tick < until) {
  if (arm === 'C' && (w.tick === from || isDawn(w.tick))) topUp(w); // staged, and the only write this runner makes to the world
  const check = w.tick % 120 === 0;
  const before = check ? serializeWorld(w) : '';
  if (w.tick > from) life.tick(w); // the state each step left, as scripts/generation_trace.ts reads it
  observer.sampleTick(w);
  outdoor.sampleTick(w);
  if (check) {
    observer.samplePlans(w);
    if (serializeWorld(w) !== before) throw new Error('Observation mutated saved state or RNG');
    purityChecks++;
  }
  stepWorld(w);
  if (w.tick % DAY === 0) {
    const f = foodAHead(w);
    dayRows.push({ day: w.tick / DAY, people: f.people, deathsSoFar: w.deceased.length - startDeaths, homeFoodAHead: f.home, storeFoodAHead: f.allStores, winter: Math.round(winterDepth(w) * 100) / 100, hardship: w.hardship ? w.hardship.kind : '' });
    if (!conservationReport(w).ok) { stop = 'conservation'; break; }
  }
}
life.tick(w);
detach();
if (JSON.stringify(source) !== JSON.stringify(manifest())) throw new Error('Source changed during run');

const tb = observer.report();
if (Object.values(tb.totals).reduce((a, b) => a + b, 0) !== tb.livingTicks) throw new Error('Time categories do not partition living-person ticks');
const waking = tb.livingTicks - tb.totals.sleep;
const pct = (n: number, d: number): number => (d ? Math.round((n / d) * 10000) / 100 : 0);
const t = tb.totals;
// Fixed before any run: every time share is a percentage of waking occupancy ticks (living-person ticks less the sleep category).
const shares = {
  denominator: 'waking occupancy ticks = TimeBudget livingTicks less the sleep category',
  wakingTicks: waking,
  workPlusTravel: pct(t.work + t.travel, waking),
  work: pct(t.work, waking),
  travel: pct(t.travel, waking),
  socialContact: pct(t.social_contact, waking),
  leisure: pct(t.leisure, waking),
  restWaitingIdle: pct(t.rest + t.waiting + t.idle, waking),
  rest: pct(t.rest, waking),
  waiting: pct(t.waiting, waking),
  idle: pct(t.idle, waking),
  eatingDrinkingWarming: pct(t.eating_drinking_warming, waking),
  failureRecovery: pct(t.failure_recovery, waking),
  defence: pct(t.defence, waking),
  sleepOfAllTime: pct(t.sleep, tb.livingTicks),
  categories: TIME_CATEGORIES,
};
const deaths = w.deceased.slice(startDeaths);
const causes: Record<string, number> = {};
for (const d of deaths) causes[d.cause] = (causes[d.cause] ?? 0) + 1;
let born = 0, came = 0;
for (const p of w.persons) if (!startPeople.has(p.id)) { if (ageYears(w, p) < 1) born++; else came++; }
const endFood = foodAHead(w);
const lifeCounters = {
  // docs/GENERATION_RUN.md section 5 reads this field (review_evidence/generation-20261113/summary.mjs): awake ticks with hunger under 62
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
const staged = arm === 'C' ? { reason: STAGED_REASON, fedDays: FED_DAYS, kind: 'bread', loafWorth: nutritionOf(w, 'bread'), unitsCreated: w.ledger.reasons['+' + STAGED_REASON] ?? 0, wanted: topUps.reduce((n, r) => n + r.wanted, 0), placed: topUps.reduce((n, r) => n + r.placed, 0), topUps } : null;
const report = {
  seed: w.settings.seed, arm, armName: ARM_NAME[arm], staged: arm === 'C', rulesVersion: w.settings.rulesVersion, immigration: w.settings.immigration,
  input, commandLine: process.argv.slice(1), from, until, tick: w.tick, startDay: from / DAY, endDay: w.tick / DAY, stop, seconds: Math.round((performance.now() - began) / 100) / 10,
  startHash, hash: hashWorld(w), plentyFactors: plentyFactors(),
  people: { start: startPeople.size, end: endFood.people, born, came, died: deaths.length, causes },
  foodAHead: { start: startFood, end: endFood },
  shares, lifeCounters, outdoor: outdoor.report(),
  conservation: conservationReport(w), stagedTopUp: staged, purityChecks,
  timeBudget: { method: tb.method, livingTicks: tb.livingTicks, totals: tb.totals, criticalTicks: tb.criticalTicks, criticalByNeed: tb.criticalByNeed, starts: tb.starts, blockedTicks: tb.blockedTicks, completedWorkSpells: tb.completedWorkSpells, sampleCounts: tb.sampleCounts },
  days: dayRows,
};
writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ seed: report.seed, arm, tick: report.tick, stop, seconds: report.seconds, hash: report.hash, people: report.people, hungryShare: lifeCounters.hungryShare, workPlusTravel: shares.workPlusTravel, socialContact: shares.socialContact, leisure: shares.leisure, outdoorCompany: report.outdoor.shares.all.company, conservation: report.conservation.ok, purityChecks }));
if (stop !== 'horizon') process.exitCode = 1;
