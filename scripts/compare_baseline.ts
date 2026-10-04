// Prints a Markdown comparison of the recorded ordinary-world baselines before and after this work.
// usage: npx vite-node scripts/compare_baseline.ts            (reads docs/baseline-{before,after}[-seed].json)
import { existsSync, readFileSync } from 'node:fs';

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
const PAIRS: [string, string, string][] = [
  ['meadow', 'baseline-before.json', 'baseline-after.json'],
  ['river', 'baseline-before-river.json', 'baseline-after-river.json'],
  ['fern', 'baseline-before-fern.json', 'baseline-after-fern.json'],
];
const at = (b: Base, day: number): Row | undefined => b.trajectory.find((r) => r.day === day);
const fmt = (n: number | undefined, d = 0): string => (n === undefined ? '—' : n.toFixed(d));
const minOf = (b: Base, k: 'foodPerHead' | 'meanHunger' | 'meanThirst'): number => Math.min(...b.trajectory.map((r) => r[k]));
const maxOf = (b: Base, k: 'belowCritical' | 'homeless'): number => Math.max(...b.trajectory.map((r) => r[k]));

let out = '';
for (const [seed, bf, af] of PAIRS) {
  const b = load(bf);
  const a = load(af);
  if (!b || !a) {
    out += `*${seed}: ${!b ? bf : af} not recorded*\n\n`;
    continue;
  }
  out += `### ${seed} — ${b.ticks / 2400} days, default settings\n\n`;
  out += '| | before | after |\n|---|---|---|\n';
  for (const d of [0, 10, 20, 30]) out += `| population, day ${d} | ${fmt(at(b, d)?.pop)} | ${fmt(at(a, d)?.pop)} |\n`;
  out += `| children / elders, day 30 | ${fmt(at(b, 30)?.children)} / ${fmt(at(b, 30)?.elders)} | ${fmt(at(a, 30)?.children)} / ${fmt(at(a, 30)?.elders)} |\n`;
  out += `| households / homeless, day 30 | ${fmt(at(b, 30)?.households)} / ${fmt(at(b, 30)?.homeless)} | ${fmt(at(a, 30)?.households)} / ${fmt(at(a, 30)?.homeless)} |\n`;
  out += `| deaths | ${b.deaths.length}${b.deaths.length ? ' (' + b.deaths.map((x) => x.cause).join(', ') + ')' : ''} | ${a.deaths.length}${a.deaths.length ? ' (' + a.deaths.map((x) => x.cause).join(', ') + ')' : ''} |\n`;
  out += `| most people ever below critical at once | ${maxOf(b, 'belowCritical')} | ${maxOf(a, 'belowCritical')} |\n`;
  out += `| lowest food per head | ${fmt(minOf(b, 'foodPerHead'), 1)} | ${fmt(minOf(a, 'foodPerHead'), 1)} |\n`;
  out += `| lowest mean hunger / thirst (100 = fine) | ${fmt(minOf(b, 'meanHunger'))} / ${fmt(minOf(b, 'meanThirst'))} | ${fmt(minOf(a, 'meanHunger'))} / ${fmt(minOf(a, 'meanThirst'))} |\n`;
  out += `| ledger balanced on every recorded day | ${b.trajectory.every((r) => r.ledgerOk)} | ${a.trajectory.every((r) => r.ledgerOk)} |\n`;
  const bb = at(b, 30)?.buildings ?? {};
  const ab = at(a, 30)?.buildings ?? {};
  const kinds = [...new Set([...Object.keys(bb), ...Object.keys(ab)])].sort();
  out += `| buildings, day 30 | ${kinds.filter((k) => bb[k]).map((k) => `${bb[k]} ${k.replace('_', ' ')}`).join(', ')} | ${kinds.filter((k) => ab[k]).map((k) => `${ab[k]} ${k.replace('_', ' ')}`).join(', ')} |\n`;
  out += `| final state hash | \`${b.hash}\` | \`${a.hash}\` |\n\n`;
  const keys = [...new Set([...Object.keys(b.counters), ...Object.keys(a.counters)])].sort();
  out += '| feed events counted over the run | before | after |\n|---|---|---|\n';
  for (const k of keys) out += `| ${k} | ${b.counters[k] ?? 0} | ${a.counters[k] ?? 0} |\n`;
  out += '\n';
}
console.log(out);
