// Who dies, of what, at what age and when; how many are born; and which gate of the conception check is closed.
// Read-only: it steps the same world bench.ts does and reads it between ticks, so it changes nothing about a run.
//   npx vite-node scripts/death_tally.ts -- --seed meadow --days 480 --profile normal --arrivals off --current --bin 24 --out tally_meadow.json
//   --bin D     days per row (default 24)
//   --current   the world settings a product world gets (as bench.ts --current)
//   --out FILE  write the rows and the totals as JSON
// The run stops after the first row with nobody alive (the rest would be zeros).
// The conception funnel mirrors conceptionTick (src/sim/lifecycle.ts) at the moment a row is taken. It is a snapshot of the
// living women, not a count over the row, and a mirror: each woman is put under the FIRST gate she fails, in the order listed
// below, and "eligible" is the same conjunction conceptionTick tests before it rolls. If conceptionTick changes, so must this.
import { writeFileSync } from 'node:fs';
import { BIRTH_SPACING_TICKS, DAY } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { householdById, membersOf } from '../src/sim/households';
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
}

const world: World = createWorld(settings);
const founders = world.persons.filter((p) => p.alive).length;
const total = Math.round(days * DAY);
const binTicks = Math.round(binDays * DAY);
console.log(`death_tally: seed ${seed}, ${settings.population} founders (${founders} alive at tick 0), arrivals ${settings.immigration ? 'on' : 'off'}, ${days} days in rows of ${binDays}`);

const rows: Row[] = [];
const totalCauseByStage: Record<string, Record<string, number>> = {};
let seenDeaths = 0;
let seenBirths = 0;
for (let i = 1; i <= total; i++) {
  stepWorld(world);
  if (i % binTicks !== 0 && i !== total) continue;
  const alive = world.persons.filter((p) => p.alive);
  const births = (world.birthCount ?? 0) - seenBirths;
  seenBirths = world.birthCount ?? 0;
  const causes: Record<string, number> = {};
  const deathStage: Record<string, number> = {};
  for (; seenDeaths < world.deceased.length; seenDeaths++) {
    const d = world.deceased[seenDeaths];
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

const everBorn = world.birthCount ?? 0;
const dead = world.deceased.length;
const aliveEnd = world.persons.filter((p) => p.alive).length;
console.log(`\ntotals: ${founders} at start + ${everBorn} born = ${founders + everBorn}; ${dead} dead + ${aliveEnd} alive = ${dead + aliveEnd}${founders + everBorn === dead + aliveEnd ? ' (balanced)' : ' (DOES NOT BALANCE: arrivals, or a death or birth not counted)'}`);
console.log('deaths by cause and the stage of the age they died at (child <12, youth <16, adult <62, elder):');
for (const [c, byStage] of Object.entries(totalCauseByStage).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0))) console.log(`  ${c.padEnd(14)} ${fmt(byStage)}`);

if (out) writeFileSync(out, JSON.stringify({ seed, profile, arrivals: settings.immigration, founders, binDays, rows, totalCauseByStage, everBorn, dead, aliveEnd }, null, 1));
