// Small persisted preferences (localStorage). Every access is guarded: storage can be missing or blocked.
import type { ProfileName } from '../sim/profiles';
import type { Overlays } from './game';

export interface Prefs {
  seed: string;
  harsh: boolean;
  immigration: boolean;
  /** the size of world last started: 'normal' (the village), 'large', 'huge' or 'town' */
  size: ProfileName;
  speed: number;
  overlays: Overlays;
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
  debug: false,
  inspectorOpen: true,
  feedOpen: true,
  hudFolded: false,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS, overlays: { ...DEFAULT_PREFS.overlays } };
    // The retired mode preference must not keep an existing installation on the old simulation.
    const { rich: _retiredMode, ...p } = JSON.parse(raw) as Partial<Prefs> & { rich?: boolean };
    return {
      ...DEFAULT_PREFS,
      ...p,
      // a stored size that is not one we know (an old or edited value) is the village
      size: p.size === 'large' || p.size === 'huge' || p.size === 'town' ? p.size : 'normal',
      overlays: { ...DEFAULT_PREFS.overlays, ...(p.overlays ?? {}) },
    };
  } catch {
    return { ...DEFAULT_PREFS, overlays: { ...DEFAULT_PREFS.overlays } };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: preferences simply will not persist */
  }
}
