import { afterEach, expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { setGatherReview } from '../src/sim/gather_review';

afterEach(() => setGatherReview(true));

it.each([[266,true,false],[267,false,false],[267,true,true]] as const)(
  'Forest stocking trip under rules %i, purpose review %s', (version, enabled, keepsTrip) => {
    setGatherReview(enabled);
    const w = createWorld({...currentWorldSettings('normal','forest',{immigration:false}),rulesVersion:version});
    while (w.tick < 221) stepWorld(w);
    const hal = w.persons.find(p => p.name === 'Hal')!;
    const departing = hal.activity!;
    expect(departing.kind).toBe('gather');
    expect(departing.data.purpose).toBe('stock');
    stepWorld(w);
    expect(hal.activity?.id === departing.id).toBe(keepsTrip);
  },
);
