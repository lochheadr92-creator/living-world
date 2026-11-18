// Read-only continuation probe. See review_evidence/withdraw-baseline-20261119/READING.md.
import { writeFileSync } from 'node:fs';
import { argsOf, worldFromArgs } from './world_args';
import { DAY } from '../src/sim/constants';
import { conservationReport, foodUnits } from '../src/sim/economy';
import { hashWorld, stepWorld } from '../src/sim/world';
import { DayShape } from './observers/day_shape';
import { TimeBudget } from './observers/time_budget';
import { TripShape } from './observers/trip_shape';
import { WithdrawCheck } from './observers/withdraw_check';

const { opt } = argsOf(process.argv);
const days = Number(opt('days', '13'));
const out = opt('out', '');
if (!out || !opt('load', '') || !Number.isInteger(days) || days < 1) throw new Error('Provide --load, --out and a positive integer --days');
const { w, loaded, startDay } = worldFromArgs(opt);
const nudge = Number(opt('nudge', '0'));
if (!Number.isInteger(nudge) || nudge < 0) throw new Error('Invalid nudge');
for (let i = 0; i < nudge; i++) w.rng.next();
const initialHash = hashWorld(w), initialDeaths = w.deceased.length;
const time = new TimeBudget(), day = new DayShape(), trip = new TripShape(), withdraw = new WithdrawCheck();
time.attach(w); trip.attach(w); withdraw.attach(w);
for (let i = 0; i < days * DAY; i++) {
  time.sampleTick(w); day.sampleTick(w); trip.sampleTick(w); withdraw.sampleTick(w);
  stepWorld(w);
}
trip.finish(w);
const rows = withdraw.rows();
const completedAdults = rows.filter(r => r.adult && r.firstPhase !== 'work');
const allAdults = rows.filter(r => r.adult);
const outcome = (rs: typeof rows) => ({ total: rs.length, tookNone: rs.filter(r => r.result === 'took_none_empty' || r.result === 'took_none_other').length, empty: rs.filter(r => r.result === 'took_none_empty').length, other: rs.filter(r => r.result === 'took_none_other').length, endedBeforeArrival: rs.filter(r => r.result === 'ended_before_arrival').length, tookSomeOrAll: rs.filter(r => r.result === 'took_some' || r.result === 'took_all').length });
const byWalk = { allFinishedAdults: outcome(allAdults), finishedAdultsWithWalking: outcome(allAdults.filter(r => r.travelTicks > 0)), finishedAdultsWithoutWalking: outcome(allAdults.filter(r => r.travelTicks === 0)), firstSeenInTravel: outcome(completedAdults) };
writeFileSync(out, JSON.stringify({ loaded, startDay, days, nudge, rulesVersion: w.settings.rulesVersion, arrivals: w.settings.immigration, initialHash, finalHash: hashWorld(w), deaths: w.deceased.length - initialDeaths, endAlive: w.persons.filter(p => p.alive).length, endStoreFood: w.buildings.reduce((n,b) => n + foodUnits(b.store.items), 0), conservation: conservationReport(w), time: time.report(), day: day.report(), trip: trip.report(), withdraw: withdraw.report(), byWalk, rows, trips: trip.tripRows() }));
