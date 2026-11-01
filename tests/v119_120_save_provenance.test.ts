import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { RULES_119_GENERATION, RULES_120_GENERATION } from '../src/sim/rulesversion';

const world = (rulesVersion: number) => createWorld({ ...currentWorldSettings('normal', 'provenance-119', { immigration: false }), rulesVersion });

it('marks integrated rules 119 and 120 and roundtrips them', () => {
  for (const [version, marker] of [[119, RULES_119_GENERATION], [120, RULES_120_GENERATION]] as const) {
    const saved = serializeWorld(world(version));
    expect(JSON.parse(saved).rulesGeneration).toBe(marker);
    const restored = deserializeWorld(saved);
    expect(serializeWorld(restored)).toBe(saved);
    expect(restored.settings.rulesVersion).toBe(version);
  }
});

it('rejects unmarked and foreign 119/120 saves without modifying the input or live world', () => {
  const live = world(121);
  const before = serializeWorld(live);
  for (const version of [119, 120]) {
    const envelope = JSON.parse(serializeWorld(world(version)));
    for (const marker of [undefined, 'talia-childhood-119', RULES_119_GENERATION === envelope.rulesGeneration ? RULES_120_GENERATION : RULES_119_GENERATION]) {
      envelope.rulesGeneration = marker;
      const original = JSON.stringify(envelope);
      expect(() => deserializeWorld(original)).toThrow(new RegExp(`Ambiguous rules version ${version}`));
      expect(JSON.stringify(envelope)).toBe(original);
      expect(serializeWorld(live)).toBe(before);
    }
  }
});

it('keeps Stage 3 rules 117 and 118 and current 121 unmarked', () => {
  for (const version of [117, 118, 121]) {
    const saved = serializeWorld(world(version));
    expect(JSON.parse(saved).rulesGeneration).toBeUndefined();
    expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
  }
});
