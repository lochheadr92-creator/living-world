import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { RULES_29_GENERATION } from '../src/sim/rulesversion';
import { personalWorkTaste } from '../src/sim/temperament';

it('marks main rules 29 and roundtrips without enabling work tastes', () => {
  const world = createWorld({ ...currentWorldSettings('normal', 'provenance-29', { immigration: false }), rulesVersion: 29 });
  const saved = serializeWorld(world);
  expect(JSON.parse(saved).rulesGeneration).toBe(RULES_29_GENERATION);
  const restored = deserializeWorld(saved);
  expect(serializeWorld(restored)).toBe(saved);
  expect(restored.settings.rulesVersion).toBe(29);
  expect(personalWorkTaste(restored, restored.persons[0])).toBeNull();
});

it('rejects ambiguous and foreign rules 29 without modifying the input or live world', () => {
  const live = createWorld(currentWorldSettings('normal', 'provenance-29', { immigration: false }));
  const before = serializeWorld(live);
  const envelope = JSON.parse(serializeWorld(createWorld({ ...currentWorldSettings('normal', 'provenance-29', { immigration: false }), rulesVersion: 29 })));
  for (const marker of [undefined, 'unmerged-work-tastes-29']) {
    envelope.rulesGeneration = marker;
    const original = JSON.stringify(envelope);
    expect(() => deserializeWorld(original)).toThrow(/Ambiguous rules version 29/);
    expect(JSON.stringify(envelope)).toBe(original);
    expect(serializeWorld(live)).toBe(before);
  }
});

it('keeps rules 30 unmarked and enables tastes only in the integrated version', () => {
  for (const version of [30, 31]) {
    const world = createWorld({ ...currentWorldSettings('normal', 'provenance-29', { immigration: false }), rulesVersion: version });
    const saved = serializeWorld(world);
    expect(JSON.parse(saved).rulesGeneration).toBeUndefined();
    const restored = deserializeWorld(saved);
    expect(serializeWorld(restored)).toBe(saved);
    expect(personalWorkTaste(restored, restored.persons[0]) !== null).toBe(version === 31);
  }
});
