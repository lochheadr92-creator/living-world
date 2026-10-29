// The shared test helper (tests/helpers/util.ts) builds worlds on the CURRENT rules, so the mechanics that only run on rich dynamics
// or at a rules version are on in the tests that use it. Going back to the legacy world is an explicit, greppable choice
// (LEGACY_WORLD). These pin that default so it cannot be quietly reverted.
import { describe, expect, it } from 'vitest';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { hasTownships } from '../src/sim/townships';
import { LEGACY_WORLD, flatWorld, natural, scene, settingsFor } from './helpers/util';

describe('the shared test helper', () => {
  it('builds a world on the current rules: rich dynamics at the current rules version', () => {
    for (const w of [natural('helper-default'), scene('contest')]) {
      expect(w.settings.dynamics).toBe('rich');
      expect(w.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    }
  });

  it('keeps exactly what a test pins: dynamics or a rules version given means no default is added', () => {
    expect(settingsFor('pinned', { dynamics: 'rich' }).rulesVersion).toBeUndefined();
    expect(settingsFor('pinned', { rulesVersion: 9 }).dynamics).toBeUndefined();
    expect(settingsFor('pinned', { dynamics: 'rich', rulesVersion: 12 })).toMatchObject({ dynamics: 'rich', rulesVersion: 12 });
  });

  it('LEGACY_WORLD is the unversioned authored world, with the mechanics that need rich dynamics off', () => {
    const w = natural('helper-legacy', LEGACY_WORLD);
    expect(w.settings.dynamics).toBe('authored');
    expect(w.settings.rulesVersion).toBeUndefined();
  });

  it('a staged flat world on township rules has its township from the start, without taking an entity id', () => {
    const current = flatWorld(settingsFor('helper-flat'));
    const legacy = flatWorld(settingsFor('helper-flat', LEGACY_WORLD));
    expect(hasTownships(current)).toBe(true);
    expect(current.townships).toHaveLength(1);
    expect(current.nextId).toBe(legacy.nextId);
  });
});
