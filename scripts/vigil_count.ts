// Read-only count of the "keeping vigil" trigger in saved settlements (a one-off measurement; docs: none).
// Episodes, checked every CHECK ticks (a stranger's health or fever is seen the same way the sim's own checks read it):
//   A. health under 35: p.health < 35 (people.ts uses the same 35 for a frail person).
//   B. a strong fever: p.illness with severity >= 0.5, the sign others can SEE (fever_sign.ts FEVER_VISIBLE, looksFeverish).
//   C. A or B: the vigil trigger.
// An episode starts at the first check where the condition holds and ends at the first check where it no longer holds
// ("recovery", its end is that check's tick) or at the tick of death (w.deceased[].tick, exact). Lengths of recovery episodes
// are therefore known to within CHECK ticks. An episode still open when the run stops is "open" and runs to the run's end.
// Sitter (for C, at its start): a living housemate (same hhId), or a living partner, parent or child (relations kin, parents, children, partnerId).
// Night (for C): any tick inside the episode at which isDark(world) holds (environment.ts: world.light < 0.35), read every tick.
// Day length: DAY = 2400 ticks (constants.ts), DAYS_PER_YEAR = 12.
// The script only reads the world after each stepWorld; it writes nothing into it and draws nothing from its random state.
//
// Positive control (--control): on a copy of the loaded world, one living adult gets health 20 and another a strong fever set
// through the sim's own field (p.illness, with since one day back so illnessTick's own formula gives severity near 1). It runs
// 100 ticks and reports whether the detectors found an A and a B episode for them. Nothing is saved.
//
//   npx vite-node scripts/vigil_count.ts -- --save C:\dev\lw_saves\rules256\aspen-day48.save.json --days 25 --out C:\dev\lw_labs\vigil_count\aspen.json
//   npx vite-node scripts/vigil_count.ts -- --save C:\dev\lw_saves\rules256\aspen-day48.save.json --control
import { writeFileSync } from 'node:fs';
import { argsOf, worldFromArgs } from './world_args';
import { AGE_ADULT, DAY, DAYS_PER_YEAR } from '../src/sim/constants';
import { ageYears } from '../src/sim/people';
import { isDark } from '../src/sim/environment';
import { FEVER_VISIBLE, looksFeverish } from '../src/sim/fever_sign';
import { stepWorld } from '../src/sim/world';
import type { Person } from '../src/sim/types';

const { opt } = argsOf(process.argv);
const savePath = opt('save', opt('load', ''));
const days = Number(opt('days', '25'));
const out = opt('out', '');
const control = process.argv.includes('--control');
const CHECK = 20; // ticks between condition checks
const HEALTH_LOW = 35;
const CONTROL_TICKS = CHECK * 5;
if (!savePath) throw new Error('--save <path to a .save.json> is required');

const { w, startDay } = worldFromArgs((n, d) => (n === 'load' ? savePath : opt(n, d)));
const startTick = w.tick;
const endTick = startTick + (control ? CONTROL_TICKS : Math.round(days * DAY));
const popStart = w.persons.filter((p) => p.alive).length;
const deadStart = w.deceased.length;
let deceasedSeen = deadStart;

type Cond = 'A' | 'B' | 'C';
interface Ep { cond: Cond; person: number; start: number; end: number; ended: 'death' | 'recovery' | 'open'; sitter: boolean; night: boolean }
const open = new Map<string, Ep>();
const done: Ep[] = [];
const keyOf = (c: Cond, id: number): string => `${c}:${id}`;

/** a living person who could sit beside p: housemate, partner, parent or child */
function hasSitter(p: Person): boolean {
  for (const q of w.persons) {
    if (q.id === p.id || !q.alive) continue;
    if (q.hhId === p.hhId) return true;
    if (p.partnerId === q.id || p.parents.includes(q.id) || p.children.includes(q.id)) return true;
    const k = p.relations[q.id]?.kin ?? '';
    const k2 = q.relations[p.id]?.kin ?? '';
    if (k === 'partner' || k === 'parent' || k === 'child' || k2 === 'partner' || k2 === 'parent' || k2 === 'child') return true;
  }
  return false;
}

function check(): void {
  for (const p of w.persons) {
    if (!p.alive) continue;
    const flagA = p.health < HEALTH_LOW;
    const flagB = looksFeverish(p);
    const flags: [Cond, boolean][] = [['A', flagA], ['B', flagB], ['C', flagA || flagB]];
    for (const [cond, flag] of flags) {
      const k = keyOf(cond, p.id);
      const ep = open.get(k);
      if (flag && !ep) {
        open.set(k, { cond, person: p.id, start: w.tick, end: -1, ended: 'open', sitter: hasSitter(p), night: false });
      } else if (!flag && ep) {
        ep.end = w.tick;
        ep.ended = 'recovery';
        done.push(ep);
        open.delete(k);
      }
    }
  }
}

function closeDead(notice: { id: number; tick: number }): void {
  for (const c of ['A', 'B', 'C'] as Cond[]) {
    const k = keyOf(c, notice.id);
    const ep = open.get(k);
    if (!ep) continue;
    ep.end = notice.tick;
    ep.ended = 'death';
    done.push(ep);
    open.delete(k);
  }
}

// ---------------------------------------------------------------- positive control setup
const controlIds: { A?: number; B?: number } = {};
if (control) {
  const adults = w.persons.filter((p) => p.alive && ageYears(w, p) >= AGE_ADULT);
  if (adults.length < 2) throw new Error('control: needs two living adults in the loaded world');
  const a = adults[0];
  const b = adults[1];
  a.health = 20;
  b.illness = { since: w.tick - DAY, severity: 0.9, rested: 0, course: 3 * DAY, how: 'control' };
  controlIds.A = a.id;
  controlIds.B = b.id;
  console.error(`control: person ${a.id} health set to 20; person ${b.id} fever set (illness.since ${w.tick - DAY}, severity 0.9, course ${3 * DAY})`);
}

// ---------------------------------------------------------------- run
const t0 = Date.now();
const secs = (): number => Math.round((Date.now() - t0) / 100) / 10;
check();
while (w.tick < endTick) {
  stepWorld(w);
  while (deceasedSeen < w.deceased.length) closeDead(w.deceased[deceasedSeen++]);
  if (isDark(w)) for (const ep of open.values()) ep.night = true;
  if (w.tick % CHECK === 0) check();
  if (!control && (w.tick - startTick) % DAY === 0) {
    console.error(`[${secs()}s] day +${(w.tick - startTick) / DAY}: alive ${w.persons.filter((p) => p.alive).length}, open C ${[...open.values()].filter((e) => e.cond === 'C').length}`);
  }
}
for (const ep of open.values()) {
  ep.end = w.tick;
  ep.ended = 'open';
  done.push(ep);
}
open.clear();

// ---------------------------------------------------------------- summary
const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const lengths = (eps: Ep[]): number[] => eps.map((e) => e.end - e.start);
const count = (cond: Cond): number => done.filter((e) => e.cond === cond).length;
const C = done.filter((e) => e.cond === 'C');
const Cl = lengths(C);
const days2 = (t: number | null): number | null => (t === null ? null : Math.round((t / DAY) * 100) / 100);

const result = {
  save: savePath,
  seed: w.settings.seed,
  rulesVersion: w.settings.rulesVersion,
  arrivals: w.settings.immigration,
  startDay,
  daysAsked: days,
  ticksRun: w.tick - startTick,
  daysRun: Math.round(((w.tick - startTick) / DAY) * 100) / 100,
  dayTicks: DAY,
  daysPerYear: DAYS_PER_YEAR,
  checkEveryTicks: CHECK,
  definitions: {
    A: `p.health < ${HEALTH_LOW} (people.ts health scale 0..100)`,
    B: `looksFeverish(p): p.illness && p.illness.severity >= ${FEVER_VISIBLE} (fever_sign.ts FEVER_VISIBLE)`,
    C: 'A or B',
    night: 'isDark(world): world.light < 0.35 (environment.ts), read every tick inside the episode',
    sitter: 'living q with q.hhId === p.hhId, or q.id === p.partnerId, or in p.parents / p.children, or relations kin partner/parent/child either way',
  },
  population: { start: popStart, end: w.persons.filter((p) => p.alive).length, deathsDuringRun: w.deceased.length - deadStart },
  counts: { A: count('A'), B: count('B'), C: count('C') },
  C_detail: {
    withSitterAtStart: C.filter((e) => e.sitter).length,
    withNight: C.filter((e) => e.night).length,
    endedDeath: C.filter((e) => e.ended === 'death').length,
    endedRecovery: C.filter((e) => e.ended === 'recovery').length,
    openAtEnd: C.filter((e) => e.ended === 'open').length,
    medianTicks: median(Cl),
    longestTicks: Cl.length ? Math.max(...Cl) : null,
    medianDays: days2(median(Cl)),
    longestDays: days2(Cl.length ? Math.max(...Cl) : null),
  },
  control: control ? {
    A: controlIds.A !== undefined ? done.filter((e) => e.cond === 'A' && e.person === controlIds.A) : null,
    B: controlIds.B !== undefined ? done.filter((e) => e.cond === 'B' && e.person === controlIds.B) : null,
  } : undefined,
  episodes: done,
  seconds: secs(),
};

if (out) {
  writeFileSync(out, JSON.stringify(result));
  const table = [
    `save ${savePath}`,
    `rules ${result.rulesVersion}  days run ${result.daysRun}  pop ${result.population.start} -> ${result.population.end}  deaths ${result.population.deathsDuringRun}`,
    `episodes A ${result.counts.A}  B ${result.counts.B}  C ${result.counts.C}`,
    `C with sitter ${result.C_detail.withSitterAtStart}  C with night ${result.C_detail.withNight}  C ended death ${result.C_detail.endedDeath}  recovery ${result.C_detail.endedRecovery}  open ${result.C_detail.openAtEnd}`,
    `C length ticks: median ${result.C_detail.medianTicks}  longest ${result.C_detail.longestTicks}   days: median ${result.C_detail.medianDays}  longest ${result.C_detail.longestDays}`,
  ].join('\n');
  writeFileSync(out.replace(/\.json$/, '') + '.txt', table + '\n');
}
if (control) {
  const a = result.control?.A ?? [];
  const b = result.control?.B ?? [];
  console.log(`control A fired: ${a.length > 0} ${JSON.stringify(a)}`);
  console.log(`control B fired: ${b.length > 0} ${JSON.stringify(b)}`);
} else {
  console.log(JSON.stringify({ save: savePath, counts: result.counts, C_detail: result.C_detail, population: result.population, seconds: result.seconds }));
}
console.error(`done in ${secs()}s`);
