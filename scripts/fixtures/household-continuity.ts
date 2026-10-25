import '../../src/styles.css';
import { householdContinuityWorld, converseDuringDelivery } from './household_continuity_world';
import { Game } from '../../src/app/game';
import { Renderer } from '../../src/render/renderer';
import { mountUI } from '../../src/ui';
import { setExternalController } from '../../src/sim/external';
import { stepWorld } from '../../src/sim/world';

// Development-only snapshots of the same real activity chain. No product controls
// or new simulation rules. The fixture starts with a known site, goods and friendship.
const s = householdContinuityWorld();
const phase = new URLSearchParams(location.search).get('phase') ?? 'paused';
setExternalController({ controls: () => true, choose: () => ({ kind: 'defer' }) });
if (phase !== 'before') converseDuringDelivery(s);
if (phase === 'resumed' || phase === 'delivered') {
  for (let n = 0; n < 200 && s.p.convId; n++) stepWorld(s.w);
}
if (phase === 'delivered') {
  for (let n = 0; n < 100 && s.plan.worked === 0; n++) stepWorld(s.w);
}
setExternalController(null);
const g = new Game(s.w.settings);
g.restoreWorld(s.w, s.w.settings);
g.setPlaying(false);
g.select(s.p.id);
g.flyTo(s.p.x, s.p.y);
const renderer = new Renderer(document.getElementById('world') as HTMLCanvasElement, g);
const ui = mountUI(g, document.getElementById('ui')!);
const badge = document.createElement('div');
badge.textContent = `STAGED HOUSEHOLD CONTRACT — ${phase} — home materials interrupted by conversation`;
badge.style.cssText = 'position:fixed;bottom:0;left:0;z-index:9999;background:#34280d;color:#fff;padding:5px;max-width:50vw;font-size:11px';
document.body.append(badge);
let last = performance.now();
function frame(now: number) {
  const dt = (now - last) / 1000; last = now;
  g.advance(dt); renderer.frame(Math.min(dt, .25)); ui.update(Math.min(dt, .25));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
