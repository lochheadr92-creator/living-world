// Choosing the size of a world (the world menu's "World size"): what is handed to restart, what the menu says about each size, going
// from one size to another and back, test scenes after a larger world, and a stored size that cannot be trusted.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/app/game';
import { loadPrefs } from '../src/app/prefs';
import { layoutFor, profileFacts, restartSettings, settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { ORDINARY_RULES, rulesOf } from '../src/sim/rules';
import { settlementCount } from '../src/sim/settlements';

describe('what restart is given', () => {
  it('always names the three profile keys, so going back to the village clears what a larger world set', () => {
    const village = restartSettings('normal', 'x');
    for (const k of ['profile', 'ruleSet', 'settlementFounders'] as const) {
      expect(Object.prototype.hasOwnProperty.call(village, k), k).toBe(true);
      expect(village[k], k).toBeUndefined();
    }
    expect(village).toMatchObject({ seed: 'x', population: 28, scene: 'natural' });
    expect(restartSettings('huge', 'x')).toMatchObject({ profile: 'huge', ruleSet: 'scaled', population: 250, settlementFounders: 42, scene: 'natural' });
  });

  it('carries the harsh and arrivals switches', () => {
    expect(restartSettings('large', 'x', { harsh: true, immigration: false })).toMatchObject({ harsh: true, immigration: false });
  });
});

describe('what the menu says about each size', () => {
  it.each(['normal', 'large', 'huge'] as ProfileName[])('%s: the map, the people and the camps are what the generator makes', (p) => {
    const f = profileFacts(p);
    if (p === 'normal') {
      expect(layoutFor(settingsForProfile('normal', 'x'))).toBeNull();
      expect(f).toEqual({ W: 80, H: 80, founders: 28, camps: 1 });
      return;
    }
    const layout = layoutFor(settingsForProfile(p, 'x'))!;
    expect(f.W).toBe(layout.W);
    expect(f.H).toBe(layout.H);
    expect(f.camps).toBe(layout.hubs.length);
    expect(f.founders).toBe(layout.hubs.reduce((n, h) => n + h.founders, 0));
  });
});

describe('moving between sizes', () => {
  it('goes from the village to Large, to Huge, and back to the village, leaving nothing of the larger world behind', () => {
    const game = new Game(settingsForProfile('normal', 'sizes'));
    expect(game.world.W).toBe(80);

    game.restart(restartSettings('large', 'sizes'));
    expect(game.world.W).toBe(160);
    expect(settlementCount(game.world)).toBe(4);
    expect(game.world.persons.length).toBe(100);
    expect(rulesOf(game.world).facilityRadius).toBe(40);

    game.restart(restartSettings('huge', 'sizes'));
    expect(game.world.W).toBe(256);
    expect(settlementCount(game.world)).toBe(6);
    expect(game.world.persons.length).toBe(250);

    game.restart(restartSettings('normal', 'sizes'));
    expect(game.world.W).toBe(80);
    expect(game.world.persons.length).toBe(28);
    expect(game.world.extraSettlements).toBeUndefined();
    expect(game.settings.profile).toBeUndefined();
    expect(rulesOf(game.world)).toBe(ORDINARY_RULES);
  }, 120_000);

  it('a village started this way is the same village the ordinary settings make', () => {
    const a = new Game(settingsForProfile('normal', 'same'));
    const b = new Game(settingsForProfile('large', 'same'));
    b.restart(restartSettings('normal', 'same'));
    expect(b.stateHash).toBe(a.stateHash);
    for (let i = 0; i < 300; i++) {
      a.advance(0.1);
      b.advance(0.1);
    }
    expect(b.stateHash).toBe(a.stateHash);
  }, 120_000);

  it('a test scene started from a larger world is run by the ordinary rules, as it always was', () => {
    const game = new Game(settingsForProfile('large', 'scenes'));
    expect(rulesOf(game.world).facilityRadius).toBe(40);
    game.loadScene('contest');
    expect(game.world.W).toBe(80);
    expect(game.settings.scene).toBe('contest');
    expect(game.settings.ruleSet).toBeUndefined();
    expect(game.settings.profile).toBeUndefined();
    expect(rulesOf(game.world)).toBe(ORDINARY_RULES);
  }, 120_000);
});

describe('the stored size', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stored = (value: unknown) => vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(value), setItem: () => undefined });

  it('is kept when it is one we know', () => {
    stored({ size: 'huge' });
    expect(loadPrefs().size).toBe('huge');
    stored({ size: 'large' });
    expect(loadPrefs().size).toBe('large');
  });

  it('is the village when it is missing or not one we know', () => {
    stored({});
    expect(loadPrefs().size).toBe('normal');
    for (const bad of ['gigantic', 3, null, '__proto__']) {
      stored({ size: bad });
      expect(loadPrefs().size, String(bad)).toBe('normal');
    }
  });

  it('is the village when storage cannot be read at all', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
    expect(loadPrefs().size).toBe('normal');
  });
});
