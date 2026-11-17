// Source anchor check for DayShape and TripShape (stage 1c, 18 November 2026). Run from the repo root. Prints every sourceFacts entry that
// was not found at this head, and the count found. Read only. No world is stepped.
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { DayShape } from '../../scripts/observers/day_shape';
import { TripShape } from '../../scripts/observers/trip_shape';

const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
const day = new DayShape(), trip = new TripShape();
const detach = trip.attach(w);
day.sampleTick(w); trip.sampleTick(w);
trip.finish(w);
detach();
const reports: Record<string, any> = { DayShape: day.report(), TripShape: trip.report() };
for (const [name, r] of Object.entries(reports)) {
  const facts: any[] = r.sourceFacts?.facts ?? [];
  const missing = facts.filter((f) => !f.found);
  console.log(`${name}: ${facts.length} facts, ${facts.length - missing.length} found, ${missing.length} not found`);
  for (const f of missing) console.log(`  MISSING ${f.id} in ${f.file}: ${f.note}`);
}
