// Rules version 9: the cold presses less hard. The warmth drive starts at 46 instead of 52, and a fire at close range
// warms like a hut wall (13 degrees at the peak) instead of half a lean-to (9). Both readings are taken per world: a
// version-8 world keeps the old pressure and the old fires (pinned by tests/v8_continuation.test.ts).
import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { drive, fireWarmth } from '../src/sim/needs';
import { createBuilding } from '../src/sim/buildings';

const world8 = createWorld({ ...currentWorldSettings('normal', 'warm-v8', { immigration: false }), rulesVersion: 8 });
const world9 = createWorld({ ...currentWorldSettings('normal', 'warm-v9', { immigration: false }), rulesVersion: 9 });

describe('warmth drive band (version 9)', () => {
  it('a warmth of 50 no longer presses on decisions in a version-9 world', () => {
    expect(drive(50, 'warmth', world9)).toBe(0);
    expect(drive(50, 'warmth', world8), 'in version 8, 50 is inside the 52->30 band').toBeGreaterThan(0);
  });

  it('the new band is 46 -> 26, and outside it the curve is the same', () => {
    expect(drive(46, 'warmth', world9)).toBe(0);
    expect(drive(45, 'warmth', world9), 'one point below 46 and the pressure starts').toBeGreaterThan(0);
    expect(drive(26, 'warmth', world9)).toBe(60);
    expect(drive(26, 'warmth', world8), 'the old band 52->30 still applies below its knee').toBeCloseTo(60 + (40 * 4) / 30, 6);
    expect(drive(0, 'warmth', world9)).toBe(100);
  });

  it('no other need takes a version-9 reading', () => {
    for (const key of ['hunger', 'thirst', 'energy', 'safety', 'social'] as const) {
      expect(drive(40, key, world9)).toBe(drive(40, key, world8));
    }
  });
});

describe('fire warmth (version 9)', () => {
  it('a fire at close range warms 13 degrees at the peak in a version-9 world, 9 in a version-8 world', () => {
    for (const w of [world8, world9]) {
      stepWorld(w);
      const f = createBuilding(w, 'fire', 60, 60, 0);
      f.fuel = 500;
      const at = fireWarmth(w, 60.5, 60.5);
      expect(at).toBeCloseTo(w.settings.rulesVersion === 9 ? 13 : 9, 5);
      const away = fireWarmth(w, 66, 60);
      expect(away).toBe(0);
    }
  });
});
