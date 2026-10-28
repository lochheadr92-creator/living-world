// Who dies, of what, at what age and when; how many are born; which gate of the conception check is closed; and what the
// settlement and the dying person's surroundings looked like at the time.
// Read-only: it steps the same world bench.ts does and reads it between ticks, so it changes nothing about a run.
//   npx vite-node scripts/death_tally.ts -- --seed meadow --days 480 --profile normal --arrivals off --current --bin 24 --out tally_meadow.json
//   --bin D     days per row (default 24)
//   --current   the world settings a product world gets (as bench.ts --current)
//   --out FILE  write the rows, the death records and the totals as JSON
// The run stops after the first row with nobody alive (the rest would be zeros).
// The conception funnel mirrors conceptionTick (src/sim/lifecycle.ts) at the moment a row is taken. It is a snapshot of the
// living women, not a count over the row, and a mirror: each woman is put under the FIRST gate she fails, in the order listed
// below, and "eligible" is the same conjunction conceptionTick tests before it rolls. If conceptionTick changes, so must this.
// The surroundings of a death are read from a snapshot of every living person taken every SNAP_EVERY ticks, so they are up to
// SNAP_EVERY-1 ticks (a few hundredths of a day) older than the death itself; a person who dies before their first snapshot has none.
import { writeFileSync } from 'node:fs';
import { BIRTH_SPACING_TICKS, BUILD_DEF, DAY, DAYS_PER_YEAR } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { indoorHome } from '../src/sim/habitation';
import { WINTER_LENGTH, winterDepth } from '../src/sim/hardship';
import { householdById, membersOf } from '../src/sim/households';
import { fireWarmth, shelterAt } from '../src/sim/needs';
import { ageYears, stageOf, stageOfAge } from '../src/sim/people';
import { currentWorldSettings, settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { personOf } from '../src/sim/social';
import type { Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const flag = (name: string): boolean => args.includes('--' + name);

const seed = opt('seed', 'meadow');
const days = Number(opt('days', '480'));
const binDays = Math.max(1, Number(opt('bin', '24')));
const out = opt('out', '');
const profile = opt('profile', 'normal') as ProfileName;
const settings = settingsForProfile(profile, seed, { harsh: flag('harsh'), immigration: opt('arrivals', 'on') !== 'off' });
if (flag('current')) Object.assign(settings, currentWorldSettings(profile, seed, { harsh: settings.harsh, immigration: settings.immigration }));

const SNAP_EVERY = 6;
const GATES = ['outOfAge', 'noPartner', 'pregnant', 'partnerNotHere', 'noHome', 'threeKids', 'spacing', 'lowFood', 'lowHealth', 'eligible'] as const;
type Gate = (typeof GATES)[number];

/** the first gate this woman fails; the same tests as conceptionTick, in a fixed order */
function gateOf(world: World, p: Person): Gate {
  const age = ageYears(world, p);
  if (age < 17 || age > 44) return 'outOfAge';
  if (p.partnerId === 0) return 'noPartner';
  if (p.pregnantUntil > 0) return 'pregnant';
  const partner = personOf(world, p.partnerId);
  if (!partner || partner.hhId !== p.hhId || partner.sex !== 'm') return 'partnerNotHere';
  const hh = householdById(world, p.hhId);
  if (!hh || !hh.homeId) return 'noHome';
  const members = membersOf(world, hh);
  if (members.filter((m) => stageOf(world, m) === 'child').length >= 3) return 'threeKids';
  if (world.tick - (p.cooldowns.lastBirth ?? -99999) < BIRTH_SPACING_TICKS) return 'spacing';
  let food = 0;
  for (const m of members) food += foodUnits(m.inv);
  const home = world.byId.get(hh.homeId);
  if (home && home.ent === 'building') food += foodUnits(home.store.items);
  if (food / Math.max(1, members.length) < 3) return 'lowFood';
  if (p.health < 60 || p.needs.hunger < 35) return 'lowHealth';
  return 'eligible';
}

/** what a person's surroundings were: the same quantities updateNeeds (src/sim/needs.ts) turns into a warmth target */
interface Around {
  yearDay: number;
  winter: number;
  temp: number;
  rain: number;
  light: number;
  warmth: number;
  hunger: number;
  health: number;
  /** indoors in their own solid home; at a lean-to; beside a solid wall but not inside; or in the open */
  where: 'indoors' | 'lean-to' | 'at a wall' | 'open';
  fire: boolean;
  home: string;
  homeCondition: number;
  householdSize: number;
  activity: string;
  distHome: number;
}
function aroundOf(world: World, p: Person): Around {
  const hh = householdById(world, p.hhId);
  const home = hh && hh.homeId ? world.byId.get(hh.homeId) : undefined;
  const hb = home && home.ent === 'building' ? home : undefined;
  const sh = shelterAt(world, p.x, p.y, p);
  const where = indoorHome(world, p) ? 'indoors' : sh.kind === 'lean_to' ? 'lean-to' : sh.kind === 'hut' ? 'at a wall' : 'open';
  return {
    yearDay: Math.floor((world.tick / DAY) % DAYS_PER_YEAR),
    winter: Math.round(winterDepth(world) * 100) / 100,
    temp: Math.round(world.weather.temp * 10) / 10,
    rain: Math.round(world.weather.rain * 100) / 100,
    light: Math.round(world.light * 100) / 100,
    warmth: Math.round(p.needs.warmth),
    hunger: Math.round(p.needs.hunger),
    health: Math.round(p.health),
    where,
    fire: fireWarmth(world, p.x, p.y) > 0,
    home: hb ? hb.type : 'none',
    homeCondition: hb ? Math.round(hb.condition) : -1,
    householdSize: hh ? membersOf(world, hh).length : 0,
    activity: p.activity ? p.activity.kind : 'idle',
    distHome: hb ? Math.round(Math.hypot(p.x - (hb.x + hb.w / 2), p.y - (hb.y + hb.h / 2))) : -1,
  };
}

interface DeathRecord {
  name: string;
  tick: number;
  cause: string;
  age: number;
  around: Around | null;
}

const sleepersOf = (type: string): number => (BUILD_DEF as Record<string, { sleepers: number }>)[type]?.sleepers ?? 0;

interface Census {
  buildings: Record<string, number>;
  firesLit: number;
  /** open building sites by the type being built */
  sites: Record<string, number>;
  /** households by the type of home they have, and how many of them fill it to its sleeper limit */
  householdHome: Record<string, number>;
  fullHomes: number;
  coldBelow26: number;
  coldAtOrBelow6: number;
  indoors: number;
  /** people aged 17-44 with no partner, by sex, and how many with one */
  singleMen: number;
  singleWomen: number;
  partnered: number;
}
function censusOf(world: World): Census {
  const buildings: Record<string, number> = {};
  let firesLit = 0;
  for (const b of world.buildings) {
    buildings[b.type] = (buildings[b.type] ?? 0) + 1;
    if (b.type === 'fire' && b.fuel > 0) firesLit++;
  }
  const sites: Record<string, number> = {};
  for (const s of world.sites) sites[s.type] = (sites[s.type] ?? 0) + 1;
  const householdHome: Record<string, number> = { none: 0, lean_to: 0, hut: 0, house: 0 };
  let fullHomes = 0;
  for (const h of world.households) {
    const size = membersOf(world, h).length;
    if (size === 0) continue;
    const home = h.homeId ? world.byId.get(h.homeId) : undefined;
    const type = home && home.ent === 'building' ? home.type : 'none';
    householdHome[type] = (householdHome[type] ?? 0) + 1;
    if (type !== 'none' && sleepersOf(type) > 0 && size >= sleepersOf(type)) fullHomes++;
  }
  let coldBelow26 = 0;
  let coldAtOrBelow6 = 0;
  let indoors = 0;
  let singleMen = 0;
  let singleWomen = 0;
  let partnered = 0;
  for (const p of world.persons) {
    if (!p.alive) continue;
    if (p.needs.warmth < 26) coldBelow26++;
    if (p.needs.warmth <= 6) coldAtOrBelow6++;
    if (indoorHome(world, p)) indoors++;
    const age = ageYears(world, p);
    if (age < 17 || age > 44) continue;
    if (p.partnerId !== 0) partnered++;
    else if (p.sex === 'f') singleWomen++;
    else singleMen++;
  }
  return { buildings, firesLit, sites, householdHome, fullHomes, coldBelow26, coldAtOrBelow6, indoors, singleMen, singleWomen, partnered };
}

interface Row {
  day: number;
  pop: number;
  children: number;
  adults: number;
  elders: number;
  births: number;
  deaths: number;
  causes: Record<string, number>;
  /** age at death of this row's deaths, by the stage that age falls in */
  deathStage: Record<string, number>;
  households: number;
  roofed: number;
  funnel: Record<Gate, number>;
  census: Census;
}

const world: World = createWorld(settings);
const founders = world.persons.filter((p) => p.alive).length;
const total = Math.round(days * DAY);
const binTicks = Math.round(binDays * DAY);
console.log(`death_tally: seed ${seed}, ${settings.population} founders (${founders} alive at tick 0), arrivals ${settings.immigration ? 'on' : 'off'}, ${days} days in rows of ${binDays}; a year is ${DAYS_PER_YEAR} days and its last ${WINTER_LENGTH} are winter`);

const rows: Row[] = [];
const deathRecords: DeathRecord[] = [];
const snaps = new Map<number, Around>();
const totalCauseByStage: Record<string, Record<string, number>> = {};
let seenDeaths = 0;
let rowDeaths = 0;
let seenBirths = 0;
for (let i = 1; i <= total; i++) {
  stepWorld(world);
  // a death removes the person from the world this tick, so what they were standing in is the last snapshot taken before it
  for (; seenDeaths < world.deceased.length; seenDeaths++) {
    const d = world.deceased[seenDeaths];
    deathRecords.push({ name: d.name, tick: d.tick, cause: d.cause, age: d.age, around: snaps.get(d.id) ?? null });
    snaps.delete(d.id);
  }
  if (i % SNAP_EVERY === 0) for (const p of world.persons) if (p.alive) snaps.set(p.id, aroundOf(world, p));
  if (i % binTicks !== 0 && i !== total) continue;
  const alive = world.persons.filter((p) => p.alive);
  const births = (world.birthCount ?? 0) - seenBirths;
  seenBirths = world.birthCount ?? 0;
  const causes: Record<string, number> = {};
  const deathStage: Record<string, number> = {};
  for (; rowDeaths < deathRecords.length; rowDeaths++) {
    const d = deathRecords[rowDeaths];
    const st = stageOfAge(d.age);
    causes[d.cause] = (causes[d.cause] ?? 0) + 1;
    deathStage[st] = (deathStage[st] ?? 0) + 1;
    (totalCauseByStage[d.cause] ??= {})[st] = (totalCauseByStage[d.cause][st] ?? 0) + 1;
  }
  const funnel = Object.fromEntries(GATES.map((g) => [g, 0])) as Record<Gate, number>;
  for (const p of alive) if (p.sex === 'f') funnel[gateOf(world, p)]++;
  const stages = { child: 0, youth: 0, adult: 0, elder: 0 };
  for (const p of alive) stages[stageOf(world, p)]++;
  const roofed = world.households.filter((h) => h.homeId).length;
  rows.push({
    day: Math.round((world.tick / DAY) * 10) / 10,
    pop: alive.length,
    children: stages.child + stages.youth,
    adults: stages.adult,
    elders: stages.elder,
    births,
    deaths: Object.values(causes).reduce((a, b) => a + b, 0),
    causes,
    deathStage,
    households: world.households.length,
    roofed,
    funnel,
    census: censusOf(world),
  });
  if (alive.length === 0) break;
}

const fmt = (o: Record<string, number>): string =>
  Object.entries(o)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(' ') || '-';
console.log('\nday   pop  kids adlt eldr | born died | deaths by cause | died as (stage)');
for (const r of rows) console.log(`${String(r.day).padStart(4)}  ${String(r.pop).padStart(3)}  ${String(r.children).padStart(4)} ${String(r.adults).padStart(4)} ${String(r.elders).padStart(4)} | ${String(r.births).padStart(4)} ${String(r.deaths).padStart(4)} | ${fmt(r.causes).padEnd(40)} | ${fmt(r.deathStage)}`);
console.log('\nconception gates, living women, first gate failed (snapshot at the end of each row)');
console.log(['day', 'hh', 'roofed', ...GATES].map((s) => s.padStart(9)).join(''));
for (const r of rows) console.log([r.day, r.households, r.roofed, ...GATES.map((g) => r.funnel[g])].map((v) => String(v).padStart(9)).join(''));

console.log('\nsettlement census (snapshot at the end of each row)');
console.log('       buildings (all)                          | households by home           | open sites | warmth        | aged 17-44');
console.log('day    lean_to hut house fire(lit) other        | none lean_to hut house  full | (type:n)   | <26 <=6 inside| single M  single F  paired');
for (const r of rows) {
  const c = r.census;
  const other = Object.entries(c.buildings).filter(([t]) => !['lean_to', 'hut', 'house', 'fire'].includes(t)).reduce((a, [, n]) => a + n, 0);
  console.log(
    `${String(r.day).padStart(4)}   ${String(c.buildings.lean_to ?? 0).padStart(7)} ${String(c.buildings.hut ?? 0).padStart(3)} ${String(c.buildings.house ?? 0).padStart(5)} ${`${c.buildings.fire ?? 0}(${c.firesLit})`.padStart(9)} ${String(other).padStart(5)}        | ${String(c.householdHome.none).padStart(4)} ${String(c.householdHome.lean_to).padStart(7)} ${String(c.householdHome.hut).padStart(3)} ${String(c.householdHome.house).padStart(5)} ${String(c.fullHomes).padStart(5)} | ${fmt(c.sites).padEnd(10)} | ${String(c.coldBelow26).padStart(3)} ${String(c.coldAtOrBelow6).padStart(3)} ${String(c.indoors).padStart(6)} | ${String(c.singleMen).padStart(8)} ${String(c.singleWomen).padStart(8)} ${String(c.partnered).padStart(7)}`,
  );
}

// Where the dead were: the same table for exposure, for hunger and for everything else.
const withAround = deathRecords.filter((d) => d.around);
const classOf = (c: string): string => (c === 'exposure' ? 'exposure' : c === 'hunger' ? 'hunger' : 'other');
console.log(`\nsurroundings at death (${withAround.length} of ${deathRecords.length} deaths have a snapshot)`);
for (const cls of ['exposure', 'hunger', 'other']) {
  const ds = withAround.filter((d) => classOf(d.cause) === cls);
  if (ds.length === 0) continue;
  const tally = (key: (a: Around) => string): string => fmt(ds.reduce<Record<string, number>>((m, d) => ((m[key(d.around!)] = (m[key(d.around!)] ?? 0) + 1), m), {}));
  const night = (a: Around): string => (a.light < 0.3 ? 'night' : 'day');
  const winter = (a: Around): string => (a.winter >= 0.5 ? 'deep winter' : a.winter > 0 ? 'winter' : 'not winter');
  console.log(`  ${cls} (${ds.length})`);
  console.log(`    season          ${tally(winter)}`);
  console.log(`    time            ${tally(night)}`);
  console.log(`    where           ${tally((a) => a.where)}`);
  console.log(`    fire in reach   ${tally((a) => (a.fire ? 'yes' : 'no'))}`);
  console.log(`    home            ${tally((a) => a.home)}`);
  console.log(`    home condition  ${tally((a) => (a.homeCondition < 0 ? 'no home' : a.homeCondition < 30 ? '<30' : a.homeCondition < 70 ? '30-69' : '70+'))}`);
  console.log(`    doing           ${tally((a) => a.activity)}`);
  console.log(`    day of year     ${tally((a) => String(a.yearDay).padStart(2, '0'))}`);
}
const expo = withAround.filter((d) => d.cause === 'exposure');
if (expo.length) {
  console.log('\nevery exposure death (day, age; winter depth, temp, rain, light; warmth hunger health; where, fire, home(condition), household, doing, tiles from home)');
  for (const d of expo.slice(0, 80)) {
    const a = d.around!;
    console.log(`  d${(d.tick / DAY).toFixed(1).padStart(6)} age ${String(d.age).padStart(2)}; w${a.winter.toFixed(2)} ${String(a.temp).padStart(5)}C rain ${a.rain.toFixed(2)} light ${a.light.toFixed(2)}; ${String(a.warmth).padStart(3)} ${String(a.hunger).padStart(3)} ${String(a.health).padStart(3)}; ${a.where.padEnd(8)} fire ${a.fire ? 'Y' : 'n'} ${a.home}(${a.homeCondition}) hh${a.householdSize} ${a.activity} ${a.distHome}`);
  }
}

const everBorn = world.birthCount ?? 0;
const dead = world.deceased.length;
const aliveEnd = world.persons.filter((p) => p.alive).length;
console.log(`\ntotals: ${founders} at start + ${everBorn} born = ${founders + everBorn}; ${dead} dead + ${aliveEnd} alive = ${dead + aliveEnd}${founders + everBorn === dead + aliveEnd ? ' (balanced)' : ' (DOES NOT BALANCE: arrivals, or a death or birth not counted)'}`);
console.log('deaths by cause and the stage of the age they died at (child <12, youth <16, adult <62, elder):');
for (const [c, byStage] of Object.entries(totalCauseByStage).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0))) console.log(`  ${c.padEnd(14)} ${fmt(byStage)}`);

if (out) writeFileSync(out, JSON.stringify({ seed, profile, arrivals: settings.immigration, founders, binDays, rows, deathRecords, totalCauseByStage, everBorn, dead, aliveEnd }, null, 1));
