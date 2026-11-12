// One ordinary world, day by day: what the land holds and what the people take from it. Read-only measurement: nothing is switched
// unless asked, and nothing is written but the JSON named by --out. It was written to trace the aspen famine of the 60-day lab at
// rules 216 (docs/LEAN_YEARS.md): it reproduces a lab control exactly (the world is built as scripts/lab_seed.ts builds it for
// fork 0, and the day-60 hash and daily population it prints are the lab row's).
//
//   npx vite-node scripts/hardship_trace.ts -- --seed aspen --days 72 [--arrivals on|off] [--rules N] [--out trace.json]
//       [--stakes off] [--lean-seasons off] [--lean off]
//
// One row a day: people alive, born, arrived and died (by cause); food gathered, harvested, eaten and spoiled; food in stores and
// packs; the wild food standing on the whole map and the most it can hold; how many were critically hungry; the share of
// people-samples under the hungry line; winter depth, the hardship under way and the regrowth rate.
// Arms (diagnostic only): `--stakes off` is the lab's own switch (no lean or dry season, no winter, ordinary spoilage and wolves);
// `--lean-seasons off` is the lab's rich-no-lean-seasons (no lean season; dry spells stay); `--lean off` clears a lean OR dry
// season the moment it is declared, which no lab arm does. `--rules N` runs an earlier rules version on today's code.
import { writeFileSync } from 'node:fs';
import { CRITICAL, DAY } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { winterDepth, regrowRate, setStakes } from '../src/sim/hardship';
import { setLeanSeasons } from '../src/sim/lean_years';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { ageYears, stageOf } from '../src/sim/people';
import { rulesOf } from '../src/sim/rules';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { ItemKind, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'aspen');
const days = Number(opt('days', '72'));
const arrivals = opt('arrivals', 'on') === 'on';
const out = opt('out', '');
const stakesOff = opt('stakes', 'on') === 'off';
const leanOff = opt('lean', 'on') === 'off';
if (stakesOff) setStakes(false);
if (opt('lean-seasons', 'on') === 'off') setLeanSeasons(false);

const rules = parseRunRules('rich');
const settings = freshRunSettings(rules, 'normal', seed, { immigration: arrivals });
const pinned = opt('rules', '');
if (pinned) settings.rulesVersion = Number(pinned);
const w: World = deserializeWorld(serializeWorld(createWorld(settings)));

const FOOD_SOURCES = ['berry_bush', 'fruit_tree', 'fish_spot', 'wild_grain'];
let gathered = 0;
let harvested = 0;
w.hooks = {
  onTransfer: (t: { reason: string; item: ItemKind; n: number }) => {
    if (foodUnits({ [t.item]: 1 } as never) <= 0) return;
    if (t.reason === 'gather') gathered += t.n;
    if (t.reason === 'harvest') harvested += t.n;
  },
} as never;

const storeFood = (): number => w.buildings.reduce((n, b) => n + foodUnits(b.store.items), 0) + w.piles.reduce((n, pl) => n + foodUnits(pl.items), 0);
const packFood = (): number => w.persons.filter((p) => p.alive).reduce((n, p) => n + foodUnits(p.inv), 0);
const eatenTotal = (): number => {
  let e = 0;
  for (const k of Object.keys(w.ledger.reasons)) if (k.startsWith('-eaten')) e += w.ledger.reasons[k];
  return e;
};
const spoiledTotal = (): number => {
  let s = 0;
  for (const k of Object.keys(w.ledger.spoiled) as ItemKind[]) if (foodUnits({ [k]: 1 } as never) > 0) s += w.ledger.spoiled[k] ?? 0;
  return s;
};

const seen = new Set<number>(w.persons.map((p) => p.id));
let eatenSoFar = 0;
let spoiledSoFar = 0;
let deathsSoFar = 0;
let crit = new Set<number>();
let hungrySum = 0;
let samples = 0;
let acts: Record<string, number> = {};
const rows: Record<string, unknown>[] = [];
const pop: number[] = [];
let hash60 = '';

for (let i = 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (leanOff && w.hardship) delete w.hardship;
  if (i % 40 === 0) {
    for (const p of w.persons) {
      if (!p.alive) continue;
      if (p.needs.hunger < CRITICAL.hunger) crit.add(p.id);
      if (p.needs.hunger < 42) hungrySum++;
      samples++;
      const k = p.activity ? p.activity.kind : 'idle';
      acts[k] = (acts[k] ?? 0) + 1;
    }
  }
  if (i % DAY === 0) {
    const day = i / DAY;
    const alive = w.persons.filter((p) => p.alive);
    pop.push(alive.length);
    if (day === 60) hash60 = hashWorld(w);
    let born = 0;
    let came = 0;
    for (const p of alive) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (ageYears(w, p) < 1) born++;
      else came++;
    }
    // people who arrived and died within the same day are not in `alive`; count them from the death list
    const todays = w.deceased.slice(deathsSoFar);
    for (const d of todays) if (!seen.has(d.id)) { seen.add(d.id); came++; }
    const causes: Record<string, number> = {};
    for (const d of todays) causes[d.cause] = (causes[d.cause] ?? 0) + 1;
    const wild: Record<string, number> = {};
    const wildMax: Record<string, number> = {};
    for (const s of w.sources) {
      if (!FOOD_SOURCES.includes(s.type)) continue;
      wild[s.type] = (wild[s.type] ?? 0) + s.amount;
      wildMax[s.type] = (wildMax[s.type] ?? 0) + s.max;
    }
    const wildNow = Object.values(wild).reduce((a, b) => a + b, 0);
    const wildCap = Object.values(wildMax).reduce((a, b) => a + b, 0);
    const eaten = eatenTotal();
    const spoiled = spoiledTotal();
    const stages: Record<string, number> = {};
    for (const p of alive) stages[stageOf(w, p)] = (stages[stageOf(w, p)] ?? 0) + 1;
    const plots: Record<string, number> = {};
    for (const pl of w.plots) plots[pl.state] = (plots[pl.state] ?? 0) + 1;
    const store = storeFood();
    const packs = packFood();
    rows.push({
      day,
      alive: alive.length,
      born,
      came,
      died: todays.length,
      causes,
      gathered: Math.round(gathered),
      harvested: Math.round(harvested),
      eaten: Math.round(eaten - eatenSoFar),
      spoiled: Math.round(spoiled - spoiledSoFar),
      store: Math.round(store),
      packs: Math.round(packs),
      perHead: +((store + packs) / Math.max(1, alive.length)).toFixed(2),
      wild: Math.round(wildNow),
      wildCap: Math.round(wildCap),
      wildByType: Object.fromEntries(Object.entries(wild).map(([k, v]) => [k, Math.round(v)])),
      crit: crit.size,
      hungryShare: +(hungrySum / Math.max(1, samples)).toFixed(2),
      winter: +winterDepth(w).toFixed(2),
      hardship: w.hardship ? w.hardship.kind : '',
      regrow: +regrowRate(w).toFixed(2),
      stages,
      plots,
      plotStock: Math.round(w.plots.reduce((n, pl) => n + (pl.stock ?? 0), 0)),
      acts: Object.entries(acts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} ${Math.round((100 * n) / Math.max(1, samples))}%`).join(' '),
    });
    eatenSoFar = eaten;
    spoiledSoFar = spoiled;
    deathsSoFar = w.deceased.length;
    gathered = 0;
    harvested = 0;
    crit = new Set();
    hungrySum = 0;
    samples = 0;
    acts = {};
    console.error(`day ${day} alive ${alive.length}`);
  }
}

const r = rulesOf(w);
const result = {
  seed,
  arrivals,
  stakesOff,
  leanOff,
  days,
  rulesVersion: w.settings.rulesVersion,
  immigrationCap: r.immigrationCap,
  hash60,
  pop,
  rows,
  deaths: w.deceased.map((d) => ({ day: +(d.tick / DAY).toFixed(2), name: d.name, cause: d.cause, age: +d.age.toFixed(1) })),
};
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ seed, arrivals, hash60, pop }));
