import { expect, it } from 'vitest';
import { sourceJourney, walkFor } from './helpers/kept_target';
import { KeptTargetTrace } from '../scripts/observers/kept_target';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';

it('observes a restored option and its actual ending without changing saved state or continuation', () => {
  const f = sourceJourney(); walkFor(f.w, f.p, f.key);
  const before = serializeWorld(f.w), twin = deserializeWorld(before), observer = new KeptTargetTrace(), detach = observer.attach(f.w);
  try {
    observer.sample(f.w); expect(serializeWorld(f.w)).toBe(before);
    expect(observer.counts.restoredSamples).toBe(1);
    for (let n = 0; n < 1200; n++) { if (n % 120 === 0) observer.sample(f.w); stepWorld(f.w); stepWorld(twin); }
    expect(observer.events.length).toBeGreaterThan(0);
    expect(serializeWorld(f.w)).toBe(serializeWorld(twin));
  } finally { detach(); }
});
