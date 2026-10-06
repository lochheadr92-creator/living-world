import './styles.css';
import { Game } from './app/game';
import { loadPrefs } from './app/prefs';
import { project } from './render/iso';
import { Renderer } from './render/renderer';
import { mountUI } from './ui';

const prefs = loadPrefs();
const game = new Game({ seed: prefs.seed, harsh: prefs.harsh, immigration: prefs.immigration, daysPerYear: prefs.daysPerYear });
game.speed = prefs.speed;
Object.assign(game.overlays, prefs.overlays);
game.debug = prefs.debug;

// start looking at the camp
{
  const c = project(game.world.camp.x, game.world.camp.y);
  game.camera = { x: c.sx, y: c.sy + 20, zoom: 1 };
}

const canvas = document.getElementById('world') as HTMLCanvasElement;
const renderer = new Renderer(canvas, game);
const ui = mountUI(game, document.getElementById('ui') as HTMLElement);

// handles for debugging and the automated browser checks
(window as unknown as Record<string, unknown>).__game = game;
(window as unknown as Record<string, unknown>).__renderer = renderer;

let last = performance.now();
function loop(now: number): void {
  const raw = (now - last) / 1000;
  last = now;
  // the clock is told how long the frame really was, so it can tell a stall from a busy moment and count what it gives up;
  // animation, camera easing and the interface never take a leap longer than a quarter of a second
  game.advance(raw);
  const dt = Math.min(0.25, Math.max(0, raw));
  renderer.frame(dt);
  ui.update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
