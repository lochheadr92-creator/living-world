// Small persisted preferences (localStorage). Every access is guarded: storage can be missing or blocked.
import type { ProfileName } from '../sim/profiles';
import type { Overlays } from './game';
import { viewerPreferences, type ViewerPreferences } from './viewer';

export interface Prefs {
  seed: string;
  harsh: boolean;
  immigration: boolean;
  /** the size of world last started: 'normal' (the village), 'large', 'huge' or 'town' */
  size: ProfileName;
  speed: number;
  overlays: Overlays;
  viewer: ViewerPreferences;
  debug: boolean;
  inspectorOpen: boolean;
  feedOpen: boolean;
  /** the top bar is folded into one thin strip (seed, play/pause, clock, head-count) */
  hudFolded: boolean;
}

const KEY = 'living-world:prefs:v1';

export const DEFAULT_PREFS: Prefs = {
  seed: 'meadow',
  harsh: false,
  immigration: true,
  size: 'normal',
  speed: 1,
  overlays: { perception: false, paths: false, intentions: false, knowledge: false, labels: false },
  viewer: viewerPreferences(),
  debug: false,
  inspectorOpen: true,
  feedOpen: true,
  hudFolded: false,
};

/** the speeds the transport offers (game.ts SPEEDS; not imported, so this module stays free of the simulation) */
const SPEEDS: readonly number[] = [0.5, 1, 2, 4, 8, 16];

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS, overlays: { ...DEFAULT_PREFS.overlays }, viewer: viewerPreferences() };
    // Only known fields are copied, so the retired mode preference (`rich`) cannot keep an existing installation on the old simulation.
    // Every field is checked: a stored value of the wrong kind (an old, edited or damaged copy) is the default, never the page's start-up
    // input as it stands (a null seed left the page blank).
    const parsed: unknown = JSON.parse(raw);
    const p = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    const overlays = (p.overlays && typeof p.overlays === 'object' ? p.overlays : {}) as Record<string, unknown>;
    const d = DEFAULT_PREFS;
    return {
      seed: typeof p.seed === 'string' && p.seed.trim() !== '' && p.seed.length <= 200 ? p.seed : d.seed,
      harsh: bool(p.harsh, d.harsh),
      immigration: bool(p.immigration, d.immigration),
      // a stored size that is not one we know (an old or edited value) is the village
      size: p.size === 'large' || p.size === 'huge' || p.size === 'town' ? p.size : 'normal',
      speed: typeof p.speed === 'number' && SPEEDS.includes(p.speed) ? p.speed : d.speed,
      overlays: {
        perception: bool(overlays.perception, d.overlays.perception),
        paths: bool(overlays.paths, d.overlays.paths),
        intentions: bool(overlays.intentions, d.overlays.intentions),
        knowledge: bool(overlays.knowledge, d.overlays.knowledge),
        labels: bool(overlays.labels, d.overlays.labels),
      },
      viewer: viewerPreferences(p.viewer as Partial<ViewerPreferences> | undefined),
      debug: bool(p.debug, d.debug),
      inspectorOpen: bool(p.inspectorOpen, d.inspectorOpen),
      feedOpen: bool(p.feedOpen, d.feedOpen),
      hudFolded: bool(p.hudFolded, d.hudFolded),
    };
  } catch {
    return { ...DEFAULT_PREFS, overlays: { ...DEFAULT_PREFS.overlays }, viewer: viewerPreferences() };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: preferences simply will not persist */
  }
}
