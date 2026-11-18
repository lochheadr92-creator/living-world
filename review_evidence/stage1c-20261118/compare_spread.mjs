// Read-only. Part A of stage 1c step 6, as fixed in readings_step6_spread256.txt: for each world and row, the range of the three reference
// arms (control, nudge:1, nudge:2) at two versions, and whether the later one is NARROWER, WIDER or TIED; the counts per world; and the
// mean of the three arms at each version. A row zero in all six values is absent and left out.
// usage: node compare_spread.mjs <earlier lab out dir> <later lab out dir>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dirA, dirB] = process.argv.slice(2);
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
const YARD = ['companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12'];
const LIFE = ['people', 'deaths'];
const SHARE = new Set(['companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12', 'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare', 'hungryShare']);
const REF = ['control', 'nudge:1', 'nudge:2'];
function load(dir) {
  const worlds = {};
  for (const f of readdirSync(dir).filter((f) => /^lab_.*\.jsonl$/.test(f)).sort()) {
    const bySpec = {};
    for (const l of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.spec) bySpec[r.spec] = r; }
    worlds[f.replace(/^lab_/, '').replace(/\.jsonl$/, '')] = bySpec;
  }
  return worlds;
}
const A = load(dirA), B = load(dirB);
const fmt = (row, v) => (v === undefined ? 'n/a' : SHARE.has(row) ? (100 * v).toFixed(2) + '%' : Number.isInteger(v) ? String(v) : v.toFixed(2));
const stat = (w, row) => {
  const vals = REF.map((s) => w?.[s]?.outcome?.[row]);
  if (vals.some((v) => typeof v !== 'number')) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return { vals, range: hi - lo, mean: vals.reduce((a, b) => a + b, 0) / 3, zero: hi === 0 && lo === 0 };
};
const out = [];
const say = (s) => { out.push(s); console.log(s); };
say(`Spread, earlier ${dirA}\n        against later ${dirB}`);
const EPS = 1e-12;
for (const name of Object.keys(A)) {
  if (!B[name]) { say(`\nWORLD ${name}: not in the later run`); continue; }
  say(`\nWORLD ${name}`);
  say('hashes earlier: ' + REF.map((s) => `${s}=${A[name][s]?.finalHash}`).join('  '));
  say('hashes later:   ' + REF.map((s) => `${s}=${B[name][s]?.finalHash}`).join('  '));
  const distinct = (w) => new Set(REF.map((s) => w[s]?.finalHash)).size;
  say(`distinct final hashes among the three arms: earlier ${distinct(A[name])}, later ${distinct(B[name])}   control = nudge:1 at the later version: ${B[name].control?.finalHash === B[name]['nudge:1']?.finalHash}`);
  say(`${'row'.padEnd(26)}${'range earlier'.padStart(15)}${'range later'.padStart(14)}${'  later is'.padStart(11)}${'mean earlier'.padStart(15)}${'mean later'.padStart(13)}${'later mean inside earlier range'.padStart(34)}`);
  const tally = { all: { narrower: 0, wider: 0, tied: 0, absent: 0 }, yard: { narrower: 0, wider: 0, tied: 0 }, life: { narrower: 0, wider: 0, tied: 0 } };
  for (const row of ROWS) {
    const a = stat(A[name], row), b = stat(B[name], row);
    if (!a || !b) { say(`${row.padEnd(26)}(missing)`); continue; }
    if (a.zero && b.zero) { tally.all.absent++; say(`${row.padEnd(26)}absent in both`); continue; }
    const rel = b.range < a.range - EPS ? 'narrower' : b.range > a.range + EPS ? 'wider' : 'tied';
    tally.all[rel]++;
    if (YARD.includes(row)) tally.yard[rel]++;
    if (LIFE.includes(row)) tally.life[rel]++;
    const lo = Math.min(...a.vals), hi = Math.max(...a.vals);
    const inside = b.mean >= lo - EPS && b.mean <= hi + EPS;
    say(`${row.padEnd(26)}${fmt(row, a.range).padStart(15)}${fmt(row, b.range).padStart(14)}${rel.padStart(11)}${fmt(row, a.mean).padStart(15)}${fmt(row, b.mean).padStart(13)}${String(inside).padStart(34)}`);
  }
  say(`TALLY ${name}: all rows narrower ${tally.all.narrower}, wider ${tally.all.wider}, tied ${tally.all.tied}, absent ${tally.all.absent}; yardstick shares (4) narrower ${tally.yard.narrower}, wider ${tally.yard.wider}, tied ${tally.yard.tied}; people and deaths narrower ${tally.life.narrower}, wider ${tally.life.wider}, tied ${tally.life.tied}`);
}
if (process.argv[4]) { import('node:fs').then((fs) => fs.writeFileSync(process.argv[4], out.join('\n') + '\n')); }
