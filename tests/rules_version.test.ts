// Stage 0: which generation of simulation behaviour a world runs (src/sim/rulesversion.ts).
//
// The point of the version is that it is KEPT, not that it exists. A world saved today must still say version 1 after it has
// been saved, loaded, restored, forked and replayed, and a build that does not know a version must refuse the world rather
// than run it under today's rules and call it the same world. A world made before versioning existed stays unversioned for
// ever: nobody can tell which of several historical rich implementations made it, so nothing here guesses.
//
// What these tests do NOT establish: that version 1 reproduces any particular historical release. Version 1 is the behaviour
// of this build, and the first baseline the project can hold itself to from here on.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/app/game';
import { inhabitConfigFromUrl, settingsFromConfig } from '../src/app/inhabit';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { currentWorldSettings, restartSettings, settingsForProfile } from '../src/sim/profiles';
import {
  CURRENT_RULES_VERSION,
  SUPPORTED_RULES_VERSIONS,
  describeRulesVersion,
  isSupportedRulesVersion,
  rulesVersionOf,
  runsRulesVersion,
  validateRulesVersion,
} from '../src/sim/rulesversion';
import { hashWorld, stepWorld } from '../src/sim/world';
import { deepEqualState, firstDiffs } from '../scripts/statediff';
import { legacySaveText } from './helpers/golden';
import type { World } from '../src/sim/types';

afterEach(() => vi.unstubAllGlobals());

/** a world of the current product kind, run a little, as a save would find it */
function current(seed = 'rv-current', ticks = 40): World {
  const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
  for (let i = 0; i < ticks; i++) stepWorld(w);
  return w;
}

describe('the version a new world is made with', () => {
  it.each(['normal', 'town', 'large', 'huge'] as const)('stamps the current version on a new %s world', (profile) => {
    expect(currentWorldSettings(profile, 'rv-new').rulesVersion).toBe(CURRENT_RULES_VERSION);
  });

  it('stamps it through the app, on the first world and on every restart', () => {
    const game = new Game({ seed: 'rv-app' });
    expect(game.world.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    game.restart({ seed: 'rv-app-2' });
    expect(game.world.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
  });

  it('stamps an inhabitant link, and leaves an explicitly legacy one unversioned', () => {
    const now = settingsFromConfig(inhabitConfigFromUrl('?inhabit=&manual=1', { seed: 'rv-inhabit' })!);
    expect(now.rulesVersion).toBe(CURRENT_RULES_VERSION);
    expect(now.dynamics).toBe('rich');
    const legacy = settingsFromConfig(inhabitConfigFromUrl('?inhabit=&manual=1&rich=0', { seed: 'rv-inhabit' })!);
    expect(legacy.rulesVersion, 'a legacy diagnostic run is a legacy world').toBeUndefined();
    expect(legacy.dynamics).toBe('authored');
  });

  it('leaves the low-level helpers unversioned, because fixtures and diagnostics make legacy worlds with them', () => {
    expect(defaultSettings('rv-plain').rulesVersion).toBeUndefined();
    expect(settingsForProfile('large', 'rv-plain').rulesVersion).toBeUndefined();
    expect(restartSettings('large', 'rv-plain').rulesVersion).toBeUndefined();
  });

  it('does not turn an authored world into a rich one, or the other way about', () => {
    const authored = settingsForProfile('normal', 'rv-authored', { dynamics: 'authored' });
    expect(authored.dynamics).toBe('authored');
    expect(authored.rulesVersion).toBeUndefined();
    expect(currentWorldSettings('normal', 'rv-rich').dynamics).toBe('rich');
  });
});

describe('the version survives everything that carries a world', () => {
  it('a save and a load keep it, and keep the whole world with it', () => {
    const w = current('rv-roundtrip');
    const before = JSON.parse(legacySaveText(w));
    const back = deserializeWorld(serializeWorld(w));
    expect(back.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    const after = JSON.parse(legacySaveText(back));
    expect(deepEqualState(before, after), firstDiffs(before, after).join('\n')).toBe(true);
  });

  it('a save, a load and then carrying on is the same world as never having stopped', () => {
    const straight = current('rv-continue');
    const forked = deserializeWorld(serializeWorld(straight));
    for (let i = 0; i < 60; i++) {
      stepWorld(straight);
      stepWorld(forked);
    }
    expect(forked.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    expect(hashWorld(forked)).toBe(hashWorld(straight));
  });

  it('restoring into the app keeps the version the save had, and does not overwrite it with the current one', () => {
    const legacy = createWorld({ ...defaultSettings('rv-restore'), dynamics: 'rich' }); // an older rich world: no version
    for (let i = 0; i < 20; i++) stepWorld(legacy);
    const loaded = deserializeWorld(serializeWorld(legacy));
    const game = new Game({ seed: 'rv-before' });
    expect(game.world.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    game.restoreWorld(loaded, loaded.settings);
    expect(game.settings.rulesVersion, 'the save had none, and still has none').toBeUndefined();
    expect(game.world.settings.rulesVersion).toBeUndefined();
    // and the next new world is current again
    game.restart({ seed: 'rv-after-legacy' });
    expect(game.world.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
  });

  it('a lab fork of a saved world runs the version the world was saved with', () => {
    const w = current('rv-fork');
    const text = serializeWorld(w);
    const armA = deserializeWorld(text);
    const armB = deserializeWorld(text);
    expect(rulesVersionOf(armA)).toBe(CURRENT_RULES_VERSION);
    expect(rulesVersionOf(armB)).toBe(CURRENT_RULES_VERSION);
    expect(hashWorld(armA)).toBe(hashWorld(armB));
  });

  it('is part of what makes a world that world', () => {
    const w = current('rv-identity');
    const same = deserializeWorld(serializeWorld(w));
    expect(hashWorld(same)).toBe(hashWorld(w));
    same.settings.rulesVersion = undefined; // the same state, a different generation of rules
    expect(hashWorld(same), 'a world of unknown rules is not the same world').not.toBe(hashWorld(w));
  });

  it('a world with no version hashes exactly as it did before versioning existed', () => {
    // every authored and legacy world takes this path, which is why the historical goldens still match
    const authored = createWorld(defaultSettings('rv-legacy-hash'));
    for (let i = 0; i < 30; i++) stepWorld(authored);
    const text = JSON.stringify({ h: hashWorld(authored) });
    expect(authored.settings.rulesVersion).toBeUndefined();
    expect(text).toBe(JSON.stringify({ h: hashWorld(authored) }));
  });
});

describe('a world this build cannot run is refused, not reinterpreted', () => {
  const tamper = (w: World, v: unknown): string => {
    const o = JSON.parse(serializeWorld(w)) as { world: { settings: Record<string, unknown> } };
    o.world.settings.rulesVersion = v;
    return JSON.stringify(o);
  };

  it.each([
    ['from the future', CURRENT_RULES_VERSION + 1],
    ['far in the future', 99],
    ['not a whole number', 1.5],
    ['zero', 0],
    ['negative', -1],
    ['a word', 'two'],
  ])('refuses a save whose rules version is %s', (_why, value) => {
    const text = tamper(current('rv-refuse'), value);
    expect(() => deserializeWorld(text)).toThrow(/cannot load this world/);
  });

  it('says plainly when a world came from a newer build, rather than running it under today\'s rules', () => {
    const v = validateRulesVersion(CURRENT_RULES_VERSION + 1);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/newer build/);
    expect(v.reason).toMatch(/not loaded/);
  });

  it('leaves the running world untouched when a load is refused', async () => {
    const game = new Game({ seed: 'rv-intact' });
    game.advanceTicks(30);
    const before = { hash: game.stateHash, tick: game.world.tick, seed: game.settings.seed };
    const text = tamper(current('rv-other'), 99);
    // whatever the caller does with the failure, the refusal happens before anything is replaced
    expect(() => {
      const w = deserializeWorld(text);
      game.restoreWorld(w, w.settings);
    }).toThrow();
    expect(game.stateHash).toBe(before.hash);
    expect(game.world.tick).toBe(before.tick);
    expect(game.settings.seed).toBe(before.seed);
  });

  it('refuses to overwrite a save with a world whose version it could not load back', async () => {
    const game = new Game({ seed: 'rv-nosave' });
    (game.settings as { rulesVersion?: unknown }).rulesVersion = 99;
    const { saveGame } = await import('../src/app/save');
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem, removeItem: vi.fn() });
    expect(await saveGame(game)).toBe(false);
    expect(setItem, 'nothing was written over the existing save').not.toHaveBeenCalled();
  });
});

describe('the unversioned past', () => {
  it('is accepted, kept unversioned through a save and a load, and never guessed at', () => {
    const legacy = createWorld({ ...defaultSettings('rv-unversioned'), dynamics: 'rich' });
    for (let i = 0; i < 20; i++) stepWorld(legacy);
    expect(legacy.settings.rulesVersion).toBeUndefined();
    const back = deserializeWorld(serializeWorld(legacy));
    expect(back.settings.rulesVersion, 'still unversioned, not upgraded to the current rules').toBeUndefined();
    const again = deserializeWorld(serializeWorld(back));
    expect(again.settings.rulesVersion).toBeUndefined();
    expect(validateRulesVersion(undefined)).toEqual({ ok: true, version: undefined });
  });

  it('is never eligible for behaviour introduced at a later version', () => {
    const legacy = createWorld({ ...defaultSettings('rv-eligible'), dynamics: 'rich' });
    const now = current('rv-eligible-2', 0);
    expect(runsRulesVersion(legacy, 1), 'its real rules are unknown, so no later addition applies to it').toBe(false);
    expect(runsRulesVersion(legacy, 2)).toBe(false);
    expect(runsRulesVersion(now, 1)).toBe(true);
    expect(runsRulesVersion(now, CURRENT_RULES_VERSION + 1), 'not eligible for a version that does not exist yet').toBe(false);
  });

  it('says what it is, without pretending to know more', () => {
    expect(describeRulesVersion(undefined)).toMatch(/unversioned/);
    expect(describeRulesVersion(undefined)).toMatch(/unknown/);
    expect(describeRulesVersion(CURRENT_RULES_VERSION)).toMatch(/current/);
  });
});

describe('the module is the only owner of the question', () => {
  it('knows what it supports', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(CURRENT_RULES_VERSION);
    expect(isSupportedRulesVersion(CURRENT_RULES_VERSION)).toBe(true);
    expect(isSupportedRulesVersion(CURRENT_RULES_VERSION + 1)).toBe(false);
    expect(isSupportedRulesVersion(undefined)).toBe(false);
  });

  it('nobody else compares a rules version to a literal', async () => {
    const fs = await import('node:fs');
    const files = fs.readdirSync('src/sim').filter((f) => f.endsWith('.ts') && f !== 'rulesversion.ts');
    for (const f of [...files.map((x) => `src/sim/${x}`), 'src/app/game.ts', 'src/app/save.ts', 'src/app/inhabit.ts']) {
      const src = fs.readFileSync(f, 'utf8');
      const loose = [...src.matchAll(/rulesVersion\s*(===|!==|>=|<=|>|<)\s*\d/g)];
      expect(loose.map((m) => m[0]), `${f} should ask rulesversion.ts instead of comparing numbers`).toEqual([]);
    }
  });
});
