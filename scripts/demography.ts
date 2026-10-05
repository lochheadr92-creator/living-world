// A fast demographic check of the age model: the real mortality, fertility, childbirth and frailty functions, with simplified rules for
// everything else (couples form, every settled couple is fed and housed, arrivals come when the village is small). It runs hundreds of
// simulated years in seconds, so it answers "does the population hold steady?" without a 45-minute full simulation. It is OPTIMISTIC
// about food and housing, so it bounds what the full simulation can do; it does not replace it.
//   npx vite-node scripts/demography.ts [seeds=20] [years=300] [arrivals=on|off]
import { childbirthRisk, fertilityAt, frailtyOf, lifeDraw, mortalityPerYear } from '../src/sim/ageing';
import { BIRTH_SPACING_TICKS, CONCEPTION_PER_YEAR, PREGNANCY_TICKS, TICKS_PER_YEAR } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { ageYears } from '../src/sim/people';

const seeds = Number(process.argv[2] ?? 20);
const years = Number(process.argv[3] ?? 300);
const arrivals = (process.argv[4] ?? 'on') !== 'off';
const LIFE = 60;
const CONC = 200;

interface P { id: number; born: number; sex: 'f' | 'm'; partner: number; preg: number; lastBirth: number; alive: boolean; frail: number; hh: number }

function run(seedName: string) {
  const w = createWorld(defaultSettings(seedName));
  let nextId = 100000;
  const fakeWorld = { seed: seedName } as never;
  const people: P[] = w.persons.map((p) => ({ id: p.id, born: -Math.round(ageYears(w, p) * TICKS_PER_YEAR), sex: p.sex, partner: 0, preg: 0, lastBirth: -1e9, alive: true, frail: frailtyOf(w, p), hh: p.hhId }));
  for (const p of w.persons) if (p.partnerId) people.find((x) => x.id === p.id)!.partner = p.partnerId;
  const age = (p: P, t: number) => (t - p.born) / TICKS_PER_YEAR;
  const causes: Record<string, number> = {};
  const bands: Record<string, number> = { 'under 12': 0, '12-44': 0, '45-61': 0, '62+': 0 };
  let ageAtDeathSum = 0;
  let deaths = 0;
  const popAt: Record<number, number> = {};
  let lowTime = 0;
  let extinct = -1;
  let rng = 12345 + seedName.length * 7;
  const rand = () => ((rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296);
  let lastArrival = 0;
  const T = years * TICKS_PER_YEAR;
  const kill = (p: P, t: number, cause: string) => {
    p.alive = false;
    causes[cause] = (causes[cause] ?? 0) + 1;
    const ag = age(p, t);
    bands[ag < 12 ? 'under 12' : ag < 45 ? '12-44' : ag < 62 ? '45-61' : '62+']++;
    ageAtDeathSum += age(p, t);
    deaths++;
    const mate = people.find((x) => x.id === p.partner);
    if (mate) mate.partner = 0;
  };
  for (let t = LIFE; t <= T; t += LIFE) {
    for (const p of people) {
      if (!p.alive) continue;
      const a = age(p, t);
      const h = mortalityPerYear(a, p.frail);
      if (lifeDraw(fakeWorld, p as never, Math.floor(t / LIFE), 91) < 1 - Math.exp((-h * LIFE) / TICKS_PER_YEAR)) kill(p, t, a < 12 ? 'childhood' : a < 62 ? 'illness' : 'old age');
    }
    for (const m of people) {
      if (!m.alive || m.preg <= 0 || t < m.preg) continue;
      m.preg = 0;
      m.lastBirth = t;
      const baby: P = { id: nextId++, born: t, sex: rand() < 0.5 ? 'f' : 'm', partner: 0, preg: 0, lastBirth: -1e9, alive: true, frail: 1, hh: m.hh };
      baby.frail = frailtyOf(fakeWorld, { id: baby.id } as never);
      people.push(baby);
      if (lifeDraw(fakeWorld, m as never, baby.id, 93) < childbirthRisk(age(m, t), m.frail)) kill(m, t, 'childbirth');
    }
    if (t % CONC < LIFE) {
      const living = people.filter((p) => p.alive);
      if (living.length <= 64) {
        for (const m of living) {
          if (m.sex !== 'f' || !m.partner || m.preg > 0) continue;
          const fert = fertilityAt(age(m, t));
          const dad = living.find((x) => x.id === m.partner);
          if (fert <= 0 || !dad) continue;
          const kids = living.filter((x) => x.hh === m.hh && age(x, t) < 12).length;
          if (kids >= 3 || t - m.lastBirth < BIRTH_SPACING_TICKS) continue;
          if (rand() < (CONCEPTION_PER_YEAR * fert * CONC) / TICKS_PER_YEAR) m.preg = t + PREGNANCY_TICKS;
        }
        const singles = living.filter((p) => !p.partner && age(p, t) >= 17 && age(p, t) <= 55);
        for (const f of singles.filter((p) => p.sex === 'f' && age(p, t) <= 44)) {
          if (f.partner || rand() > (0.6 * CONC) / TICKS_PER_YEAR) continue;
          const m = singles.find((x) => x.sex === 'm' && !x.partner && Math.abs(age(x, t) - age(f, t)) < 14);
          if (m) { f.partner = m.id; m.partner = f.id; m.hh = f.hh; }
        }
      }
    }
    if (arrivals && t - lastArrival >= 6000) {
      const pop = people.filter((p) => p.alive).length;
      if (pop < 54 && pop >= 4 && rand() < 0.35) {
        lastArrival = t;
        const a = 18 + rand() * 30;
        const id = nextId++;
        people.push({ id, born: t - Math.round(a * TICKS_PER_YEAR), sex: rand() < 0.5 ? 'f' : 'm', partner: 0, preg: 0, lastBirth: -1e9, alive: true, frail: frailtyOf(fakeWorld, { id } as never), hh: id });
      }
    }
    const pop = people.filter((p) => p.alive).length;
    if (pop < 10) lowTime += LIFE;
    if (pop === 0 && extinct < 0) { extinct = t / TICKS_PER_YEAR; break; }
    const yr = Math.floor(t / TICKS_PER_YEAR);
    if (t % TICKS_PER_YEAR < LIFE && [5, 10, 25, 50, 100, 200, 300].includes(yr)) popAt[yr] = pop;
  }
  const final = people.filter((p) => p.alive);
  return { bands, avgPop: 0, popAt, extinct, lowShare: lowTime / T, deaths, meanAge: deaths ? ageAtDeathSum / deaths : 0, causes, final: final.length, kids: final.filter((p) => age(p, T) < 12).length, elders: final.filter((p) => age(p, T) >= 62).length };
}

const rows = [];
for (let i = 0; i < seeds; i++) rows.push(run(['meadow', 'river', 'fern', 'aspen'][i % 4] + (i >= 4 ? String(i) : '')));
const q = (xs: number[], f: number) => xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(f * xs.length))];
console.log(`${seeds} worlds, ${years} simulated years each, arrivals ${arrivals ? 'on' : 'off'}`);
console.log(`extinct: ${rows.filter((r) => r.extinct >= 0).length}/${seeds}${rows.some((r) => r.extinct >= 0) ? ' at years ' + rows.filter((r) => r.extinct >= 0).map((r) => r.extinct.toFixed(0)).join(',') : ''}`);
for (const y of [5, 10, 25, 50, 100, 200, 300]) {
  const xs = rows.map((r) => r.popAt[y]).filter((v) => v !== undefined);
  if (xs.length) console.log(`  year ${String(y).padStart(3)}: pop min ${Math.min(...xs)}  median ${q(xs, 0.5)}  max ${Math.max(...xs)}`);
}
console.log(`share of time below 10 people: median ${(q(rows.map((r) => r.lowShare), 0.5) * 100).toFixed(1)}%  worst ${(Math.max(...rows.map((r) => r.lowShare)) * 100).toFixed(1)}%`);
console.log(`mean age at death ${(rows.reduce((s, r) => s + r.meanAge, 0) / rows.length).toFixed(1)}; final mix (median): ${q(rows.map((r) => r.final), 0.5)} people, ${q(rows.map((r) => r.kids), 0.5)} children, ${q(rows.map((r) => r.elders), 0.5)} elders`);
const all: Record<string, number> = {};
for (const r of rows) for (const [k, v] of Object.entries(r.causes)) all[k] = (all[k] ?? 0) + v;
console.log('deaths by cause:', JSON.stringify(all));
const tot = Object.values(all).reduce((a, b) => a + b, 0);
const band: Record<string, number> = {};
for (const r of rows) for (const [k, v] of Object.entries(r.bands)) band[k] = (band[k] ?? 0) + v;
console.log('deaths by age band:', Object.entries(band).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)}%`).join(', '));
console.log(`deaths per world per year: ${(tot / (rows.length * years)).toFixed(2)} (one every ${(12 / (tot / (rows.length * years))).toFixed(1)} days of simulated time)`);
