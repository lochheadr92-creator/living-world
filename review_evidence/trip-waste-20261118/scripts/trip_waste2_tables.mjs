// SCRATCH ONLY (trip waste, second wave, 18 November 2026). Writes out\trip-waste2\tables.md from the three runs of out\trip-waste2,
// checked against the first wave (out\trip-waste). The reading is TRIP_WASTE_READING_AMENDMENT_2.md. node trip_waste2_tables.mjs
import fs from 'node:fs';
const root = 'C:\\dev\\_claude_scratch\\regime-20261117';
const worlds = ['aspen', 'river', 'gen-4'];
const EXPECT = { aspen: '168d98f7', river: '8f513a37', 'gen-4': '523f2943' };
const pct = (x) => (x === null || x === undefined ? 'n/a' : (x * 100).toFixed(1) + '%');
const share = (n, d) => (d > 0 ? n / d : null);
const load = (dir, w) => { const f = `${root}\\out\\${dir}\\${w}-A\\report.json`; return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const L = []; const out = (s = '') => L.push(s);
out('# Trip waste, second wave: tables (SCRATCH ONLY, 18 November 2026)');
out('');
out('Reading: `READING_AMENDMENT_2.md` (SHA-256 `be94dbf6f3e2eec69251d04642edbe527c30ec7ad3a07214e2e426a683488c93`), on top of `READING.md` and amendment 1. The same three runs as the first wave (arm A, 30 days, day 48 saves, rules 250) with the observer extended to read the sim\'s own access rules. One run per world: a description, never a rate. No benefit claim.');
out('');
out('## Checks');
out('');
out('| world | end hash | expected | equal | purity | conservation | withdraw ticks equal | withdraws wave 2 = wave 1 | empty withdraws wave 2 = wave 1 |');
out('|---|---|---|---|---|---|---|---|---|');
const R = {};
for (const w of worlds) {
  const r2 = load('trip-waste2', w), r1 = load('trip-waste', w);
  R[w] = r2;
  if (!r2) { out(`| ${w} | missing | ${EXPECT[w]} | | | | | | |`); continue; }
  const a2 = r2.withdrawCheck.adults, a1 = r1?.withdrawCheck.adults;
  out(`| ${w} | ${r2.hash} | ${EXPECT[w]} | ${r2.hash === EXPECT[w]} | ${r2.purityChecks} | ${r2.conservation.ok} | ${r2.withdrawCheckSelf.equal} | ${a1 ? a2.byResult.withdraws === a1.byResult.withdraws : 'n/a'} (${a2.byResult.withdraws}) | ${a1 ? a2.emptyWithdraws.count === a1.emptyWithdraws.count : 'n/a'} (${a2.emptyWithdraws.count}) |`);
}
out('');
out('## Why the sim allowed none where stock was there (withdraws that took none, empty, with stock there and nothing allowed)');
out('');
out('| world | stock there, nothing allowed | earmarked to others | (owner in own household) | granary, no share | no access | guest stock | other | walking ticks of the earmarked | share of all adult walking ticks | belief named the person as client | belief showed output waiting | all empties |');
out('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const v = {};
for (const w of worlds) {
  const r = R[w]; if (!r) continue;
  const e = r.withdrawCheck.adults.emptyWithdraws, x = e.accessWhy, c = x.count;
  const n = e.why.count.stock_there_nothing_allowed ?? 0;
  const adultTicks = r.tripShape.counts.byStage['12_and_over'].walkingTicks;
  out(`| ${w} | ${n} | ${c['earmarked to others'] ?? 0} (${pct(share(c['earmarked to others'] ?? 0, n))}) | ${x.earmarkedToOthersWithAnOwnerInTheOwnHousehold} | ${c['granary, no share'] ?? 0} | ${c['no access'] ?? 0} | ${c['guest stock'] ?? 0} | ${c.other ?? 0} | ${x.travelTicks['earmarked to others'] ?? 0} | ${pct(share(x.travelTicks['earmarked to others'] ?? 0, adultTicks))} | ${x.beliefNamedThePersonAsClient} | ${x.beliefShowedOutputWaiting} | ${e.count} |`);
  v[w] = { earmark: share(c['earmarked to others'] ?? 0, n), granary: share(c['granary, no share'] ?? 0, n), guest: share(c['guest stock'] ?? 0, n) };
}
const k = (f) => worlds.filter((w) => v[w] && (f(v[w]) ?? 0) >= 0.5).length;
const verdict = k((q) => q.earmark) >= 2 ? 'ACCESS IS EARMARK' : k((q) => q.granary) >= 2 ? 'ACCESS IS THE GRANARY SHARE' : k((q) => q.guest) >= 2 ? 'ACCESS IS GUEST STOCK' : 'MIXED';
out('');
out(`**Verdict by amendment 2: ${verdict}** (earmarked to others ${worlds.map((w) => pct(v[w]?.earmark)).join(' / ')}, granary no share ${worlds.map((w) => pct(v[w]?.granary)).join(' / ')}, guest stock ${worlds.map((w) => pct(v[w]?.guest)).join(' / ')}, in ${worlds.join(' / ')}, as shares of the withdraws with stock there and nothing allowed).`);
out('');
for (const w of worlds) {
  const r = R[w]; if (!r) continue;
  const a = r.withdrawCheck.adults, x = a.emptyWithdraws.accessWhy;
  out(`- ${w}, by building type (reasons of the empty withdraws): ${Object.entries(x.byBuildingType).sort((p, q) => Object.values(q[1]).reduce((s, n) => s + n, 0) - Object.values(p[1]).reduce((s, n) => s + n, 0)).slice(0, 7).map(([t, c]) => `${t}: ${Object.entries(c).map(([why, n]) => `${why} ${n}`).join(', ')}`).join('; ')}. Adult withdraws that reached work with stock there and a zero allowance: ${x.allAdultWithdrawsWithStockThereAndAllowanceZeroAtWork} of ${a.byResult.withdraws}.`);
}
fs.writeFileSync(`${root}\\out\\trip-waste2\\tables.md`, L.join('\n') + '\n');
console.log(`wrote out\\trip-waste2\\tables.md; verdict ${verdict}`);
