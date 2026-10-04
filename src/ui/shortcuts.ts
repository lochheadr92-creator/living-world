// Keyboard shortcuts. Camera keys (WASD, arrows, + -, Home, C) belong to the canvas input and are not handled here.
//
// Note: the canvas input already uses plain D to pan right, so the debug panel lives on Shift+D. The Shift+D
// keydown is swallowed in the capture phase so the camera does not also drift while the key is down.
import { SPEEDS } from '../app/game';
import { isTypingTarget } from './dom';
import type { HelpPart } from './help';
import type { Part, UICtx } from './context';
import type { WorldMenu } from './worldmenu';

export function createShortcuts(ctx: UICtx, menu: WorldMenu, help: HelpPart): Part {
  const { game } = ctx;

  const escape = (): boolean => {
    if (help.close()) return true;
    if (menu.close()) return true;
    if (game.selectedId) {
      game.select(0);
      return true;
    }
    return false;
  };

  // Shift+D first, before the canvas input sees it
  const captureKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !e.shiftKey) return;
    // (with Caps Lock on, Shift+D reports a lower-case 'd')
    if ((e.key !== 'D' && e.key !== 'd') || isTypingTarget(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
    if (!e.repeat) game.setDebug(!game.debug);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const typing = isTypingTarget(e.target);
    if (e.key === 'Escape') {
      if (escape()) {
        e.preventDefault();
        return;
      }
      if (typing) (e.target as HTMLElement).blur();
      return;
    }
    if (typing) return;
    if (e.repeat && e.key !== '[' && e.key !== ']') return;
    // a focused button handles Space / Enter itself
    const onControl = !!(e.target as HTMLElement | null)?.closest?.('button, a[href], [role="switch"], summary');
    const k = e.key;
    switch (k) {
      case ' ':
        if (onControl) return;
        game.togglePlay();
        break;
      case '.':
        game.stepOnce();
        break;
      case '[':
        game.speedUp(-1);
        break;
      case ']':
        game.speedUp(1);
        break;
      case 'f':
      case 'F': {
        const sel = game.world.byId.get(game.selectedId);
        if (sel && sel.ent === 'person') game.setFollow(!game.following);
        break;
      }
      case '?':
      case 'h':
      case 'H':
        help.toggle();
        break;
      default:
        if (k.length === 1 && k >= '1' && k <= '6') {
          game.setSpeed(SPEEDS[Number(k) - 1]);
          break;
        }
        return;
    }
    e.preventDefault();
  };

  // after a mouse click a button keeps focus, which would make Space press it again instead of pausing
  const blurAfterClick = (e: MouseEvent) => {
    if (e.detail === 0) return; // keyboard activation keeps its focus
    const b = (e.target as HTMLElement | null)?.closest?.('button');
    if (b) window.setTimeout(() => b.blur(), 0);
  };

  window.addEventListener('keydown', captureKey, true);
  window.addEventListener('keydown', onKey);
  ctx.root.addEventListener('click', blurAfterClick);

  return {
    dispose() {
      window.removeEventListener('keydown', captureKey, true);
      window.removeEventListener('keydown', onKey);
      ctx.root.removeEventListener('click', blurAfterClick);
    },
  };
}
