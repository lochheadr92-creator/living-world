// Read of TripShape.storeBeliefs (stage 1c, 18 November 2026): withdraw walks, belief against truth. Read only. Run from the repo root:
//   fresh world:  SEED=river DAYS=10 node_modules\.bin\vite-node.cmd review_evidence\stage1c-20261118\store_beliefs_run.ts
//   from a save:  LOAD=C:\dev\lw_saves\day48\river-day48.save.json DAYS=3 node_modules\.bin\vite-node.cmd review_evidence\stage1c-20261118\store_beliefs_run.ts
// All three day observers are attached, and the same world is stepped as an unwatched twin, so the run is also a purity check of
// DayShape, TripShape (with the store look) and OutdoorCompany together, compared byte for byte at the end of every day.
// Writes store_beliefs_<label>.json (the whole storeBeliefs block, the selfChecks and the source-anchor misses) next to this file.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { DAY } from '../../src/sim/constants';
import { DayShape } from '../../scripts/observers/day_shape';
import { TripShape } from '../../scripts/observers/trip_shape';
import { OutdoorCompany } from '../../scripts/observers/outdoor_company';

const load = process.env.LOAD ?? '';
const days = Number(process.env.DAYS ?? '10');
const w = load
  ? deserializeWorld(readFileSync(load, 'utf8'))
  : createWorld(currentWorldSettings('normal', process.env.SEED ?? 'river', { immigration: false }));
const label = load ? basename(load).replace(/\.save\.json$/, '') : (process.env.SEED ?? 'river');
const twin = deserializeWorld(serializeWorld(w));
const startTick = w.tick;
const startPeople = w.persons.filter((p) => p.alive).length;
const day = new DayShape(), trip = new TripShape(), oc = new OutdoorCompany();
const detach = trip.attach(w);
let allEqual = true;
for (let d = 1; d <= days; d++) {
  for (let n = 0; n < DAY; n++) { day.sampleTick(w); trip.sampleTick(w); oc.sampleTick(w); stepWorld(w); stepWorld(twin); }
  const eq = serializeWorld(w) === serializeWorld(twin);
  if (!eq) allEqual = false;
  console.log(`${label} day ${d} tick ${w.tick} living ${w.persons.filter((p) => p.alive).length} identical ${eq}`);
}
trip.finish(w);
detach();
const r: any = trip.report();
const dr: any = day.report();
const rows: any[] = trip.tripRows();
const missing = (r.sourceFacts.facts as any[]).filter((f) => !f.found).map((f) => f.id);
// does the allowance read at the end of the walk predict whether goods were then taken? actCycle is the activity's own count of units moved
// (act_resource.ts withdraw work(): a.cycle = moved). Measured withdraw walks that reached work and whose activity ended (actCycle known).
const taken = { allowedNoneAndTaken: 0, allowedNoneAndNothingTaken: 0, allowedSomeAndTaken: 0, allowedSomeAndNothingTaken: 0, noAllowanceReadOrActivityOpen: 0 };
for (const x of rows) {
  if (x.kind !== 'withdraw' || x.leftCensored || x.outcome === 'censored' || !x.storeAtEndOfWalk) continue;
  const al = x.storeAtEndOfWalk.allowedUnits;
  if (al === null || x.actCycle === null) { taken.noAllowanceReadOrActivityOpen++; continue; }
  if (al === 0) { if (x.actCycle > 0) taken.allowedNoneAndTaken++; else taken.allowedNoneAndNothingTaken++; }
  else if (x.actCycle > 0) taken.allowedSomeAndTaken++; else taken.allowedSomeAndNothingTaken++;
}
const checks = [...Object.values(r.selfChecks), ...Object.values(dr.selfChecks)];
const out = {
  label, loaded: load || null, rulesVersion: w.settings.rulesVersion ?? null, startTick, startPeople, days, identicalToUnwatchedTwinEveryDay: allEqual,
  selfChecksTripShape: r.selfChecks, selfChecksAllTrue: checks.every(Boolean), selfChecksCount: checks.length,
  walksAll: r.counts.walksAll, withdrawWalks: r.storeBeliefs.withdrawWalks, rowsWithStoreLook: rows.filter((x) => x.storeAtDeparture !== null).length,
  allowanceAtEndOfWalkAgainstGoodsTaken: taken,
  anchorsMissing: missing, storeBeliefs: r.storeBeliefs,
};
writeFileSync(`review_evidence/stage1c-20261118/store_beliefs_${label}.json`, JSON.stringify(out, null, 1));
const a = r.storeBeliefs.all;
console.log('TAKEN ' + JSON.stringify(taken));
console.log(`VERDICT ${label} rules ${out.rulesVersion} startPeople ${startPeople} days ${days} identical_every_day ${allEqual} self_checks_true ${out.selfChecksAllTrue} of ${checks.length} withdrawWalks ${out.withdrawWalks} measured ${r.storeBeliefs.measuredWithdrawWalksWithBothLooks} anchorsMissing ${missing.length}`);
console.log(JSON.stringify({ containerAtDeparture: a.containerAtDeparture, belief: { withABelief: a.belief.withABelief, withAnItemList: a.belief.withAnItemList, ageDays: a.belief.ageAtDepartureDays }, truth: a.truth, beliefAgainstTruth: a.beliefAgainstTruth }));
