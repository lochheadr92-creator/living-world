import { readFileSync, writeFileSync } from 'node:fs';

const noise = { 'aspen-day48': .92, 'aspen-day96': .59, 'gen-4-day48': .66, 'gen-4-day96': 1.19, 'river-day48': 1.40, 'river-day96': 1.68 };
const pct = (a, b) => b ? 100 * a / b : null;
function metrics(d) {
  const all = d.rows.filter(r => r.adult), arrived = all.filter(r => r.arrivedTick !== null), walked = all.filter(r => r.travelTicks > 0);
  const empty = xs => xs.filter(r => r.result === 'took_none_empty').length;
  const noFood = d.day.hungryTime.crossTab.filter(x => x.packFood === 'none' && (x.homeStoreFood === 'empty' || x.homeStoreFood === 'no_home')).reduce((n,x) => n + x.ticks, 0);
  const awake = d.day.hungryTime.wakingTicks;
  const t = d.time.totals;
  return { finished: all.length, empty: empty(all), emptyPct: pct(empty(all), all.length), arrived: arrived.length, emptyArrivedPct: pct(empty(arrived), arrived.length), walked: walked.length, emptyWalkedPct: pct(empty(walked), walked.length), zeroAllowance: all.filter(r => r.result === 'took_none_empty' && r.why === 'stock_there_nothing_allowed' && r.access?.allow === 0).length, unseen: d.withdraw.counts.endedWithoutBeingSeen, open: d.withdraw.counts.stillOpenAtRunEnd, conservation: d.conservation.ok, deaths: d.deaths, hungryNoFoodPct: pct(noFood, awake), storeFoodPerPerson: d.endAlive ? d.endStoreFood / d.endAlive : null, companyLeisureAllAgesPct: pct(t.social_contact + t.leisure, awake), travelAllAgesPct: pct(t.travel, awake), hash: d.finalHash, stageCheck: d.trip.selfChecks.tripTicksByStageEqualOwnCounts };
}
const results = {};
for (const [name, spread] of Object.entries(noise)) {
  const get = arm => JSON.parse(readFileSync(new URL(`./fix-runs/${name}-${arm}.json`, import.meta.url), 'utf8'));
  const on = get('on'), off = get('off');
  if (on.rulesVersion !== 257 || off.rulesVersion !== 257 || on.benchOff || !off.benchOff) throw new Error(`Wrong arm for ${name}`);
  const a = metrics(on), b = metrics(off);
  const hungerDiff = a.hungryNoFoodPct - b.hungryNoFoodPct;
  results[name] = { on: a, off: b, mechanismHalved: a.emptyPct !== null && b.emptyPct !== null && a.emptyPct <= b.emptyPct / 2, survival: { deathsWithinLimit: a.deaths <= b.deaths + 2, hungryNoFoodDifferencePoints: hungerDiff, limitPoints: spread + 3, closeToBoundary: Math.abs(hungerDiff - spread - 3) < .02, hungryWithinLimit: hungerDiff <= spread + 3 }, noisePoints: spread };
}
writeFileSync(new URL('./FIX_SUMMARY.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
if (Object.values(results).some(v => !v.on.conservation || !v.off.conservation || v.on.unseen || v.off.unseen)) process.exitCode = 1;
