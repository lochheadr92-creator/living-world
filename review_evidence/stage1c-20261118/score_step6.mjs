// Read-only. Scores the numbered expectations of Part A in readings_step6_spread256.txt against the four lab dirs.
// usage: node score_step6.mjs <255 d12> <255 d24> <256 d12> <256 d24>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [a12, a24, b12, b24] = process.argv.slice(2);
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
const REF = ['control', 'nudge:1', 'nudge:2'];
const EPS = 1e-12;
function load(dir) {
  const worlds = {};
  for (const f of readdirSync(dir).filter((f) => /^lab_.*\.jsonl$/.test(f)).sort()) {
    const by = {};
    for (const l of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.spec) by[r.spec] = r; }
    worlds[f.replace(/^lab_/, '').replace(/\.jsonl$/, '')] = by;
  }
  return worlds;
}
const stat = (w, row) => {
  const vals = REF.map((s) => w?.[s]?.outcome?.[row]);
  if (vals.some((v) => typeof v !== 'number')) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return { vals, lo, hi, range: hi - lo, mean: vals.reduce((a, b) => a + b, 0) / 3, zero: hi === 0 && lo === 0 };
};
const cmp = (later, earlier) => (later < earlier - EPS ? 'narrower' : later > earlier + EPS ? 'wider' : 'tied');
const D = { a12: load(a12), a24: load(a24), b12: load(b12), b24: load(b24) };
const worlds = Object.keys(D.b12);
const say = (s) => console.log(s);

say('EXPECTATION 1. Three different hashes, and control vs nudge:1');
for (const h of ['12', '24']) for (const v of ['a', 'b']) for (const w of worlds) {
  const x = D[v + h][w];
  const hs = REF.map((s) => x[s]?.finalHash);
  say(`  ${v === 'a' ? '255' : '256'} ${h}d ${w}: distinct ${new Set(hs).size}/3, control=nudge:1 ${hs[0] === hs[1]}, control=nudge:2 ${hs[0] === hs[2]}, nudge:1=nudge:2 ${hs[1] === hs[2]}`);
}

for (const h of ['12', '24']) {
  say(`\nHORIZON ${h} DAYS, 256 range against 255 range`);
  for (const w of worlds) {
    const t = { all: { narrower: 0, wider: 0, tied: 0 }, yard: { narrower: 0, wider: 0, tied: 0 }, life: { narrower: 0, wider: 0, tied: 0 } };
    let inside = 0, counted = 0;
    for (const row of ROWS) {
      const a = stat(D['a' + h][w], row), b = stat(D['b' + h][w], row);
      if (!a || !b || (a.zero && b.zero)) continue;
      const rel = cmp(b.range, a.range);
      t.all[rel]++; if (YARD.includes(row)) t.yard[rel]++; if (LIFE.includes(row)) t.life[rel]++;
      counted++; if (b.mean >= a.lo - EPS && b.mean <= a.hi + EPS) inside++;
    }
    say(`  ${w}: rows narrower ${t.all.narrower} wider ${t.all.wider} tied ${t.all.tied} (net narrowing ${t.all.narrower - t.all.wider}); yardstick narrower ${t.yard.narrower} wider ${t.yard.wider} tied ${t.yard.tied}; people+deaths narrower ${t.life.narrower} wider ${t.life.wider} tied ${t.life.tied}; mean at 256 inside the 255 range on ${inside} of ${counted} rows`);
  }
}

say('\nEXPECTATION 5. Range at 24 days against range at 12 days, same version, same world');
for (const v of ['a', 'b']) for (const w of worlds) {
  const t = { narrower: 0, wider: 0, tied: 0 };
  for (const row of ROWS) {
    const s12 = stat(D[v + '12'][w], row), s24 = stat(D[v + '24'][w], row);
    if (!s12 || !s24 || (s12.zero && s24.zero)) continue;
    t[cmp(s24.range, s12.range)]++;
  }
  say(`  ${v === 'a' ? '255' : '256'} ${w}: the 24 day range is wider on ${t.wider} rows, narrower on ${t.narrower}, tied on ${t.tied}`);
}
