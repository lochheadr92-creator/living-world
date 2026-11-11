// Phase 0 of docs/CHILDHOOD_AND_PLAY_PLAN.md: what a child's day is today. A measurement, not a rule; nothing in the simulation reads
// it. One ordinary Normal world (arrivals on, current rules) is stepped for the given days and read three ways:
//   time   every tick each living person's current activity is counted under their age band (under 7, 7 to 11, youth, adult, elder):
//          the kind of activity, a gather split by what is gathered, a conversation by its purpose. Sleep is the pose, whatever else.
//   food   units taken from a source are read from each person's own gathered counter at every activity end (so a resumed gather is
//          not counted twice), under the band and household they have at that moment; harvest units are the harvest's own count.
//   skill  each person's foraging, fishing and farming skill when first seen and at the end, and for each under-twelve at the end how
//          many grown people could still teach them foraging (the rule of childhood.ts: the teacher must know more).
// Childhood sessions (family time, a game, foraging practice) are counted by how they ended and why.
//   node node_modules/vite-node/dist/cli.mjs scripts/childhood_probe.ts -- <seed> [days=25] [out.json]
//   node node_modules/vite-node/dist/cli.mjs scripts/childhood_probe.ts -- report <dir with the out.json files> [report.txt]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGE_ADULT, AGE_CHILD, AGE_ELDER, CRITICAL, DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { ageYears } from '../src/sim/people';
import { currentWorldSettings } from '../src/sim/profiles';
import type { Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';

const BANDS = ['little', 'child', 'youth', 'adult', 'elder'] as const;
type Band = typeof BANDS[number];
const BAND_NAME: Record<Band, string> = { little: 'under 7', child: '7 to 11', youth: '12 to 15', adult: 'adult', elder: 'elder' };
const LITTLE = 7;
const bandOfAge = (a: number): Band => (a < LITTLE ? 'little' : a < AGE_CHILD ? 'child' : a < AGE_ADULT ? 'youth' : a < AGE_ELDER ? 'adult' : 'elder');
const FOOD_SOURCES = new Set(['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot']);
const GROUPS: Record<string, string[]> = {
  'sleep and rest': ['sleep', 'rest'],
  'own needs': ['eat', 'eat_store', 'drink', 'warm', 'flee', 'search'],
  'food and water work': ['gather food', 'fetch_water', 'harvest', 'hunt', 'butcher'],
  'company and play': ['socialize', 'attend', 'attend_meal', 'host_meal', 'visit', 'pay_respects', 'wander', 'alone', 'argue'],
  nothing: ['nothing'],
};
const groupOf = (key: string): string => {
  if (key.startsWith('talk: ')) return 'company and play';
  for (const [g, ks] of Object.entries(GROUPS)) if (ks.includes(key)) return g;
  return 'other work';
};
const add = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };
const r1 = (n: number): number => Math.round(n * 10) / 10;
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

interface BandRow { personTicks: number; awakeTicks: number; hungryTicks: number; criticalTicks: number; hungerSum: number; use: Record<string, number>; ended: Record<string, number>; units: Record<string, number>; talks: Record<string, number> }
interface PersonRow { name: string; hh: number; ageFirst: number; ageEnd: number; forageFirst: number; forageEnd: number; fishFirst: number; fishEnd: number; farmEnd: number; foodUnits: number; alive: boolean; teachers?: number; grownSeen?: number; bestAtHome?: number }
interface Result {
  seed: string; days: number; rules: number; bands: Record<Band, BandRow>;
  households: { id: number; withUnderTwelve: boolean; units: Record<Band, number> }[];
  sessions: Record<string, Record<string, number>>;
  people: PersonRow[];
  headcount: { start: Record<Band, number>; end: Record<Band, number> };
}

function run(seed: string, days: number): Result {
  const w: World = createWorld(currentWorldSettings('normal', seed, { immigration: true }));
  const bandOf = (p: Person): Band => bandOfAge(ageYears(w, p));
  const bands = Object.fromEntries(BANDS.map((b) => [b, { personTicks: 0, awakeTicks: 0, hungryTicks: 0, criticalTicks: 0, hungerSum: 0, use: {}, ended: {}, units: {}, talks: {} }])) as Record<Band, BandRow>;
  const people = new Map<number, PersonRow>();
  const seenGathered = new Map<number, number>();
  const hhUnits = new Map<number, Record<Band, number>>();
  const hhHadChild = new Set<number>();
  const convs = new Map<number, { purpose: string; outcome: string; reason: string }>();
  const meet = (p: Person): PersonRow => {
    let r = people.get(p.id);
    if (!r) {
      r = { name: p.name, hh: p.hhId, ageFirst: r1(ageYears(w, p)), ageEnd: 0, forageFirst: r3(p.skills.forage), forageEnd: 0, fishFirst: r3(p.skills.fish), fishEnd: 0, farmEnd: 0, foodUnits: 0, alive: true };
      people.set(p.id, r);
      seenGathered.set(p.id, p.stats.gathered);
    }
    return r;
  };
  const headcount = (): Record<Band, number> => {
    const n = Object.fromEntries(BANDS.map((b) => [b, 0])) as Record<Band, number>;
    for (const p of w.persons) if (p.alive) n[bandOf(p)]++;
    return n;
  };
  for (const p of w.persons) if (p.alive) meet(p);
  const start = headcount();
  w.hooks = {
    ...(w.hooks ?? {}),
    onActivityEnd: (p, a, outcome) => {
      const row = meet(p);
      const b = bandOf(p);
      const stype = String(a.data.stype ?? '');
      const key = a.kind === 'gather' ? (FOOD_SOURCES.has(stype) ? 'gather food' : stype === 'tree' ? 'gather wood' : 'gather stone or clay') : a.kind;
      if (outcome === 'success') add(bands[b].ended, key);
      const got = p.stats.gathered - (seenGathered.get(p.id) ?? 0);
      seenGathered.set(p.id, p.stats.gathered);
      let food = 0;
      if (got > 0) {
        const what = a.kind === 'gather' ? (FOOD_SOURCES.has(stype) ? (stype === 'fish_spot' ? 'fish' : 'wild plants') : 'wood, stone or clay') : a.kind === 'hunt' ? 'hunted' : 'other';
        add(bands[b].units, what, got);
        if (what === 'fish' || what === 'wild plants' || what === 'hunted') food += got;
      }
      if (a.kind === 'harvest' && outcome === 'success' && a.cycle > 0) { add(bands[b].units, 'harvest', a.cycle); food += a.cycle; }
      if (food > 0) {
        row.foodUnits += food;
        const h = hhUnits.get(p.hhId) ?? (Object.fromEntries(BANDS.map((x) => [x, 0])) as Record<Band, number>);
        h[b] += food;
        hhUnits.set(p.hhId, h);
      }
    },
  };
  const end = days * DAY;
  while (w.tick < end) {
    stepWorld(w);
    const purposeOf = new Map<number, string>();
    for (const c of w.conversations) {
      purposeOf.set(c.id, c.purpose);
      const known = convs.get(c.id);
      if (!known) {
        const pa = w.byId.get(c.a), pb = w.byId.get(c.b);
        for (const q of [pa, pb]) if (q && q.ent === 'person') add(bands[bandOf(q)].talks, c.purpose);
      }
      convs.set(c.id, { purpose: c.purpose, outcome: c.childhood?.outcome ?? '', reason: c.childhood?.reason ?? '' });
    }
    for (const p of w.persons) {
      if (!p.alive) continue;
      meet(p);
      const b = bands[bandOf(p)];
      if (ageYears(w, p) < AGE_CHILD) hhHadChild.add(p.hhId);
      b.personTicks++;
      let key: string;
      if (p.pose === 'sleep') key = 'sleep';
      else {
        b.awakeTicks++;
        b.hungerSum += p.needs.hunger;
        if (p.needs.hunger < 62) b.hungryTicks++;
        if (p.needs.hunger < CRITICAL.hunger) b.criticalTicks++;
        const a = p.activity;
        if (!a) key = 'nothing';
        else if (a.kind === 'gather') { const st = String(a.data.stype ?? ''); key = FOOD_SOURCES.has(st) ? 'gather food' : st === 'tree' ? 'gather wood' : 'gather stone or clay'; }
        else if (a.kind === 'converse') key = 'talk: ' + (purposeOf.get(p.convId) ?? 'unknown');
        else key = a.kind;
      }
      add(b.use, key);
    }
  }
  const sessions: Record<string, Record<string, number>> = {};
  for (const c of convs.values()) {
    if (c.purpose !== 'family_time' && c.purpose !== 'play_together' && c.purpose !== 'learn_foraging') continue;
    const why = c.outcome === 'completed' ? 'completed' : c.outcome === 'sharing' ? 'still under way or cut short' : `${c.outcome || 'never began'}: ${c.reason}`;
    add((sessions[c.purpose] ??= {}), why);
  }
  const alive = w.persons.filter((p) => p.alive);
  const grown = alive.filter((p) => ageYears(w, p) >= AGE_CHILD);
  // a person who has left the register keeps the row they were first seen with: mark every row dead, then read the living
  for (const r of people.values()) r.alive = false;
  for (const p of w.persons) {
    const r = people.get(p.id);
    if (!r) continue;
    r.alive = p.alive;
    r.hh = p.hhId;
    r.ageEnd = r1(ageYears(w, p));
    r.forageEnd = r3(p.skills.forage); r.fishEnd = r3(p.skills.fish); r.farmEnd = r3(p.skills.farm);
    if (p.alive && ageYears(w, p) < AGE_CHILD) {
      r.grownSeen = grown.length;
      r.teachers = grown.filter((q) => q.skills.forage > p.skills.forage + 0.001).length;
      const home = grown.filter((q) => q.hhId === p.hhId);
      r.bestAtHome = home.length ? r3(Math.max(...home.map((q) => q.skills.forage))) : undefined;
    }
  }
  return {
    seed, days, rules: w.settings.rulesVersion ?? 0, bands,
    households: w.households.map((h) => ({ id: h.id, withUnderTwelve: hhHadChild.has(h.id), units: hhUnits.get(h.id) ?? (Object.fromEntries(BANDS.map((x) => [x, 0])) as Record<Band, number>) })),
    sessions, people: [...people.values()], headcount: { start, end: headcount() },
  };
}

function report(dir: string): string {
  const runs: Result[] = readdirSync(dir).filter((f) => f.startsWith('childhood-') && f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  if (!runs.length) throw Error(`no childhood-*.json in ${dir}`);
  const L: string[] = [];
  const n = runs.length;
  L.push(`Childhood probe: ${n} seeds (${runs.map((r) => r.seed).join(', ')}), Normal, arrivals on, rules ${runs[0].rules}, ${runs[0].days} days. Sums over all seeds unless a line says "a settlement".`);
  const sum = (f: (r: Result) => number): number => runs.reduce((s, r) => s + f(r), 0);
  L.push('', 'People alive, mean a settlement (start -> end):');
  for (const b of BANDS) L.push(`  ${BAND_NAME[b].padEnd(9)} ${r1(sum((r) => r.headcount.start[b]) / n)} -> ${r1(sum((r) => r.headcount.end[b]) / n)}`);
  // time use
  const groups = ['sleep and rest', 'own needs', 'food and water work', 'other work', 'company and play', 'nothing'];
  L.push('', 'Hours of a 24-hour day by age band (every tick counted):', '  ' + 'band'.padEnd(10) + groups.map((g) => g.padStart(21)).join(''));
  const useOf = (b: Band): Record<string, number> => { const u: Record<string, number> = {}; for (const r of runs) for (const [k, v] of Object.entries(r.bands[b].use)) add(u, k, v); return u; };
  for (const b of BANDS) {
    const u = useOf(b);
    const all = Object.values(u).reduce((s, v) => s + v, 0);
    if (!all) { L.push('  ' + BAND_NAME[b].padEnd(10) + '  nobody of this age'); continue; }
    const g: Record<string, number> = {};
    for (const [k, v] of Object.entries(u)) add(g, groupOf(k), v);
    L.push('  ' + BAND_NAME[b].padEnd(10) + groups.map((x) => r1(((g[x] ?? 0) / all) * 24).toFixed(1).padStart(21)).join(''));
  }
  L.push('', 'The waking day in detail, hours of 24 (activities of 0.05 hours and more):');
  for (const b of BANDS) {
    const u = useOf(b);
    const all = Object.values(u).reduce((s, v) => s + v, 0);
    if (!all) continue;
    const rows = Object.entries(u).filter(([k]) => k !== 'sleep').map(([k, v]) => [k, (v / all) * 24] as const).filter(([, h]) => h >= 0.05).sort((x, y) => y[1] - x[1]);
    L.push(`  ${BAND_NAME[b]}: ` + rows.map(([k, h]) => `${k} ${h.toFixed(2)}`).join('; '));
  }
  // hunger
  L.push('', 'Hunger while awake:', '  ' + 'band'.padEnd(10) + 'mean hunger'.padStart(13) + 'hungry (<62)'.padStart(15) + 'critical (<14)'.padStart(16));
  for (const b of BANDS) {
    const aw = sum((r) => r.bands[b].awakeTicks);
    if (!aw) continue;
    L.push('  ' + BAND_NAME[b].padEnd(10) + r1(sum((r) => r.bands[b].hungerSum) / aw).toFixed(1).padStart(13) + ((sum((r) => r.bands[b].hungryTicks) / aw) * 100).toFixed(1).padStart(14) + '%' + ((sum((r) => r.bands[b].criticalTicks) / aw) * 100).toFixed(2).padStart(15) + '%');
  }
  // food
  L.push('', 'Food taken from the land, units a settlement over the run (wild plants, fish, hunted, harvest), and per person-day:');
  const foodKinds = ['wild plants', 'fish', 'hunted', 'harvest'];
  let total = 0;
  const perBand: Record<string, number> = {};
  for (const b of BANDS) { perBand[b] = sum((r) => foodKinds.reduce((s, k) => s + (r.bands[b].units[k] ?? 0), 0)); total += perBand[b]; }
  for (const b of BANDS) {
    const pt = sum((r) => r.bands[b].personTicks);
    if (!pt) continue;
    L.push(`  ${BAND_NAME[b].padEnd(9)} ${r1(perBand[b] / n).toFixed(1).padStart(7)} units (${((perBand[b] / total) * 100).toFixed(1)}% of all), ${(perBand[b] / (pt / DAY)).toFixed(2)} a person-day; ` + foodKinds.map((k) => `${k} ${r1(sum((r) => r.bands[b].units[k] ?? 0) / n)}`).join(', '));
  }
  const under12Share = (perBand.little + perBand.child) / total;
  const headShare = (sum((r) => r.bands.little.personTicks) + sum((r) => r.bands.child.personTicks)) / sum((r) => BANDS.reduce((s, b) => s + r.bands[b].personTicks, 0));
  L.push(`  under-twelves are ${(headShare * 100).toFixed(1)}% of person-days and take ${(under12Share * 100).toFixed(1)}% of the food units.`);
  const hh = runs.flatMap((r) => r.households.filter((h) => h.withUnderTwelve).map((h) => ({ kids: h.units.little + h.units.child, all: BANDS.reduce((s, b) => s + h.units[b], 0) }))).filter((h) => h.all > 0);
  const shares = hh.map((h) => h.kids / h.all).sort((a, b) => a - b);
  if (shares.length) {
    L.push(`  households that had an under-twelve and took any food: ${shares.length}. Their under-twelves took ${((hh.reduce((s, h) => s + h.kids, 0) / hh.reduce((s, h) => s + h.all, 0)) * 100).toFixed(1)}% of the household's units (pooled); median household ${(shares[Math.floor(shares.length / 2)] * 100).toFixed(0)}%; ` +
      `${shares.filter((s) => s >= 0.5).length} households at half or more, ${shares.filter((s) => s >= 0.25).length} at a quarter or more, ${shares.filter((s) => s === 0).length} at none.`);
  }
  // endings
  L.push('', 'Activities ended in success, a person-day, for the under-twelves and adults (0.02 and more):');
  for (const b of ['little', 'child', 'adult'] as Band[]) {
    const pd = sum((r) => r.bands[b].personTicks) / DAY;
    if (!pd) continue;
    const e: Record<string, number> = {};
    for (const r of runs) for (const [k, v] of Object.entries(r.bands[b].ended)) add(e, k, v);
    L.push(`  ${BAND_NAME[b]}: ` + Object.entries(e).map(([k, v]) => [k, v / pd] as const).filter(([, v]) => v >= 0.02).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v.toFixed(2)}`).join('; '));
  }
  // sessions
  L.push('', 'Childhood sessions, a settlement over the run, by how they ended:');
  for (const kind of ['family_time', 'play_together', 'learn_foraging']) {
    const s: Record<string, number> = {};
    for (const r of runs) for (const [k, v] of Object.entries(r.sessions[kind] ?? {})) add(s, k, v);
    const all = Object.values(s).reduce((x, v) => x + v, 0);
    L.push(`  ${kind}: ${r1(all / n)} asked; ` + Object.entries(s).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${r1(v / n)} (${((v / all) * 100).toFixed(0)}%)`).join('; '));
  }
  const kidDays = (sum((r) => r.bands.little.personTicks) + sum((r) => r.bands.child.personTicks)) / DAY;
  const done = (kind: string): number => sum((r) => r.sessions[kind]?.completed ?? 0);
  L.push(`  completed a child-day: family time ${(done('family_time') / kidDays).toFixed(2)}, a game ${(done('play_together') / kidDays).toFixed(2)}, foraging practice ${(done('learn_foraging') / kidDays).toFixed(2)}.`);
  // skills
  L.push('', 'Skill at the end by age band (living people):', '  ' + 'band'.padEnd(10) + 'people'.padStart(8) + 'forage'.padStart(9) + 'fish'.padStart(8) + 'farm'.padStart(8));
  const living = runs.flatMap((r) => r.people.filter((p) => p.alive));
  for (const b of BANDS) {
    const ps = living.filter((p) => bandOfAge(p.ageEnd) === b);
    if (!ps.length) continue;
    const m = (f: (p: PersonRow) => number): string => (ps.reduce((s, p) => s + f(p), 0) / ps.length).toFixed(3);
    L.push('  ' + BAND_NAME[b].padEnd(10) + String(ps.length).padStart(8) + m((p) => p.forageEnd).padStart(9) + m((p) => p.fishEnd).padStart(8) + m((p) => p.farmEnd).padStart(8));
  }
  const kids = living.filter((p) => p.ageEnd < AGE_CHILD && p.grownSeen !== undefined);
  if (kids.length) {
    const here = kids.filter((p) => p.ageFirst !== p.ageEnd);
    L.push(`  under-twelves alive at the end: ${kids.length}. Foraging skill when first seen ${(here.reduce((s, p) => s + p.forageFirst, 0) / here.length).toFixed(3)}, at the end ${(here.reduce((s, p) => s + p.forageEnd, 0) / here.length).toFixed(3)}; food units taken each over the run, mean ${r1(kids.reduce((s, p) => s + p.foodUnits, 0) / kids.length)}.`);
    const share = kids.map((p) => (p.grownSeen ? (p.teachers ?? 0) / p.grownSeen : 0));
    L.push(`  grown people who could still teach a child foraging (know more than the child): mean ${((share.reduce((s, x) => s + x, 0) / share.length) * 100).toFixed(0)}% of the grown people alive; ${kids.filter((p) => (p.teachers ?? 0) === 0).length} children have nobody; ` +
      `${kids.filter((p) => p.bestAtHome !== undefined && p.forageEnd >= (p.bestAtHome ?? 0)).length} forage as well as or better than the best grown person in their own household.`);
  }
  return L.join('\n') + '\n';
}

const args = process.argv.slice(2).filter((a) => a !== '--');
if (args[0] === 'report') {
  const text = report(args[1] ?? '.');
  if (args[2]) writeFileSync(args[2], text);
  console.log(text);
} else {
  const seed = args[0] ?? 'meadow';
  const days = Number(args[1] ?? 25);
  const result = run(seed, days);
  if (args[2]) writeFileSync(args[2], JSON.stringify(result));
  const kids = result.bands.little.personTicks + result.bands.child.personTicks;
  console.log(`${seed}: rules ${result.rules}, ${days} days, under-twelve person-days ${r1(kids / DAY)}, people seen ${result.people.length}`);
}
