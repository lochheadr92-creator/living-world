// The table for scripts/free_time_split.ts output: waking time by group, three age bands, pooled over the files given and per file.
//   npx vite-node scripts/free_time_report.ts -- a.json b.json ... [--detail a12] [--top 12]
// Groups are read from the activity kind and its label template (scripts/observers/free_time.ts). "Old yardstick" reproduces the 26 November
// reading (time_budget.ts: social_contact plus leisure, work phase only) so the two can be compared.
import { readFileSync } from 'node:fs';

type Band = 'u8' | 'c8_11' | 'a12';
const BANDS: Band[] = ['a12', 'c8_11', 'u8'];
export const GROUPS = [
  'chosen talk', 'family time', 'teaching and practice', 'called gatherings', 'evening at the fire', 'play and games', 'time alone',
  'rest at home', 'care of others', 'asks and gifts', 'work', 'eating, drinking, warming', 'waiting', 'defence', 'none',
] as const;
export type Group = typeof GROUPS[number];
/** what counts as free time for the 30% yardstick */
export const FREE: Group[] = ['chosen talk', 'family time', 'called gatherings', 'evening at the fire', 'play and games', 'time alone'];

export function groupOf(kind: string, label: string): Group {
  const l = label.toLowerCase();
  if (kind === 'none') return 'none';
  if (/practice|showing|teaching|learning|lesson|a story/.test(l) && /converse|socialize|rest|wander/.test(kind)) return 'teaching and practice';
  if (kind === 'converse' && /family time/.test(l)) return 'family time';
  if (['attend', 'attend_meal', 'host_meal', 'pay_respects'].includes(kind)) return 'called gatherings';
  if (/\bfire\b/.test(l) && ['rest', 'wander', 'alone', 'converse'].includes(kind)) return 'evening at the fire';
  if (/play|game|chase|hide|toy|tag\b|catch|skip|dance|sing|song/.test(l) && !['craft', 'gather'].includes(kind)) return 'play and games';
  if (kind === 'converse' || kind === 'argue') return 'chosen talk';
  if (kind === 'wander' || kind === 'alone') return 'time alone';
  if (kind === 'rest') return /settl|watching over|sitting with|vigil/.test(l) ? 'care of others' : 'rest at home';
  if (kind === 'care') return 'care of others';
  if (kind === 'socialize' || kind === 'give' || kind === 'visit') return 'asks and gifts';
  if (['eat', 'eat_store', 'drink', 'warm'].includes(kind)) return 'eating, drinking, warming';
  if (kind === 'flee' || kind === 'defend') return 'defence';
  return 'work';
}
/** time_budget.ts timeCategory's social_contact plus leisure, at the activity (work phase); waiting (blocked) is not seen here */
const oldYardstick = (kind: string, phase: string) =>
  phase === 'work' && ['converse', 'socialize', 'argue', 'attend', 'attend_meal', 'host_meal', 'visit', 'wander', 'alone'].includes(kind);

interface Run { file: string; seed: string; rulesVersion: number; loaded: string; days: number; startPeople: number; endPeople: number; awake: Record<Band, number>; asleep: Record<Band, number>; kinds: Record<string, number>; dark: Record<string, number>; hall: Record<string, number>; halls: number[] }
const pct = (a: number, b: number) => (b ? (100 * a) / b : 0).toFixed(1).padStart(5);

export function split(runs: Run[], band: Band) {
  const at: Record<string, number> = {}, going: Record<string, number> = {};
  let awake = 0, old = 0, hall = 0;
  const examples: Record<string, Record<string, number>> = {};
  for (const r of runs) {
    awake += r.awake[band];
    for (const [k, n] of Object.entries(r.kinds)) {
      const [b, kind, phase, label] = k.split('|');
      if (b !== band) continue;
      const g = groupOf(kind, label ?? '');
      (phase === 'travel' ? going : at)[g] = ((phase === 'travel' ? going : at)[g] ?? 0) + n;
      if (oldYardstick(kind, phase)) old += n;
      const ex = (examples[g] ??= {});
      ex[`${kind}|${label}`] = (ex[`${kind}|${label}`] ?? 0) + n;
    }
    for (const [k, n] of Object.entries(r.hall)) if (k.startsWith(band + '|')) hall += n;
  }
  return { awake, at, going, old, hall, examples };
}

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (n: string, d: string) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const files = args.filter((a, i) => a.endsWith('.json') && args[i - 1] !== '--detail');
if (files.length) { // run as a script with result files; imported (by a test), it only exports
  const runs: Run[] = files.map((f) => ({ file: f, ...JSON.parse(readFileSync(f, 'utf8')) }));
  console.log(`runs: ${runs.map((r) => `${r.seed}${r.loaded ? '(save)' : ''} rules ${r.rulesVersion}, ${r.days} d, ${r.startPeople}>${r.endPeople}`).join('; ')}`);
  for (const band of BANDS) {
    const s = split(runs, band);
    const freeAt = FREE.reduce((t, g) => t + (s.at[g] ?? 0), 0), freeGoing = FREE.reduce((t, g) => t + (s.going[g] ?? 0), 0);
    console.log(`\n${band}: awake samples ${s.awake}. Free time at it ${pct(freeAt, s.awake)}%, walking to it ${pct(freeGoing, s.awake)}%. Old yardstick ${pct(s.old, s.awake)}%. At or going to a hall ${pct(s.hall, s.awake)}%`);
    console.log('  group                       at it  going  (% of waking time)');
    for (const g of GROUPS) if ((s.at[g] ?? 0) + (s.going[g] ?? 0)) console.log(`  ${(FREE.includes(g) ? '* ' : '  ') + g.padEnd(26)}${pct(s.at[g] ?? 0, s.awake)}  ${pct(s.going[g] ?? 0, s.awake)}`);
  }
  console.log('\nper run, 12 and over: free time at it / old yardstick');
  for (const r of runs) { const s = split([r], 'a12'); const f = FREE.reduce((t, g) => t + (s.at[g] ?? 0), 0); console.log(`  ${r.seed}${r.loaded ? '(save)' : ''}: ${pct(f, s.awake)}% / ${pct(s.old, s.awake)}%`); }
  console.log('\nchildren in the dark (light < 0.5), share of dark samples');
  for (const band of ['u8', 'c8_11'] as const) {
    const d: Record<string, number> = {};
    for (const r of runs) for (const [k, n] of Object.entries(r.dark)) if (k.startsWith(band + '|')) d[k.split('|')[1]] = (d[k.split('|')[1]] ?? 0) + n;
    const tot = Object.values(d).reduce((a, b) => a + b, 0);
    console.log(`  ${band}: ${['asleep_in', 'asleep_out', 'awake_in', 'awake_out'].map((k) => `${k} ${pct(d[k] ?? 0, tot)}%`).join('  ')}  (samples ${tot})`);
  }
  const detail = opt('detail', '') as Band | '';
  if (detail) {
    const s = split(runs, detail), top = Number(opt('top', '12'));
    for (const g of GROUPS) {
      const ex = Object.entries(s.examples[g] ?? {}).sort((a, b) => b[1] - a[1]).slice(0, top);
      if (ex.length) console.log(`\n[${g}] ${ex.map(([k, n]) => `${k} ${pct(n, s.awake).trim()}`).join(' ; ')}`);
    }
  }
}
