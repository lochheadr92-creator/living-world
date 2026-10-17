import { afterEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/app/game';
import { inhabitConfigFromUrl, settingsFromConfig } from '../src/app/inhabit';
import { loadPrefs, savePrefs } from '../src/app/prefs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { deepEqualState, firstDiffs } from '../scripts/statediff';
import { legacySaveText } from './helpers/golden';
import { stepWorld } from '../src/sim/world';
import { currentWorldSettings } from '../src/sim/profiles';

afterEach(() => vi.unstubAllGlobals());

describe('one current simulation for new worlds', () => {
  it.each(['normal', 'town', 'large', 'huge'] as const)('uses current rules for a new %s world and clears old profile overrides', (profile) => {
    const settings = currentWorldSettings(profile, 'new-world', { harsh: true, immigration: false });
    expect(settings).toMatchObject({ seed: 'new-world', dynamics: 'rich', harsh: true, immigration: false, scene: 'natural' });
    expect(settings.profile).toBe(profile === 'normal' ? undefined : profile);
    if (profile === 'normal') {
      expect(settings).toHaveProperty('ruleSet', undefined);
      expect(settings).toHaveProperty('settlementFounders', undefined);
    }
  });
  it('starts the app with the integrated simulation and keeps it on restart', () => {
    const game = new Game({ seed: 'current-default' });
    expect(game.world.settings.dynamics).toBe('rich');
    game.restart({ seed: 'current-restart' });
    expect(game.world.settings.dynamics).toBe('rich');
  });

  it('retires the old mode preference without losing the other preferences', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ seed: 'fern', size: 'town', harsh: true, rich: false }),
      setItem,
    });
    const prefs = loadPrefs();
    expect(prefs).toMatchObject({ seed: 'fern', size: 'town', harsh: true });
    expect(prefs).not.toHaveProperty('rich');
    savePrefs(prefs);
    expect(JSON.parse(setItem.mock.calls[0][1])).not.toHaveProperty('rich');
  });

  it('uses current rules for inhabitant links unless legacy rules are explicitly requested', () => {
    const cfg = inhabitConfigFromUrl('?inhabit=&manual=1', { seed: 'meadow' })!;
    expect(settingsFromConfig(cfg).dynamics).toBe('rich');
    const legacy = inhabitConfigFromUrl('?inhabit=&manual=1&rich=0', { seed: 'meadow' })!;
    expect(settingsFromConfig(legacy).dynamics).toBe('authored');
  });
});

describe('saved worlds retain their recorded rules', () => {
  it.each([undefined, 'authored', 'rich'] as const)('loads %s without silently enabling or disabling systems', (dynamics) => {
    const settings = defaultSettings('saved-rules');
    if (dynamics !== undefined) settings.dynamics = dynamics;
    const original = createWorld(settings);
    for (let i = 0; i < 20; i++) stepWorld(original);
    const loaded = deserializeWorld(serializeWorld(original));
    const game = new Game({ seed: 'before-load' });
    game.restoreWorld(loaded, loaded.settings);
    expect(game.settings.dynamics).toBe(dynamics);
    expect(game.world.settings.dynamics).toBe(dynamics);
    for (let i = 0; i < 40; i++) {
      stepWorld(original);
      game.advanceTicks(1);
    }
    const before = JSON.parse(legacySaveText(original));
    const after = JSON.parse(legacySaveText(game.world));
    expect(deepEqualState(before, after), firstDiffs(before, after).join('\n')).toBe(true);
    game.restart(currentWorldSettings('normal', 'after-old-save'));
    expect(game.world.settings.dynamics).toBe('rich');
    expect(game.world.tick).toBe(0);
    expect(original.settings.dynamics).toBe(dynamics);
  });
});
