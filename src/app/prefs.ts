// Small persisted preferences (localStorage). Every access is guarded: storage can be missing or blocked.
import type { Overlays } from './game';

export interface Prefs {
  seed: string;
  harsh: boolean;
  immigration: boolean;
  /** life pace: days of play per year of life, for the next new world */
  daysPerYear: number;
  speed: number;
  overlays: Overlays;
  debug: boolean;
  inspectorOpen: boolean;
  feedOpen: boolean;
}

const KEY = 'living-world:prefs:v1';

export const DEFAULT_PREFS: Prefs = {
  seed: 'meadow',
  harsh: false,
  immigration: true,
  daysPerYear: 12,
  speed: 1,
  overlays: { perception: false, paths: false, intentions: false, knowledge: false, labels: false },
  debug: false,
  inspectorOpen: true,
  feedOpen: true,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS, overlays: { ...DEFAULT_PREFS.overlays } };
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      ...DEFAULT_PREFS,
      ...p,
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
