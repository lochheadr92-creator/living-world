// What a lean season does to a settlement, day by day: the instrument behind "the town starves and four camps do not".
//
// A town of 100 on the ordinary map loses about a tenth of its people in twelve days under rich dynamics, and the same stakes cost
// four camps of 25 half a person. This script is the measurement, not an experiment: an ordinary headless run of one world, with
// nothing switched on or off, printing one line a day of the few quantities that can tell apart "there was no food to be had" from
// "the food was there and went off" from "the food was in a store nobody could reach in time".
//
//   npx vite-node scripts/famine.ts -- --profile town --seed meadow --days 12 --dynamics rich
//
// Per day:
//   alive      people alive at the end of the day
//   gathered   units of food that came out of the ground and the water into somebody's pack that day (the transfer hook)
//   spoiled    units of food that went off that day (the ledger: stores, piles and crops left to rot)
//   eaten      units of food eaten that day
//   stores     food standing in every building's store at the end of the day, and in everyone's packs
//   crit       how many DIFFERENT people were critically hungry (needs.hunger < CRITICAL.hunger) at any sample that day
//   hungry     the most people under the "visibly hungry" line (< 42) at any one sample that day
//   lean/wint  whether a lean season or winter was under way
// and, at the end, every death with what it was of and the day it happened.
import { writeFileSync } from 'node:fs';
import { CRITICAL, DAY } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { dayNumber } from '../src/sim/environment';
import { winterDepth } from '../src/sim/hardship';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { rulesOf } from '../src/sim/rules';
import { stepWorld } from '../src/sim/world';
import type { ItemKind, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'meadow');
const profile = opt('profile', 'town') as ProfileName;
const days = Number(opt('days', '12'));
const dynamics = opt('dynamics', 'rich') as 'authored' | 'rich';
const jsonOut = opt('json', '');

const FOODS: ItemKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'flour'];
const isFoodKind = (k: ItemKind): boolean => FOODS.includes(k);
const sumFood = (m: Partial<Record<ItemKind, number>>): number => FOODS.reduce((n, k) => n + (m[k] ?? 0), 0);

const world: World = createWorld(settingsForProfile(profile, seed, { immigration: false, dynamics }));
let gatheredToday = 0;
let woodToday = 0;
let acts: Record<string, number> = {};
let samples = 0;
world.hooks = {
  onTransfer: (t) => {
    if (t.reason !== 'gather' && t.reason !== 'harvest') return;
    if (isFoodKind(t.item)) gatheredToday += t.n;
    if (t.item === 'wood') woodToday += t.n;
  },
};

interface DayRow {
  day: number;
  alive: number;
  gathered: number;
  spoiled: number;
  eaten: number;
  storeFood: number;
  packFood: number;
  crit: number;
  hungryPeak: number;
  lean: boolean;
  winter: boolean;
  deaths: number;
  wood: number;
  trees: number;
  baskets: number;
  fires: number;
  homeless: number;
  works: number;
  mix: string;
}
const rows: DayRow[] = [];
let spoiledSoFar = 0;
let eatenSoFar = 0;
let critToday = new Set<number>();
let hungryPeak = 0;
let deathsSoFar = 0;

const storeFood = (): number => world.buildings.reduce((n, b) => n + foodUnits(b.store.items), 0) + world.piles.reduce((n, pl) => n + foodUnits(pl.items), 0);
const packFood = (): number => world.persons.filter((p) => p.alive).reduce((n, p) => n + foodUnits(p.inv), 0);

for (let t = 0; t < days * DAY; t++) {
  stepWorld(world);
  if (t % 20 === 0) {
    let hungryNow = 0;
    for (const p of world.persons) {
      if (!p.alive) continue;
      if (p.needs.hunger < CRITICAL.hunger) critToday.add(p.id);
      if (p.needs.hunger < 42) hungryNow++;
    }
    if (hungryNow > hungryPeak) hungryPeak = hungryNow;
    for (const p of world.persons) {
      if (!p.alive) continue;
      const k = p.activity ? p.activity.kind : 'idle';
      acts[k] = (acts[k] ?? 0) + 1;
      samples++;
    }
  }
  if (world.tick % DAY === 0) {
    const spoiled = sumFood(world.ledger.spoiled);
    let eaten = 0;
    for (const k of Object.keys(world.ledger.reasons)) if (k.startsWith('-eaten')) eaten += world.ledger.reasons[k];
    rows.push({
      day: dayNumber(world.tick),
      alive: world.persons.filter((p) => p.alive).length,
      gathered: Math.round(gatheredToday),
      spoiled: Math.round(spoiled - spoiledSoFar),
      eaten: Math.round(eaten - eatenSoFar),
      storeFood: Math.round(storeFood()),
      packFood: Math.round(packFood()),
      crit: critToday.size,
      hungryPeak,
      lean: !!world.hardship,
      winter: winterDepth(world) > 0,
      deaths: world.deceased.length - deathsSoFar,
      wood: Math.round(woodToday),
      trees: world.sources.filter((x) => x.type === 'tree' && x.amount > 0).length,
      baskets: world.tools.filter((t) => t.kind === 'basket').length,
      fires: world.buildings.filter((b) => b.type === 'fire').length,
      homeless: world.households.filter((h) => !h.homeId).length,
      works: world.buildings.filter((b) => b.store.cap > 0 && b.type !== 'lean_to' && b.type !== 'hut' && b.type !== 'house').length,
      mix: Object.entries(acts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, n]) => `${k} ${Math.round((100 * n) / Math.max(1, samples))}%`).join(' '),
    });
    spoiledSoFar = spoiled;
    eatenSoFar = eaten;
    deathsSoFar = world.deceased.length;
    gatheredToday = 0;
    woodToday = 0;
    acts = {};
    samples = 0;
    critToday = new Set();
    hungryPeak = 0;
  }
}

const r = rulesOf(world);
console.log(`seed ${seed} (${profile}, ${dynamics}), ${days} days, ${world.persons.filter((p) => p.alive).length}/${world.settings.population} alive`);
console.log(`rules: facilityRadius ${r.facilityRadius}, facilityAllowance ${(r as { facilityAllowance?: number }).facilityAllowance ?? 1}, wolves ${world.animals.filter((a) => a.type === 'wolf').length}`);
console.log('day  alive  gathered  spoiled  eaten  stores  packs  crit  hungryPeak  lean  deaths | wood  trees  baskets  fires  homeless  works');
for (const d of rows) {
  console.log(
    `${String(d.day).padStart(3)}  ${String(d.alive).padStart(5)}  ${String(d.gathered).padStart(8)}  ${String(d.spoiled).padStart(7)}  ${String(d.eaten).padStart(5)}  ${String(d.storeFood).padStart(6)}  ${String(d.packFood).padStart(5)}  ${String(d.crit).padStart(4)}  ${String(d.hungryPeak).padStart(10)}  ${d.lean ? 'lean' : '    '}  ${String(d.deaths).padStart(6)} | ${String(d.wood).padStart(4)}  ${String(d.trees).padStart(5)}  ${String(d.baskets).padStart(7)}  ${String(d.fires).padStart(5)}  ${String(d.homeless).padStart(8)}  ${String(d.works).padStart(5)}
     ${d.mix}`,
  );
}
const causes: Record<string, number> = {};
for (const d of world.deceased) causes[d.cause] = (causes[d.cause] ?? 0) + 1;
console.log(`deaths: ${world.deceased.length} — ${Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ×${n}`).join('; ') || 'none'}`);
for (const d of world.deceased) console.log(`  d${dayNumber(d.tick)} ${d.name} — ${d.cause}`);
console.log(`workplaces: ${world.buildings.filter((b) => b.type !== 'lean_to' && b.type !== 'hut' && b.type !== 'house' && b.type !== 'fire').map((b) => b.type).sort().join(', ') || 'none'}`);
const worst = rows.reduce((m, d) => Math.max(m, d.crit), 0);
console.log(`worst day: ${worst} people critically hungry; total deaths ${world.deceased.length}`);

if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ seed, profile, dynamics, days, rows, deaths: world.deceased.map((d) => ({ day: dayNumber(d.tick), name: d.name, cause: d.cause })) }, null, 1));
