// Prints a Markdown comparison of two recorded sets of baselines.
// usage: npx vite-node scripts/compare_baseline.ts [before-label after-label [keys]]
//   reads docs/baseline-<label>[-<key>].json (the key `meadow` has no suffix; harsh runs are keys like `harsh-river`);
//   with no arguments: before after meadow,river,fern
import { existsSync, readFileSync } from 'node:fs';
import { foodUnits } from '../src/sim/economy';
import type { Items } from '../src/sim/types';

interface Row {
  day: number;
  pop: number;
  children: number;
  elders: number;
  households: number;
  homeless: number;
  buildings: Record<string, number>;
  foodPerHead: number;
  meanHunger: number;
  meanThirst: number;
  stock: Items;
  belowCritical: number;
  deaths: number;
  ledgerOk: boolean;
}
interface Base {
  seed: string;
  harsh: boolean;
  ticks: number;
  hash: string;
  deaths: { name: string; cause: string; tick?: number }[];
  counters: Record<string, number>;
  requestsInBuffer: Record<string, number>;
  trajectory: Row[];
}

const load = (f: string): Base | null => (existsSync(new URL(`../docs/${f}`, import.meta.url)) ? (JSON.parse(readFileSync(new URL(`../docs/${f}`, import.meta.url), 'utf8')) as Base) : null);
const [beforeLabel = 'before', afterLabel = 'after', keys = 'meadow,river,fern'] = process.argv.slice(2);
const file = (label: string, key: string) => `baseline-${label}${key === 'meadow' ? '' : '-' + key}.json`;
const PAIRS: [string, string, string][] = keys.split(',').map((k) => [k, file(beforeLabel, k), file(afterLabel, k)]);
const at = (b: Base, day: number): Row | undefined => b.trajectory.find((r) => r.day === day);
const fmt = (n: number | undefined, d = 0): string => (n === undefined ? '—' : n.toFixed(d));
const minOf = (b: Base, k: 'foodPerHead' | 'meanHunger' | 'meanThirst'): number => Math.min(...b.trajectory.map((r) => r[k]));
const foodOn = (b: Base, day: number): number | undefined => {
  const r = at(b, day);
  return r ? foodUnits(r.stock) : undefined;
};
const maxOf = (b: Base, k: 'belowCritical' | 'homeless'): number => Math.max(...b.trajectory.map((r) => r[k]));

let out = '';
for (const [seed, bf, af] of PAIRS) {
  const b = load(bf);
  const a = load(af);
  if (!b || !a) {
    out += `*${seed}: ${!b ? bf : af} not recorded*\n\n`;
    continue;
  }
  out += `### ${seed} — ${b.ticks / 2400} days, ${b.harsh ? 'harsh' : 'default settings'}\n\n`;
  out += `| | ${beforeLabel} | ${afterLabel} |\n|---|---|---|\n`;
  for (const d of [0, 10, 20, 30]) out += `| population, day ${d} | ${fmt(at(b, d)?.pop)} | ${fmt(at(a, d)?.pop)} |\n`;
  out += `| children / elders, day 30 | ${fmt(at(b, 30)?.children)} / ${fmt(at(b, 30)?.elders)} | ${fmt(at(a, 30)?.children)} / ${fmt(at(a, 30)?.elders)} |\n`;
  out += `| households / homeless, day 30 | ${fmt(at(b, 30)?.households)} / ${fmt(at(b, 30)?.homeless)} | ${fmt(at(a, 30)?.households)} / ${fmt(at(a, 30)?.homeless)} |\n`;
  out += `| deaths | ${b.deaths.length}${b.deaths.length ? ' (' + b.deaths.map((x) => x.cause).join(', ') + ')' : ''} | ${a.deaths.length}${a.deaths.length ? ' (' + a.deaths.map((x) => x.cause).join(', ') + ')' : ''} |\n`;
  out += `| most people ever below critical at once | ${maxOf(b, 'belowCritical')} | ${maxOf(a, 'belowCritical')} |\n`;
  out += `| lowest food per head | ${fmt(minOf(b, 'foodPerHead'), 1)} | ${fmt(minOf(a, 'foodPerHead'), 1)} |\n`;
  out += `| lowest mean hunger / thirst (100 = fine) | ${fmt(minOf(b, 'meanHunger'))} / ${fmt(minOf(b, 'meanThirst'))} | ${fmt(minOf(a, 'meanHunger'))} / ${fmt(minOf(a, 'meanThirst'))} |\n`;
  out += `| mean hunger / thirst, day 30 | ${fmt(at(b, 30)?.meanHunger)} / ${fmt(at(b, 30)?.meanThirst)} | ${fmt(at(a, 30)?.meanHunger)} / ${fmt(at(a, 30)?.meanThirst)} |\n`;
  out += `| food stored (units), day 30 | ${fmt(foodOn(b, 30))} | ${fmt(foodOn(a, 30))} |\n`;
  out += `| ledger balanced on every recorded day | ${b.trajectory.every((r) => r.ledgerOk)} | ${a.trajectory.every((r) => r.ledgerOk)} |\n`;
  const bb = at(b, 30)?.buildings ?? {};
  const ab = at(a, 30)?.buildings ?? {};
  const kinds = [...new Set([...Object.keys(bb), ...Object.keys(ab)])].sort();
  out += `| buildings, day 30 | ${kinds.filter((k) => bb[k]).map((k) => `${bb[k]} ${k.replace('_', ' ')}`).join(', ')} | ${kinds.filter((k) => ab[k]).map((k) => `${ab[k]} ${k.replace('_', ' ')}`).join(', ')} |\n`;
  out += `| final state hash | \`${b.hash}\` | \`${a.hash}\` |\n\n`;
  const keys = [...new Set([...Object.keys(b.counters), ...Object.keys(a.counters)])].sort();
  out += `| feed events counted over the run | ${beforeLabel} | ${afterLabel} |\n|---|---|---|\n`;
  for (const k of keys) out += `| ${k} | ${b.counters[k] ?? 0} | ${a.counters[k] ?? 0} |\n`;
  out += '\n';
}
console.log(out);
