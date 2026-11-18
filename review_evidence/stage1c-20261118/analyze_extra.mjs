// Read-only. Supplementary nudge arms (3, 4, 5) against the three reference arms of the 12 day set (rules 255, readings_step4_spread255.txt).
// usage: node analyze_extra.mjs <ref dir (control, nudge:1, nudge:2)> <extra dir (control, nudge:3, nudge:4, nudge:5)>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [refDir, extraDir] = process.argv.slice(2);
const ROWS = [
  'companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12',
  'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare', 'hungryShare',
  'sheepAcquired', 'sheepShorn', 'sheepSlaughtered', 'lambsBorn', 'sheepAtEnd', 'sheepKeptAtEnd',
  'plotsRested', 'plotsRestingAtEnd', 'workNotesKept', 'workTakenUp', 'workNotesSpent',
  'techLessonsLearned', 'techLessonsInterrupted', 'techLessonsDeclined',
  'exchangeJourneysStarted', 'exchangeJourneysArrived', 'exchangeJourneysFulfilled', 'people', 'deaths',
];
const SHARE = new Set(['companyShare12', 'leisureShare12', 'companyLeisureShare12', 'walkingShare12', 'hungryPackShare', 'hungryStoreOnlyShare', 'hungryNoFoodShare', 'hungryShare']);
const load = (dir) => {
  const out = {};
  for (const f of readdirSync(dir).filter((x) => /^lab_.*\.jsonl$/.test(x)).sort()) {
    const by = {};
    for (const l of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.spec) by[r.spec] = r; }
    out[f.replace(/^lab_/, '').replace(/\.jsonl$/, '')] = by;
  }
  return out;
};
const ref = load(refDir), ext = load(extraDir);
const lines = [`Supplementary nudge arms, rules 255, 12 days. Reference: ${refDir}. Extra: ${extraDir}`];
const fmt = (row, v) => (SHARE.has(row) ? (100 * v).toFixed(2) + '%' : Number.isInteger(v) ? String(v) : v.toFixed(2));
let absorbed = 0, arms = 0, moved = 0, cells = 0, dup = 0;
for (const world of Object.keys(ref)) {
  const R = ref[world], E = ext[world];
  lines.push(`\nWORLD ${world}`);
  const all = { ...R, ...E };
  lines.push('hashes: ' + Object.entries({ 'control(ref)': R.control, 'control(extra)': E.control, 'nudge:1': R['nudge:1'], 'nudge:2': R['nudge:2'], 'nudge:3': E['nudge:3'], 'nudge:4': E['nudge:4'], 'nudge:5': E['nudge:5'] }).map(([k, v]) => `${k}=${v?.finalHash}`).join('  '));
  lines.push(`control reproduced exactly: ${R.control.finalHash === E.control.finalHash}`);
  { const names = ['control', 'nudge:1', 'nudge:2', 'nudge:3', 'nudge:4', 'nudge:5']; const seen = {}; for (const s of names) { const h = all[s].finalHash; if (seen[h]) { dup++; lines.push(`  ${s} ended identical to ${seen[h]} (same final hash ${h})`); } else seen[h] = s; } lines.push(`  distinct trajectories: ${Object.keys(seen).length} of ${names.length}`); }
  const ctrl = R.control.finalHash;
  for (const s of ['nudge:1', 'nudge:2', 'nudge:3', 'nudge:4', 'nudge:5']) { arms++; if (all[s].finalHash === ctrl) { absorbed++; lines.push(`  ${s} ended identical to control (absorbed)`); } }
  lines.push(`${'row'.padEnd(26)}${['control', 'n1', 'n2', 'n3', 'n4', 'n5'].map((x) => x.padStart(9)).join('')}${'range3'.padStart(9)}${'range6'.padStart(9)}  extras outside [lo-R, hi+R]`);
  for (const row of ROWS) {
    const v3 = ['control', 'nudge:1', 'nudge:2'].map((s) => R[s].outcome[row]);
    const v6 = ['control', 'nudge:1', 'nudge:2', 'nudge:3', 'nudge:4', 'nudge:5'].map((s) => all[s].outcome[row]);
    if (v6.every((v) => v === 0)) { lines.push(`${row.padEnd(26)}absent`); continue; }
    const lo = Math.min(...v3), hi = Math.max(...v3), r3 = hi - lo, r6 = Math.max(...v6) - Math.min(...v6);
    const Rr = Math.max(r3, SHARE.has(row) ? 0.005 : 1);
    const out = ['nudge:3', 'nudge:4', 'nudge:5'].filter((s) => { const v = all[s].outcome[row]; return v < lo - Rr || v > hi + Rr; });
    cells += 3; moved += out.length;
    lines.push(`${row.padEnd(26)}${v6.map((v) => fmt(row, v).padStart(9)).join('')}${fmt(row, r3).padStart(9)}${fmt(row, r6).padStart(9)}  ${out.join(',') || '-'}`);
  }
}
lines.push(`\nAbsorbed (ended with the control's hash): ${absorbed} of ${arms} nudged arms across 3 worlds.`);
lines.push(`Arms that ended with the final hash of an earlier arm in the same world (control, 1, 2, 3, 4, 5 in that order): ${dup} of 18 arms.`);
lines.push(`Extra arms outside the move band of the three reference arms: ${moved} of ${cells} row cells (rows that are zero in all six arms excluded). By the rule's own estimate about 13 percent (normal) to 15 percent (exponential) of cells would fall outside by chance.`);
console.log(lines.join('\n'));
