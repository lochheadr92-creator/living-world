// Where the grain goes. Read-only measurement: one ordinary world; over the days asked, what is grown, what becomes of the
// grain (eaten raw, milled, kept as seed, spoiled), how much flour and bread are made and eaten, where grain and bread are kept
// at the end, and how many fields, granaries, mills and bakeries there are for how many people. A year is twelve days.
//
//   npx vite-node scripts/grain_probe.ts -- --seed aspen --days 72 [--from 48] [--rules N] [--out grain.json]
//   (or --load <save point> in place of --seed: see scripts/world_args.ts)
import { writeFileSync } from 'node:fs';
import { worldFromArgs } from './world_args';
import { DAY, NUTRITION } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
let seed = opt('seed', 'aspen');
const days = Number(opt('days', '72'));
const from = Number(opt('from', '0')); // the flows are counted from this day on (the world is run from the start)
const out = opt('out', '');
// a world read from --load (a save point written by a long run) or made fresh (scripts/world_args.ts)
const { w }: { w: World } = worldFromArgs(opt, seed);
seed = w.settings.seed;

const FOODS = Object.keys(NUTRITION) as (keyof typeof NUTRITION)[];
type Snap = { created: Record<string, number>; consumed: Record<string, number>; spoiled: Record<string, number>; reasons: Record<string, number> };
const snap = (): Snap => ({ created: { ...(w.ledger.created as Record<string, number>) }, consumed: { ...(w.ledger.consumed as Record<string, number>) }, spoiled: { ...(w.ledger.spoiled as Record<string, number>) }, reasons: { ...w.ledger.reasons } });
let base: Snap = snap();
// meals by kind, counted as each eating ends (the pack or the store loses the unit; the ledger says "eaten" without the kind)
const eaten: Record<string, number> = {};
let prev = new Map<number, Record<string, number>>();
let personDays = 0;
for (let i = w.tick + 1; i <= days * DAY; i++) {
  if (i === from * DAY + 1) { base = snap(); for (const k of Object.keys(eaten)) delete eaten[k]; personDays = 0; }
  stepWorld(w);
  if (i % DAY === 0) personDays += w.persons.filter((p) => p.alive).length;
}
const now = snap();
const delta = (a: Record<string, number>, b: Record<string, number>, k: string): number => Math.round((a[k] ?? 0) - (b[k] ?? 0));
const flow = (k: string) => ({ made: delta(now.created, base.created, k), used: delta(now.consumed, base.consumed, k), spoiled: delta(now.spoiled, base.spoiled, k) });
const reasons: [string, number][] = [];
for (const [k, n] of Object.entries(now.reasons)) { const d = Math.round(n - (base.reasons[k] ?? 0)); if (d > 0 && /grain|flour|bread|mill|bak|seed|sown|crop|harvest|eaten|granary|brew|beer/i.test(k)) reasons.push([k, d]); }
reasons.sort((a, b) => b[1] - a[1]);
const alive = w.persons.filter((p) => p.alive);
const count = (t: string): number => w.buildings.filter((b) => b.type === t).length;
const held = (k: string) => {
  const o: Record<string, number> = { packs: 0 };
  for (const p of alive) o.packs += (p.inv as Record<string, number>)[k] ?? 0;
  for (const b of w.buildings) { const n = (b.store.items as Record<string, number>)[k] ?? 0; if (n > 0) o[b.type] = (o[b.type] ?? 0) + n; }
  return Object.fromEntries(Object.entries(o).map(([a, n]) => [a, Math.round(n)]).filter(([, n]) => (n as number) > 0));
};
const plotStates: Record<string, number> = {};
for (const pl of w.plots) plotStates[pl.state] = (plotStates[pl.state] ?? 0) + 1;
const span = days - from;
const foodFlows = Object.fromEntries(FOODS.map((k) => [k, flow(k)]).filter(([, f]) => (f as { made: number }).made || (f as { used: number }).used));
const result = { seed, days, from, rulesVersion: w.settings.rulesVersion, alive: alive.length, personDays, plots: w.plots.length, plotStates, households: w.households.filter((h) => alive.some((p) => p.hhId === h.id)).length,
  granaries: count('granary'), mills: count('mill'), bakeries: count('bakery'), storehouses: count('storehouse'), cellars: count('cellar'),
  grain: flow('grain'), flour: flow('flour'), bread: flow('bread'), seeds: flow('seeds'), foodFlows, grainHeld: held('grain'), flourHeld: held('flour'), breadHeld: held('bread'), reasons };
void prev; prev = new Map();
if (out) writeFileSync(out, JSON.stringify(result));
const perDay = (n: number): string => (n / Math.max(1, span)).toFixed(1);
console.log(`${seed}: days ${from} to ${days}, rules ${result.rulesVersion}; ${alive.length} alive in ${result.households} households; ${result.plots} plots ${JSON.stringify(plotStates)}; ${result.granaries} granaries, ${result.mills} mills, ${result.bakeries} bakeries, ${result.cellars} cellars`);
for (const k of ['grain', 'flour', 'bread'] as const) { const f = result[k]; console.log(`  ${k}: made ${f.made} (${perDay(f.made)} a day), eaten or used ${f.used} (${perDay(f.used)} a day), spoiled ${f.spoiled} (${perDay(f.spoiled)} a day)`); }
console.log('  every food, made / eaten or used / spoiled over the span: ' + Object.entries(foodFlows).map(([k, f]) => `${k} ${(f as { made: number }).made}/${(f as { used: number }).used}/${(f as { spoiled: number }).spoiled}`).join('; '));
console.log(`  held at the end: grain ${JSON.stringify(result.grainHeld)}; flour ${JSON.stringify(result.flourHeld)}; bread ${JSON.stringify(result.breadHeld)}`);
console.log('  the goods account, entries about grain, flour, bread, seed and eating: ' + reasons.slice(0, 30).map(([k, n]) => `${k} ${n}`).join('; '));
