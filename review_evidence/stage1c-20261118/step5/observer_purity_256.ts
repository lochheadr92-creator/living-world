// Observer purity at rules 256 (stage 1c step 5 gate). The same check as ../observer_purity_long.ts, with the immigration switch taken from the
// environment, so that the keyed arrivals are inside the check. Read only. Run from the repo root:
//   SEED=river DAYS=10 IMMIGRATION=1 npx vite-node review_evidence/stage1c-20261118/step5/observer_purity_256.ts
import { createWorld } from '../../../src/sim/factory';
import { currentWorldSettings } from '../../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../../src/app/save';
import { stepWorld } from '../../../src/sim/world';
import { DAY } from '../../../src/sim/constants';
import { DayShape } from '../../../scripts/observers/day_shape';
import { TripShape } from '../../../scripts/observers/trip_shape';
import { OutdoorCompany } from '../../../scripts/observers/outdoor_company';

const seed = process.env.SEED ?? 'river';
const days = Number(process.env.DAYS ?? '10');
const immigration = process.env.IMMIGRATION === '1';
const w = createWorld(currentWorldSettings('normal', seed, { immigration }));
const twin = deserializeWorld(serializeWorld(w));
const day = new DayShape(), trip = new TripShape(), oc = new OutdoorCompany();
const detach = trip.attach(w);
let allEqual = true;
const started = Date.now();
console.log(`rules ${w.settings.rulesVersion} seed ${seed} immigration ${immigration}`);
for (let d = 1; d <= days; d++) {
  for (let n = 0; n < DAY; n++) {
    day.sampleTick(w); trip.sampleTick(w); oc.sampleTick(w);
    stepWorld(w); stepWorld(twin);
  }
  const equal = serializeWorld(w) === serializeWorld(twin);
  if (!equal) allEqual = false;
  console.log(`seed ${seed} day ${d} tick ${w.tick} living ${w.persons.filter((p) => p.alive).length} identical ${equal} seconds ${Math.round((Date.now() - started) / 1000)}`);
}
trip.finish(w);
detach();
const dr: any = day.report(), tr: any = trip.report();
const checks = [...Object.values(dr.selfChecks), ...Object.values(tr.selfChecks)];
console.log(`VERDICT rules ${w.settings.rulesVersion} seed ${seed} immigration ${immigration} days ${days} identical_every_day ${allEqual} self_checks_true ${checks.every(Boolean)} of ${checks.length}`);
