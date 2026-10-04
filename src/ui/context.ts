// Shared plumbing for the UI modules: the context object every part receives, the Part contract,
// and a tiny persisted store for UI-only state (which inspector sections are open, feed filter...).
import type { Game, GameEvent } from '../app/game';
import type { Prefs } from '../app/prefs';
import { savePrefs } from '../app/prefs';

export type ToastKind = 'info' | 'good' | 'warn' | 'error';

export interface UIState {
  /** inspector section id -> open */
  sections: Record<string, boolean>;
  /** the first-run hint has been shown */
  hinted: boolean;
  /** the minimap is unfolded */
  minimapOpen: boolean;
}

const KEY = 'living-world:ui:v1';

const DEFAULT_STATE: UIState = { sections: {}, hinted: false, minimapOpen: true };

export function loadUIState(): UIState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE, sections: {} };
    const p = JSON.parse(raw) as Partial<UIState>;
    return {
      sections: p.sections && typeof p.sections === 'object' ? { ...p.sections } : {},
      hinted: !!p.hinted,
      minimapOpen: p.minimapOpen !== false,
    };
  } catch {
    return { ...DEFAULT_STATE, sections: {} };
  }
}

export interface UICtx {
  game: Game;
  /** the #ui mount point */
  root: HTMLElement;
  prefs: Prefs;
  state: UIState;
  /** persist the shared preferences (debounced a little) */
  savePrefs(): void;
  /** persist UI-only state */
  saveState(): void;
  toast(message: string, kind?: ToastKind, ms?: number): void;
  toggleHelp(): void;
}

export interface Part {
  update?(dt: number): void;
  onGame?(e: GameEvent): void;
  dispose?(): void;
}

export function makePersistence(ctx: Pick<UICtx, 'prefs' | 'state'>): { savePrefs(): void; saveState(): void; flush(): void } {
  let pt: number | undefined;
  let st: number | undefined;
  const writePrefs = () => {
    pt = undefined;
    savePrefs(ctx.prefs);
  };
  const writeState = () => {
    st = undefined;
    try {
      localStorage.setItem(KEY, JSON.stringify(ctx.state));
    } catch {
      /* storage blocked: the UI just forgets its layout next time */
    }
  };
  return {
    savePrefs() {
      if (pt === undefined) pt = window.setTimeout(writePrefs, 200);
    },
    saveState() {
      if (st === undefined) st = window.setTimeout(writeState, 200);
    },
    flush() {
      if (pt !== undefined) {
        window.clearTimeout(pt);
        writePrefs();
      }
      if (st !== undefined) {
        window.clearTimeout(st);
        writeState();
      }
    },
  };
}
