// Read-only. For each saved world in a lab output dir: the three reference arms (control, nudge:1, nudge:2), their final values on the
// rows fixed in review_evidence/stage1c-20261118/readings_step4_spread255.txt, the range, the mean, and range as a share of the mean.
// usage: node analyze_spread.mjs <lab out dir> [<arm spec to also show as a 4th column, e.g. rich-no-tree-regrowth>]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const extra = process.argv[3];
const ROWS = [
  'companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12',
  'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare', 'hungryShare',
  'sheepAcquired', 'sheepShorn', 'sheepSlaughtered', 'lambsBorn', 'sheepAtEnd', 'sheepKeptAtEnd',
  'plotsRested', 'plotsRestingAtEnd',
  'workNotesKept', 'workTakenUp', 'workNotesSpent',
  'techLessonsLearned', 'techLessonsInterrupted', 'techLessonsDeclined',
  'exchangeJourneysStarted', 'exchangeJourneysArrived', 'exchangeJourneysFulfilled',
  'people', 'deaths',
];
const SHARE = new Set(['companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12', 'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare', 'hungryShare']);
const files = readdirSync(dir).filter((f) => /^lab_.*\.jsonl$/.test(f)).sort();
const worlds = [];
for (const f of files) {
  const rows = readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const bySpec = {};
  for (const r of rows) if (r.spec) bySpec[r.spec] = r;
  worlds.push({ name: f.replace(/^lab_/, '').replace(/\.jsonl$/, ''), bySpec });
}
const fmt = (row, v) => (v === undefined || v === null ? 'n/a' : SHARE.has(row) ? (100 * v).toFixed(2) + '%' : Number.isInteger(v) ? String(v) : v.toFixed(2));
const lines = [];
lines.push(`Spread at the reference arms, from ${dir}`);
for (const w of worlds) {
  const specs = Object.keys(w.bySpec);
  lines.push(`\nWORLD ${w.name}   arms: ${specs.join(', ')}`);
  lines.push('hashes: ' + specs.map((s) => `${s}=${w.bySpec[s].finalHash}`).join('  '));
  lines.push(`${'row'.padEnd(28)}${'control'.padStart(10)}${'nudge:1'.padStart(10)}${'nudge:2'.padStart(10)}${'range'.padStart(10)}${'mean'.padStart(10)}${'range/mean'.padStart(12)}${extra ? extra.slice(0, 12).padStart(14) : ''}`);
  for (const row of ROWS) {
    const vals = ['control', 'nudge:1', 'nudge:2'].map((s) => w.bySpec[s]?.outcome?.[row]);
    if (vals.some((v) => v === undefined)) { lines.push(`${row.padEnd(28)}(missing in outcome)`); continue; }
    const lo = Math.min(...vals), hi = Math.max(...vals), range = hi - lo, mean = vals.reduce((a, b) => a + b, 0) / 3;
    const absent = hi === 0 && lo === 0;
    const rel = absent ? 'absent' : mean ? (100 * range / Math.abs(mean)).toFixed(0) + '%' : 'n/a';
    const ex = extra ? fmt(row, w.bySpec[extra]?.outcome?.[row]).padStart(14) : '';
    lines.push(`${row.padEnd(28)}${vals.map((v) => fmt(row, v).padStart(10)).join('')}${fmt(row, range).padStart(10)}${fmt(row, mean).padStart(10)}${rel.padStart(12)}${ex}`);
  }
}
console.log(lines.join('\n'));
