import './styles.css';
import { Autosaver } from './app/autosave';
import { startFrameLoop } from './app/frameloop';
import { Game } from './app/game';
import { autosaveGame } from './app/save';
import { InhabitDriver, inhabitConfigFromUrl, settingsFromConfig } from './app/inhabit';
import { loadPrefs } from './app/prefs';
import { project } from './render/iso';
import { currentWorldSettings } from './sim/profiles';
import { Renderer } from './render/renderer';
import { mountUI } from './ui';

const prefs = loadPrefs();
// ?inhabit=<name>&... hands one person to an outside model (src/app/inhabit.ts); the world is then the one the query asks for
const inhabit = inhabitConfigFromUrl(location.search, prefs);
const game = new Game(inhabit ? settingsFromConfig(inhabit) : currentWorldSettings(prefs.size, prefs.seed, { harsh: prefs.harsh, immigration: prefs.immigration }));
game.speed = prefs.speed;
const driver = inhabit ? new InhabitDriver(game, inhabit) : null;
Object.assign(game.overlays, prefs.overlays);
game.viewer = { ...prefs.viewer };
game.debug = prefs.debug;

// start looking at the camp
{
  const c = project(game.world.camp.x, game.world.camp.y);
  game.camera = { x: c.sx, y: c.sy + 20, zoom: 1 };
}

const canvas = document.getElementById('world') as HTMLCanvasElement;
const renderer = new Renderer(canvas, game);
const ui = mountUI(game, document.getElementById('ui') as HTMLElement, { inhabit: driver ?? undefined });
if (driver) void driver.start();

// handles for debugging and the automated browser checks
(window as unknown as Record<string, unknown>).__game = game;
(window as unknown as Record<string, unknown>).__renderer = renderer;

// a throw in the world's clock, the picture or the interface pauses the world and is shown; it never ends the loop (src/app/frameloop.ts).
// An outside model's run is its own record, so only an ordinary viewer's world is autosaved.
const autosaver = driver ? null : new Autosaver(game, autosaveGame);
startFrameLoop(game, { frame: (dt) => renderer.frame(dt), update: (dt) => ui.update(dt) }, requestAnimationFrame, performance.now(), autosaver ? (dt) => autosaver.frame(dt) : undefined);
