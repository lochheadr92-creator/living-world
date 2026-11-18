import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const expected = { 'aspen-day48': 'e4a86f09', 'aspen-day96': '6c19867c', 'gen-4-day48': '3de8459c', 'gen-4-day96': '02e27e8f', 'river-day48': '93015c04', 'river-day96': '594be8ed' };
const root = new URL('./runs/', import.meta.url);
const results = {};
for (const [name, hash] of Object.entries(expected)) {
  const d = JSON.parse(readFileSync(new URL(`${name}.json`, root), 'utf8'));
  const adults = d.rows.filter(r => r.adult);
  const arrived = adults.filter(r => r.arrivedTick !== null);
  const empty = adults.filter(r => r.result === 'took_none_empty');
  const stockPresent = empty.filter(r => r.why === 'stock_there_nothing_allowed');
  const accessZero = stockPresent.filter(r => r.access && r.access.allow === 0);
  const causes = {};
  for (const r of accessZero) causes[r.accessWhy || 'unclassified'] = (causes[r.accessWhy || 'unclassified'] || 0) + 1;
  results[name] = {
    finalHash: d.finalHash, expectedHash: hash, hashMatches: d.finalHash === hash,
    conservation: d.conservation.ok, unseenEnds: d.withdraw.counts.endedWithoutBeingSeen,
    openAtEnd: d.withdraw.counts.stillOpenAtRunEnd, adultsFinished: adults.length,
    startedInWorkPhase: adults.filter(r => r.firstPhase === 'work').length,
    outcomeAll: d.byWalk.allFinishedAdults, outcomeWalked: d.byWalk.finishedAdultsWithWalking, outcomeNoWalk: d.byWalk.finishedAdultsWithoutWalking,
    arrivedAdults: arrived.length, emptyAdults: empty.length, stockPresent: stockPresent.length,
    stockPresentAllowanceZero: accessZero.length,
    stockPresentAllowancePositive: stockPresent.filter(r => r.access && r.access.allow > 0).length,
    stockPresentAccessUnknown: stockPresent.filter(r => !r.access).length,
    zeroAllowanceCauses: causes, deaths: d.deaths, endAlive: d.endAlive, endStoreFood: d.endStoreFood
  };
}
const out = new URL('./SUMMARY.json', import.meta.url);
writeFileSync(out, JSON.stringify(results, null, 2) + '\n');
const bad = Object.entries(results).filter(([,v]) => !v.hashMatches || !v.conservation || v.unseenEnds);
console.log(JSON.stringify({ results, checks: bad.length ? { ok: false, bad } : { ok: true } }, null, 2));
if (bad.length) process.exitCode = 1;
