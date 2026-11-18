// Read-only. Stage 1d step 8, as fixed in readings_step8_baseline_lab.txt: the baseline at current rules per save, and for each removal arm
// which rows moved beyond the spread of control, nudge:1 and nudge:2, in how many starts and which way.
// usage: node analyze_step8.mjs <lab out dir> [<lab out dir> ...] [--extra=<dir>[,<dir>...]] [--ref=control,nudge:1,nudge:2]
//   each dir holds lab_<seed>-day<N>.jsonl files. --extra merges the arms of other runs of the same saves (the supplementary nudges of the
//   dated note in the readings); --ref names the reference arms (default: the three fixed in the readings, control, nudge:1, nudge:2).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const flag = (n) => process.argv.slice(2).find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const dirs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const extraDirs = (flag('extra') ?? '').split(',').filter(Boolean);
const REF = (flag('ref') ?? 'control,nudge:1,nudge:2').split(',');
const REMOVAL = ['rich-no-tree-regrowth', 'rich-no-bigger-reserve', 'rich-no-grow-more', 'rich-no-farm-draw'];
const ROWS = [
  'companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12',
  'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare', 'hungryShare',
  'sheepAcquired', 'sheepShorn', 'sheepSlaughtered', 'lambsBorn', 'sheepAtEnd', 'sheepKeptAtEnd',
  'plotsRested', 'plotsRestingAtEnd',
  'workNotesKept', 'workTakenUp', 'workNotesSpent',
  'techLessonsLearned', 'techLessonsInterrupted', 'techLessonsDeclined',
  'exchangeJourneysStarted', 'exchangeJourneysArrived', 'exchangeJourneysFulfilled',
  'people', 'deaths',
  'homeFoodPerPerson', 'storeFoodPerPerson', 'plots', 'buildings',
];
const SHARE = new Set(['companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12', 'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare', 'hungryShare']);
const FLOOR = (row) => (SHARE.has(row) ? 0.005 : 1);
const EPS = 1e-12;
const fmt = (row, v) => (v === undefined ? 'n/a' : SHARE.has(row) ? (100 * v).toFixed(2) + '%' : Number.isInteger(v) ? String(v) : v.toFixed(2));

const starts = [];
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((f) => /^lab_.*\.jsonl$/.test(f)).sort()) {
    const by = {};
    for (const l of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.spec) by[r.spec] = r; }
    const name = f.replace(/^lab_/, '').replace(/\.jsonl$/, '');
    const m = name.match(/^(.*)-day(\d+)$/);
    starts.push({ name, seed: m ? m[1] : name, day: m ? Number(m[2]) : 0, by });
  }
}
for (const extraDir of extraDirs) {
  for (const f of readdirSync(extraDir).filter((f) => /^lab_.*\.jsonl$/.test(f)).sort()) {
    const name = f.replace(/^lab_/, '').replace(/\.jsonl$/, '');
    const s = starts.find((x) => x.name === name);
    if (!s) continue;
    for (const l of readFileSync(join(extraDir, f), 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(l);
      if (r.spec && !s.by[r.spec]) s.by[r.spec] = r; // arms the main run does not carry; the control is kept from the main run
    }
  }
}
starts.sort((a, b) => a.name.localeCompare(b.name)); // the output does not depend on the order the directories are given in
console.log(`STARTS: ${starts.map((s) => s.name).join(', ')} (${starts.length}); reference arms: ${REF.join(', ')}`);
const val = (s, spec, row) => s.by[spec]?.outcome?.[row];
const refStat = (s, row) => {
  const v = REF.map((k) => val(s, k, row));
  if (v.some((x) => typeof x !== 'number')) return null;
  const lo = Math.min(...v), hi = Math.max(...v);
  return { v, lo, hi, range: hi - lo, mean: v.reduce((a, b) => a + b, 0) / v.length };
};
const absent = (s, row) => [...REF, ...REMOVAL].every((k) => (val(s, k, row) ?? 0) === 0);

console.log('\n=== BASELINE AT CURRENT RULES (control, nudge:1, nudge:2; range; mean) ===');
for (const s of starts) {
  const hs = REF.map((k) => s.by[k]?.finalHash);
  console.log(`\n${s.name}   hashes ${REF.map((k, i) => `${k}=${hs[i]}`).join('  ')}   distinct ${new Set(hs).size}/${REF.length}${new Set(hs).size < REF.length ? '   ** a reference arm repeats another: this start has fewer than ' + REF.length + ' trajectories **' : ''}`);
  for (const row of ROWS) {
    if (absent(s, row)) continue;
    const st = refStat(s, row);
    if (!st) { console.log(`  ${row.padEnd(26)}(missing)`); continue; }
    console.log(`  ${row.padEnd(26)}${st.v.map((x) => fmt(row, x).padStart(9)).join('')}   range ${fmt(row, st.range).padStart(8)}   mean ${fmt(row, st.mean).padStart(8)}`);
  }
}

const tally = {};
for (const arm of REMOVAL) {
  console.log(`\n=== ${arm} against the spread of the three reference arms ===`);
  console.log(`rule: outside [min - R, max + R], R = range of the three, floor 1 (count) or 0.5 points (share)`);
  const rowsOut = [];
  for (const row of ROWS) {
    const per = [];
    for (const s of starts) {
      if (absent(s, row)) { per.push({ s, dir: 'absent' }); continue; }
      const st = refStat(s, row), x = val(s, arm, row);
      if (!st || typeof x !== 'number') { per.push({ s, dir: 'missing' }); continue; }
      const R = Math.max(st.range, FLOOR(row));
      const dir = x < st.lo - R - EPS ? 'down' : x > st.hi + R + EPS ? 'up' : 'in';
      per.push({ s, dir, x, st });
    }
    const live = per.filter((p) => p.dir !== 'absent' && p.dir !== 'missing');
    if (!live.length) continue;
    const up = per.filter((p) => p.dir === 'up'), down = per.filter((p) => p.dir === 'down');
    const moved = up.length + down.length;
    const finding = Math.max(up.length, down.length) >= 4;
    rowsOut.push({ row, per, up, down, moved, finding, live: live.length });
    (tally[arm] ??= []).push({ row, up: up.length, down: down.length, live: live.length, finding });
  }
  const moved = rowsOut.filter((r) => r.moved > 0).sort((a, b) => b.moved - a.moved);
  if (!moved.length) console.log('  no row moved beyond the spread in any start (a null)');
  for (const r of moved) {
    const detail = r.per.filter((p) => p.dir === 'up' || p.dir === 'down').map((p) => `${p.s.name} ${p.dir} (${fmt(r.row, p.x)} against ${fmt(r.row, p.st.lo)} to ${fmt(r.row, p.st.hi)})`).join('; ');
    console.log(`  ${r.finding ? 'FINDING ' : '        '}${r.row.padEnd(26)} moved in ${r.moved} of ${r.live} starts (up ${r.up.length}, down ${r.down.length}): ${detail}`);
  }
  const findings = rowsOut.filter((r) => r.finding);
  console.log(`  rows moved in at least one start: ${moved.length} of ${rowsOut.length}; findings (same way in at least 4 starts): ${findings.length}`);
  for (const r of findings) {
    const seeds = [...new Set(starts.map((s) => s.seed))];
    const bySeed = seeds.map((sd) => {
      const ps = r.per.filter((p) => p.s.seed === sd && (p.dir === 'up' || p.dir === 'down'));
      const dirs2 = r.per.filter((p) => p.s.seed === sd).map((p) => p.dir);
      return `${sd}: ${dirs2.join('/')}`;
    });
    console.log(`    per seed for ${r.row}: ${bySeed.join('; ')}`);
  }
}

console.log('\n=== GUARD RAILS (provisional cell: hungryNoFoodShare = no food in the pack and none in the home store) ===');
for (const arm of REMOVAL) {
  for (const row of ['deaths', 'hungryNoFoodShare']) {
    const t = (tally[arm] ?? []).find((x) => x.row === row);
    console.log(`  ${arm.padEnd(26)} ${row.padEnd(18)} ${t ? `down in ${t.down} (the part makes it worse), up in ${t.up} (the part helps), of ${t.live} starts` : 'absent'}`);
  }
}
const yard = starts.map((s) => `${s.name} ${fmt('companyLeisureShare12', refStat(s, 'companyLeisureShare12')?.mean)}`).join(', ');
console.log(`\nYARDSTICK (company plus leisure, 12 and over, mean of the three reference arms): ${yard}; target 30%`);
