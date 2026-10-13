// The DOM / CSS interface that floats over the canvas. mountUI builds every panel once, wires them to the Game
// controller, and then only touches the DOM when something actually changed. Nothing in here mutates the world.
//
// Map of the modules (each exports one createX(ctx, slots) that returns a Part with update / onGame / dispose):
//   layout     click-through docks the panels live in        topbar     title, seed chip, clock and population
//   transport  play / step / speed / paused tag              worldmenu  seed, new world, scenes, save / load
//   inspector  right panel shell  (person.ts, entity.ts)     feed       happenings with category filters
//   overlays   bottom chip group                             minimap    isometric overview, click or drag to pan
//   debug      optional diagnostics                          help       controls and how to read the inspector
//   tooltip    data-tip labels + hover label over the map    toasts     short messages
//   shortcuts  keyboard                                      dom / icons / widgets / context   shared helpers
import type { Game, GameEvent } from '../app/game';
import { loadPrefs } from '../app/prefs';
import { loadUIState, makePersistence, type Part, type ToastKind, type UICtx } from './context';
import { buildLayout } from './layout';
import { createDebug } from './debug';
import { createFeed } from './feed';
import { createHelp } from './help';
import { createInspector } from './inspector';
import { createMinimap } from './minimap';
import { createOverlays } from './overlays';
import { createShortcuts } from './shortcuts';
import { createToasts } from './toasts';
import { createTopbar } from './topbar';
import { createHoverTip, createUITips } from './tooltip';
import { createTransport } from './transport';
import { createWorldMenu } from './worldmenu';
import { createInhabitPanel } from './inhabit';
import type { InhabitDriver } from '../app/inhabit';

export interface UIHandle {
  /** called every animation frame with real elapsed seconds; implementations throttle their own DOM work */
  update(dt: number): void;
  dispose(): void;
}

const reported = new Set<string>();

/**
 * The interface must never be able to stop the animation loop: an exception inside any one panel is logged once
 * and that panel simply skips the beat, while everything else (and the world) carries on.
 */
function guarded(name: string, part: Part): Part {
  const wrap = <A extends unknown[]>(where: string, fn: ((...args: A) => void) | undefined) =>
    fn &&
    ((...args: A) => {
      try {
        fn.apply(part, args);
      } catch (err) {
        const key = `${name}.${where}`;
        if (!reported.has(key)) {
          reported.add(key);
          console.error(`[ui] ${key} threw; the rest of the interface keeps running`, err);
        }
      }
    });
  return { update: wrap('update', part.update), onGame: wrap('onGame', part.onGame), dispose: wrap('dispose', part.dispose) };
}

export function mountUI(game: Game, root: HTMLElement, extras: { inhabit?: InhabitDriver } = {}): UIHandle {
  const prefs = loadPrefs();
  const state = loadUIState();
  const persist = makePersistence({ prefs, state });
  root.replaceChildren(); // a clean mount point, even if an earlier interface was left behind by hot reloading
  const { slots, els } = buildLayout(root);
  const parts: Part[] = [];

  const toasts = createToasts(slots);
  let helpRef: ReturnType<typeof createHelp> | null = null;

  const ctx: UICtx = {
    game,
    root,
    prefs,
    state,
    savePrefs: persist.savePrefs,
    saveState: persist.saveState,
    toast: (message: string, kind?: ToastKind, ms?: number) => toasts.toast(message, kind, ms),
    toggleHelp: () => helpRef?.toggle(),
  };

  const tips = createUITips(ctx);
  const hover = createHoverTip(ctx);
  const menu = createWorldMenu(ctx, slots);
  const help = createHelp(ctx);
  helpRef = help;
  const topbar = createTopbar(ctx, slots, menu);
  const transport = createTransport(ctx, slots);
  const debug = createDebug(ctx, slots); // above the feed
  const feed = createFeed(ctx, slots);
  const inspector = createInspector(ctx, slots); // above the minimap
  const minimap = createMinimap(ctx, slots);
  const overlays = createOverlays(ctx, slots);
  const shortcuts = createShortcuts(ctx, menu, help);
  const named: [string, Part][] = [
    ['toasts', toasts],
    ['tooltips', tips],
    ['hover', hover],
    ['worldmenu', menu],
    ['help', help],
    ['topbar', topbar],
    ['transport', transport],
    ['debug', debug],
    ['feed', feed],
    ['inspector', inspector],
    ['minimap', minimap],
    ['overlays', overlays],
    ['shortcuts', shortcuts],
  ];
  if (extras.inhabit) named.push(['inhabit', createInhabitPanel(ctx, slots, extras.inhabit)]);
  for (const [name, part] of named) parts.push(guarded(name, part));

  /** shared preferences follow the game; scenes and loads change the world, so the camera goes home too */
  const onGame = (e: GameEvent): void => {
    switch (e) {
      case 'speed':
        prefs.speed = game.speed;
        persist.savePrefs();
        break;
      case 'overlay':
        prefs.overlays = { ...game.overlays };
        persist.savePrefs();
        break;
      case 'debug':
        prefs.debug = game.debug;
        persist.savePrefs();
        break;
      case 'restart':
        prefs.seed = game.settings.seed;
        prefs.harsh = game.settings.harsh;
        prefs.immigration = game.settings.immigration;
        prefs.rich = game.settings.dynamics === 'rich';
        if (game.settings.scene === 'natural') prefs.size = game.settings.profile ?? 'normal';
        persist.savePrefs();
        game.flyTo(game.world.camp.x, game.world.camp.y, 1);
        break;
    }
    for (const p of parts) p.onGame?.(e);
  };
  const unsubscribe = game.subscribe(onGame);
  // a change made a split second before leaving the page should still be remembered
  window.addEventListener('pagehide', persist.flush);

  // a single friendly nudge the very first time
  let hintTimer: number | undefined;
  if (!state.hinted) {
    state.hinted = true;
    persist.saveState();
    hintTimer = window.setTimeout(() => toasts.toast('Tip: click anyone to see what they are thinking. Press ? for the controls.', 'info', 8000), 1800);
  }

  const handle: UIHandle = {
    update(dt: number): void {
      for (const p of parts) p.update?.(dt);
    },
    dispose(): void {
      unsubscribe();
      window.removeEventListener('pagehide', persist.flush);
      window.clearTimeout(hintTimer);
      persist.flush();
      for (const p of parts) p.dispose?.();
      for (const el of els) el.remove();
    },
  };
  // a handle for the automated browser checks, mirroring __game / __renderer
  (window as unknown as Record<string, unknown>).__ui = handle;
  return handle;
}
