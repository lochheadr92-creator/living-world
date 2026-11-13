// One ordinary world over a generation: who is born, who comes, who dies and of what, and what the settlement has become, year by
// year. Read-only measurement: nothing is switched and nothing is written but the JSON named by --out (rewritten every year, so a
// run that is stopped keeps what it had). The world is built as scripts/lab_seed.ts builds it for fork 0 and the tallies only read,
// so the day-60 hash it prints is the lab control's.
//
//   npx vite-node scripts/generation_trace.ts -- --seed aspen --days 240 [--arrivals on|off] [--rules N] [--out trace.json]
//   npx vite-node scripts/generation_trace.ts -- --load <save point> --days 48 [--rules-up N] [--nudge N] [--out trace.json]
//
// --load continues a save point (scripts/world_args.ts `worldFromArgs`: the seed, rules version and arrivals are the save's own) and writes
// the same JSON as a fresh run, from the save's day. With --load, --days is the number of days to CONTINUE (a day-96 save and --days 48
// stop at day 144), and every `day` in the JSON is the world's own day. --rules-up N raises the loaded world's rules version (only above the
// save's own). --nudge N draws N random numbers before the first step and changes nothing else: the lab's `nudge:N`, the noise floor. The
// life counters (`life`) and the `origin` of each person count from the save: someone already alive at the save is `born` (born in the
// world, birth after day 0) or `saved` (a founder or an arrival, not told apart), and `hash60` is empty unless the run covers day 60.
// `died`, `causes` and `deaths` count only the run's own deaths, not those the save already holds (`priorDeaths` says how many).
// Without --load, and with --nudge 0, the run and its JSON are as they always were.
//
// `days`: one row a day (people by stage, born, came, died by cause, households, food in stores, wild food, the hardship under way).
// `years`: one row a year of 12 days (buildings by type, tools, carts, apprentices, technique holders, stone, clay, ore and trees
// left, the id counter, where the living came from, ages, couples, and the lab's own life counters as running totals).
// `deaths`: every death with its day, cause, age and whether the person was a founder, born here or an arrival.
import { writeFileSync } from 'node:fs';
import { savePoint, worldFromArgs } from './world_args';
import { CRITICAL, DAY, DAYS_PER_YEAR } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { winterDepth } from '../src/sim/hardship';
import { hashWorld, stepWorld } from '../src/sim/world';
import { ageYears, stageOf } from '../src/sim/people';
import { TECHNIQUE_KINDS } from '../src/sim/techniques';
import { LifeTally } from './lab/lab';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const days = Number(opt('days', '240'));
const out = opt('out', '');
// save points (scripts/world_args.ts): the whole world written every so many days, for a probe to start from
const saveEvery = Number(opt('save-every', '0'));
const saveDir = opt('save-dir', '');
const nudge = Number(opt('nudge', '0'));

// a world read from --load (and raised by --rules-up), or made fresh from --seed, --rules and --arrivals (scripts/world_args.ts)
const { w, loaded, startDay } = worldFromArgs(opt, 'aspen');
const seed = w.settings.seed;
const arrivals = w.settings.immigration;
const startTick = w.tick;
const endDay = startDay + days;
// the lab's `nudge:N`: N extra draws from the world's random state at the start, and nothing else
for (let k = 0; k < nudge; k++) w.rng.next();
// said in the JSON only when the run was not a plain fresh one, so a fresh run's JSON is as it was
const provenance = loaded ? { loaded, startDay, endDay, rulesUp: opt('rules-up', ''), nudge, priorDeaths: w.deceased.length } : nudge > 0 ? { nudge } : {};

const life = new LifeTally();
w.hooks = { onActivityEnd: (p, a, outcome) => life.end(w, p, a, outcome) };

type Origin = 'founder' | 'born' | 'arrived' | 'saved';
// in a fresh world everyone is a founder; at a save, those born in the world are `born` and the rest `saved` (founder or arrival)
const origin = new Map<number, Origin>(w.persons.map((p) => [p.id, (loaded ? (p.birthTick > 0 ? 'born' : 'saved') : 'founder') as Origin]));
const count = <T>(xs: T[], key: (x: T) => string): Record<string, number> => {
  const o: Record<string, number> = {};
  for (const x of xs) o[key(x)] = (o[key(x)] ?? 0) + 1;
  return o;
};
const round = (n: number, d = 1): number => Math.round(n * 10 ** d) / 10 ** d;

const dayRows: Record<string, unknown>[] = [];
const yearRows: Record<string, unknown>[] = [];
const deaths: Record<string, unknown>[] = [];
let deathsSoFar = w.deceased.length; // the deaths a save already holds are not this run's (none in a fresh world)
let crit = new Set<number>();
let hungry = 0;
let samples = 0;
let hash60 = '';
const started = Date.now();

const write = (done: boolean): void => {
  if (!out) return;
  writeFileSync(out, JSON.stringify({ seed, arrivals, rulesVersion: w.settings.rulesVersion, daysAsked: days, ...provenance, daysRun: dayRows.length, done, hash60, minutes: round((Date.now() - started) / 60000), days: dayRows, years: yearRows, deaths }));
};

for (let i = startTick + 1; i <= startTick + days * DAY; i++) {
  stepWorld(w);
  life.tick(w);
  if (i % 40 === 0) {
    for (const p of w.persons) {
      if (!p.alive) continue;
      if (p.needs.hunger < CRITICAL.hunger) crit.add(p.id);
      if (p.needs.hunger < 42) hungry++;
      samples++;
    }
  }
  if (i % DAY !== 0) continue;
  const day = i / DAY;
  const alive = w.persons.filter((p) => p.alive);
  if (day === 60) hash60 = hashWorld(w);
  let born = 0;
  let came = 0;
  for (const p of w.persons) {
    if (origin.has(p.id)) continue;
    const o: Origin = ageYears(w, p) < 1 ? 'born' : 'arrived';
    origin.set(p.id, o);
    if (o === 'born') born++;
    else came++;
  }
  const todays = w.deceased.slice(deathsSoFar);
  deathsSoFar = w.deceased.length;
  for (const d of todays) {
    // someone who came and died inside the same day never stood in the list of the living at a day's end
    if (!origin.has(d.id)) { origin.set(d.id, d.age < 1 ? 'born' : 'arrived'); if (d.age < 1) born++; else came++; }
    deaths.push({ day: round(d.tick / DAY, 2), cause: d.cause, age: round(d.age), origin: origin.get(d.id) });
  }
  let wild = 0;
  let wildCap = 0;
  for (const s of w.sources) if (s.type === 'berry_bush' || s.type === 'fruit_tree' || s.type === 'fish_spot' || s.type === 'wild_grain') { wild += s.amount; wildCap += s.max; }
  const store = w.buildings.reduce((n, b) => n + foodUnits(b.store.items), 0) + w.piles.reduce((n, pl) => n + foodUnits(pl.items), 0);
  dayRows.push({
    day,
    alive: alive.length,
    stages: count(alive, (p) => stageOf(w, p)),
    born,
    came,
    died: todays.length,
    causes: count(todays, (d) => d.cause),
    households: w.households.filter((h) => h.members.length > 0).length,
    store: Math.round(store),
    wild: Math.round(wild),
    wildCap: Math.round(wildCap),
    crit: crit.size,
    hungryShare: round(hungry / Math.max(1, samples), 2),
    winter: round(winterDepth(w), 2),
    hardship: w.hardship ? w.hardship.kind : '',
    buildings: w.buildings.length,
  });
  crit = new Set();
  hungry = 0;
  samples = 0;
  if (saveEvery > 0 && saveDir && day % saveEvery === 0) savePoint(w, saveDir);
  if (day % DAYS_PER_YEAR !== 0 && day !== endDay) continue;
  const left = (types: string[]): number => Math.round(w.sources.filter((s) => types.includes(s.type)).reduce((n, s) => n + s.amount, 0));
  const ages = alive.map((p) => ageYears(w, p));
  const grown = alive.filter((p) => stageOf(w, p) !== 'child');
  const sizes = w.households.filter((h) => h.members.length > 0).map((h) => h.members.length);
  yearRows.push({
    day,
    year: round(day / DAYS_PER_YEAR, 2),
    alive: alive.length,
    from: count(alive, (p) => origin.get(p.id) ?? 'founder'),
    stages: count(alive, (p) => stageOf(w, p)),
    meanAge: round(ages.reduce((a, b) => a + b, 0) / Math.max(1, ages.length)),
    oldest: round(Math.max(0, ...ages)),
    couples: alive.filter((p) => p.partnerId && w.persons.some((q) => q.id === p.partnerId && q.alive)).length / 2,
    households: sizes.length,
    largestHousehold: Math.max(0, ...sizes),
    householdsOfOne: sizes.filter((n) => n === 1).length,
    // the households standing now: a dissolved household leaves the list, so this is not a count of all there ever were
    // (it was labelled householdsEver until 13 November 2026; adversarial review AR-05). Older JSON keeps the old label.
    householdsNow: w.households.length,
    buildings: count(w.buildings, (b) => b.type),
    sites: count(w.sites, (s) => s.type),
    plots: w.plots.length,
    tools: count(w.tools, (t) => t.kind),
    carts: w.carts.length,
    apprentices: alive.filter((p) => p.apprentice).length,
    techniques: Object.fromEntries(TECHNIQUE_KINDS.map((k) => [k, alive.filter((p) => p.techniques?.[k]).length])),
    skills: Object.fromEntries((['forage', 'fish', 'farm', 'build', 'craft'] as const).map((k) => [k, round(grown.reduce((n, p) => n + ((p.skills as Record<string, number>)[k] ?? 0), 0) / Math.max(1, grown.length), 3)])),
    meanMood: round(alive.reduce((n, p) => n + (p.mood?.level ?? 0), 0) / Math.max(1, alive.length)),
    stone: left(['rock', 'outcrop']),
    clay: left(['clay_pit']),
    ore: left(['ore_vein']),
    trees: w.sources.filter((s) => s.type === 'tree').length,
    wood: left(['tree']),
    nextId: w.nextId,
    events: w.events.length,
    deathsSoFar: w.deceased.length,
    // the lab's life counters, as running totals since day 0
    life: {
      chats: life.chats, familyTime: life.familyTime, childPlay: life.childPlay, coaching: life.coaching, mealsSat: life.mealsSat, visits: life.visits,
      fireSits: life.fireSits, storiesTold: life.storiesTold, mealsFromStore: life.mealsFromStore, mealsFromPack: life.mealsFromPack,
      tradeTalk: life.tradeTalk, marketsCalled: life.marketsCalled, workplaceJobs: life.workplaceJobs, yardJobs: life.yardJobs, sitesAbandoned: life.sitesAbandoned,
      toysMade: life.toysMade, lessons: life.lessonsForage + life.lessonsFish + life.lessonsFarm, leanDays: life.leanDays, dryDays: life.dryDays,
      hungryShare: life.hungryShare, thirstyShare: life.thirstyShare, lifeShare: life.lifeShare, survivalShare: life.survivalShare, workShare: life.workShare,
    },
  });
  write(false);
  console.error(`${seed} day ${day} alive ${alive.length} (${round((Date.now() - started) / 60000)} min)`);
}
write(true);
console.log(JSON.stringify({ seed, arrivals, hash60, days: dayRows.length, alive: (dayRows[dayRows.length - 1] as { alive: number }).alive }));
