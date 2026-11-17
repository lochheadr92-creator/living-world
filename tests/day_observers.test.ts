// Contract tests for the three day observers landed in stage 1c of the plan of 17 November 2026
// (scripts/observers/day_shape.ts, trip_shape.ts, outdoor_company.ts). Each is read only: a world watched by all three must stay
// byte-identical to an unwatched twin, and each observer's own tallies must add up.
import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { DayShape } from '../scripts/observers/day_shape';
import { TripShape } from '../scripts/observers/trip_shape';
import { OutdoorCompany, DAY_PARTS } from '../scripts/observers/outdoor_company';

const world = (seed: string) => createWorld(currentWorldSettings('normal', seed, { immigration: false }));

it('leaves a watched world byte-identical to an unwatched twin, on three seeds', () => {
  for (const seed of ['river', 'aspen', 'birch']) {
    const w = world(seed);
    const twin = deserializeWorld(serializeWorld(w));
    const day = new DayShape(), trip = new TripShape(), oc = new OutdoorCompany();
    const detach = trip.attach(w);
    for (let n = 0; n < 360; n++) {
      day.sampleTick(w); trip.sampleTick(w); oc.sampleTick(w);
      stepWorld(w); stepWorld(twin);
    }
    trip.finish(w);
    detach();
    expect(serializeWorld(w), seed).toBe(serializeWorld(twin));
    expect(day.report().sampledTicks, seed).toBe(360);
  }
}, 120000);

it('DayShape and TripShape: every self check in their own reports holds after 600 ticks', () => {
  const w = world('river');
  const day = new DayShape(), trip = new TripShape();
  const detach = trip.attach(w);
  for (let n = 0; n < 600; n++) { day.sampleTick(w); trip.sampleTick(w); stepWorld(w); }
  trip.finish(w);
  detach();
  const d: any = day.report(), t: any = trip.report();
  for (const [k, v] of Object.entries(d.selfChecks)) expect(v, 'DayShape ' + k).toBe(true);
  for (const [k, v] of Object.entries(t.selfChecks)) expect(v, 'TripShape ' + k).toBe(true);
  expect(d.walking.travelTicks).toBe(t.counts.walkingTicksAll);
  expect(d.hungryTime.hungryWakingTicks).toBeLessThanOrEqual(d.hungryTime.wakingTicks);
  expect(t.counts.walksAll).toBeGreaterThan(0);
  expect(trip.tripRows().length).toBe(t.counts.walksAll);
}, 60000);

it('OutdoorCompany: the parts of the day add up and each count is inside the one before it', () => {
  const w = world('river');
  const oc = new OutdoorCompany();
  for (let n = 0; n < 600; n++) { oc.sampleTick(w); stepWorld(w); }
  const r: any = oc.report();
  expect(r.ticks).toBe(600);
  const all = r.counts.all;
  expect(DAY_PARTS.reduce((a, p) => a + r.counts[p].waking, 0)).toBe(all.waking);
  for (const key of [...DAY_PARTS, 'all'] as const) {
    const c = r.counts[key];
    expect(c.outdoors, key).toBeLessThanOrEqual(c.waking);
    expect(c.company, key).toBeLessThanOrEqual(c.outdoors);
    expect(c.companyVisible, key).toBeLessThanOrEqual(c.company);
    expect(c.hub, key).toBeLessThanOrEqual(c.company);
    expect(c.hubVisible, key).toBeLessThanOrEqual(c.hub);
  }
  expect(all.waking).toBeGreaterThan(0);
  expect(r.shares.all.company).toBeGreaterThanOrEqual(0);
  expect(r.shares.all.company).toBeLessThanOrEqual(1);
}, 60000);
