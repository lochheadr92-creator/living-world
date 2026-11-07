// Stored preferences are checked field by field: a wrong kind of value is the default, never the page's start-up input (src/app/prefs.ts).
import { afterEach, expect, it, vi } from 'vitest';
import { Game } from '../src/app/game';
import { DEFAULT_PREFS, loadPrefs } from '../src/app/prefs';
import { currentWorldSettings } from '../src/sim/profiles';

const stored = (value: unknown) => vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(value), setItem: vi.fn() });

afterEach(() => {
  vi.unstubAllGlobals();
});

it('a null seed and other damaged fields fall back to the defaults, and the page can still build its world', () => {
  stored({ seed: null, harsh: 'yes', immigration: 0, speed: 'fast', debug: 1, overlays: { labels: 'on', paths: true }, viewer: 'x', hudFolded: null });
  const p = loadPrefs();
  expect(p.seed).toBe(DEFAULT_PREFS.seed);
  expect(p.harsh).toBe(false);
  expect(p.immigration).toBe(true);
  expect(p.speed).toBe(1);
  expect(p.debug).toBe(false);
  expect(p.overlays).toEqual({ ...DEFAULT_PREFS.overlays, paths: true });
  expect(p.hudFolded).toBe(false);
  // what main.ts does with them at start-up
  expect(() => new Game(currentWorldSettings(p.size, p.seed, { harsh: p.harsh, immigration: p.immigration }))).not.toThrow();
});

it('a speed the transport does not offer, an empty seed, or stored JSON that is not an object are the defaults', () => {
  stored({ seed: '   ', speed: 1e9 });
  expect(loadPrefs()).toMatchObject({ seed: DEFAULT_PREFS.seed, speed: 1 });
  stored({ speed: Number.NaN });
  expect(loadPrefs().speed).toBe(1);
  stored([1, 2, 3]);
  expect(loadPrefs()).toMatchObject({ seed: DEFAULT_PREFS.seed, size: 'normal', speed: 1 });
  stored('a string');
  expect(loadPrefs().seed).toBe(DEFAULT_PREFS.seed);
});

it('good stored values are kept as they were', () => {
  stored({ seed: 'fern-12', harsh: true, immigration: false, size: 'large', speed: 8, debug: true, overlays: { labels: true }, viewer: { textSize: 'large' }, inspectorOpen: false, feedOpen: false, hudFolded: true });
  expect(loadPrefs()).toEqual({
    seed: 'fern-12',
    harsh: true,
    immigration: false,
    size: 'large',
    speed: 8,
    debug: true,
    overlays: { ...DEFAULT_PREFS.overlays, labels: true },
    viewer: { speech: 'automatic', textSize: 'large', contrast: 'standard', reducedMotion: false },
    inspectorOpen: false,
    feedOpen: false,
    hudFolded: true,
  });
});
