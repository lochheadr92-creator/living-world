// The minimap (bottom-right). It is drawn in the same isometric orientation as the main view, so the visible
// area is an ordinary axis-aligned rectangle. The terrain is rendered once per world into a cached layer;
// buildings, people, wolves and the viewport are redrawn on top ~4 times a second (the viewport follows the camera more often).
import { BUILD_DEF, MAP_H, MAP_W } from '../sim/constants';
import type { World } from '../sim/types';
import { HALF_H, HALF_W, project } from '../render/iso';
import { HOUSEHOLD_COLORS } from '../render/palette';
import { Every, h, hexToRgb, setBool } from './dom';
import { icon } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

const TERRAIN_HEX = ['#2f78ad', '#58b4cc', '#e2d29b', '#79b85a', '#5f9a4e', '#a3a196'];
const TERRAIN_RGB = TERRAIN_HEX.map(hexToRgb);

// bounds of the whole map in isometric-plane pixels
const SX_MIN = -MAP_H * HALF_W;
const SX_SPAN = (MAP_W + MAP_H) * HALF_W;
const SY_SPAN = (MAP_W + MAP_H) * HALF_H;

export function createMinimap(ctx: UICtx, slots: Slots): Part {
  const { game } = ctx;
  let size = 168;
  let dpr = Math.min(2, window.devicePixelRatio || 1);

  const canvas = h('canvas', { class: 'mini-canvas', width: String(size), height: String(size), role: 'img', 'aria-label': 'Map of the whole world. Click or drag to move the camera.' });
  let open = ctx.state.minimapOpen;
  const foldBtn = h(
    'button',
    {
      type: 'button',
      class: 'mini-fold',
      'aria-expanded': String(open),
      'aria-label': 'Map',
      'data-tip': 'Fold the map away or bring it back',
      onClick: () => {
        open = !open;
        ctx.state.minimapOpen = open;
        ctx.saveState();
        applyOpen();
      },
    },
    icon('cube', 13),
    h('span', { class: 'mini-fold-l' }, 'Map'),
    icon('chevron', 11, 'mini-chev'),
  );
  const view = h(
    'div',
    { class: 'mini-view', 'data-tip': 'Map\nClick or drag to move the camera. The white box is what you can see now. Coloured dots are people, grouped by household; red dots are wolves. Cream boxes are homes, copper ones workshops; small shapes mark clay, ore and stone outcrops, and tan squares are handcarts.' },
    canvas,
  );
  const panel = h('div', { class: 'minimap glass', 'data-open': String(open) }, foldBtn, view);
  slots.right.appendChild(panel);
  const g = canvas.getContext('2d')!;

  let terrain: HTMLCanvasElement | null = null;
  let terrainWorld: World | null = null;
  let terrainKey = '';
  let dirty = true;
  let lastCam = '';

  // ───────── geometry ─────────
  /** isometric plane px -> minimap css px */
  const mx = (sx: number) => ((sx - SX_MIN) / SX_SPAN) * size;
  const my = (sy: number) => (sy / SY_SPAN) * size;
  const toMap = (wx: number, wy: number): [number, number] => {
    const p = project(wx, wy);
    return [mx(p.sx), my(p.sy)];
  };

  function fitCanvas(): void {
    const r = canvas.getBoundingClientRect();
    const cssSize = Math.max(60, Math.round(r.width || 168));
    const nd = Math.min(2, window.devicePixelRatio || 1);
    if (cssSize !== size || nd !== dpr || canvas.width !== Math.round(cssSize * nd)) {
      size = cssSize;
      dpr = nd;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      terrain = null;
      dirty = true;
    }
  }

  // ───────── terrain layer (drawn once per world) ─────────
  function buildTerrain(world: World): void {
    const px = Math.round(size * dpr);
    const layer = document.createElement('canvas');
    layer.width = px;
    layer.height = px;
    const lg = layer.getContext('2d')!;
    const img = lg.createImageData(px, px);
    const d = img.data;
    const SS = 2; // 2x2 supersampling gives soft island edges
    for (let j = 0; j < px; j++) {
      for (let i = 0; i < px; i++) {
        let r = 0;
        let gg = 0;
        let b = 0;
        let cov = 0;
        for (let sj = 0; sj < SS; sj++) {
          for (let si = 0; si < SS; si++) {
            const fx = i + (si + 0.5) / SS;
            const fy = j + (sj + 0.5) / SS;
            // device px -> iso plane px -> world tiles
            const sx = (fx / px) * SX_SPAN + SX_MIN;
            const sy = (fy / px) * SY_SPAN;
            const a = sx / HALF_W;
            const bb = sy / HALF_H;
            const x = (a + bb) / 2;
            const y = (bb - a) / 2;
            if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
            const c = TERRAIN_RGB[world.terrain[Math.floor(y) * MAP_W + Math.floor(x)]] ?? TERRAIN_RGB[3];
            r += c[0];
            gg += c[1];
            b += c[2];
            cov++;
          }
        }
        if (cov) {
          const o = (j * px + i) * 4;
          d[o] = r / cov;
          d[o + 1] = gg / cov;
          d[o + 2] = b / cov;
          d[o + 3] = (255 * cov) / (SS * SS);
        }
      }
    }
    lg.putImageData(img, 0, 0);
    terrain = layer;
    terrainWorld = world;
    terrainKey = `${world.seed}|${px}|${world.sceneLabel}`;
  }

  // ───────── dynamic layer ─────────
  const canvasEl = () => document.getElementById('world') as HTMLCanvasElement | null;

  function draw(): void {
    const world = game.world;
    if (!terrain || terrainWorld !== world || terrainKey !== `${world.seed}|${Math.round(size * dpr)}|${world.sceneLabel}`) buildTerrain(world);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    if (terrain) g.drawImage(terrain, 0, 0, size, size);

    // buildings, construction sites and fields (they change slowly but do change)
    for (const pl of world.plots) {
      const [x, y] = toMap(pl.x + 0.5, pl.y + 0.5);
      g.fillStyle = pl.state === 'ripe' ? 'rgba(235,205,90,0.95)' : 'rgba(150,115,70,0.9)';
      g.fillRect(x - 1, y - 0.8, 2, 1.6);
    }
    // finite deposits are worth finding: clay (round), ore (diamond), big outcrops (triangle)
    for (const s of world.sources) {
      if (s.type !== 'clay_pit' && s.type !== 'ore_vein' && s.type !== 'outcrop') continue;
      const [x, y] = toMap(s.x + 0.5, s.y + 0.5);
      g.fillStyle = s.type === 'clay_pit' ? '#d9905a' : s.type === 'ore_vein' ? '#e0a24c' : '#e4e1d2';
      g.strokeStyle = 'rgba(20,14,8,0.8)';
      g.lineWidth = 0.8;
      g.beginPath();
      if (s.type === 'clay_pit') g.arc(x, y, 1.7, 0, Math.PI * 2);
      else if (s.type === 'ore_vein') {
        g.moveTo(x, y - 2.3);
        g.lineTo(x + 1.8, y);
        g.lineTo(x, y + 2.3);
        g.lineTo(x - 1.8, y);
        g.closePath();
      } else {
        g.moveTo(x, y - 2.2);
        g.lineTo(x + 2.2, y + 1.6);
        g.lineTo(x - 2.2, y + 1.6);
        g.closePath();
      }
      g.fill();
      g.stroke();
    }
    for (const b of world.buildings) {
      const [x, y] = toMap(b.x + b.w / 2, b.y + b.h / 2);
      if (b.type === 'fire') {
        g.fillStyle = b.fuel > 0 ? '#ffb347' : '#8a7f78';
        g.beginPath();
        g.arc(x, y, 1.5, 0, Math.PI * 2);
        g.fill();
      } else {
        // homes are cream, stores tan, workshops copper, the hall lilac: the settlement's anatomy at a glance
        const role = BUILD_DEF[b.type].role;
        g.fillStyle = role === 'work' ? '#e9a468' : role === 'store' ? '#d8b98c' : role === 'meet' ? '#cdb0e8' : '#f2e3c4';
        g.strokeStyle = 'rgba(40,24,10,0.85)';
        g.lineWidth = 1;
        const s = b.w >= 3 ? 4.2 : b.w >= 2 ? 3.2 : 2.4;
        g.beginPath();
        g.rect(x - s, y - s * 0.7, s * 2, s * 1.4);
        g.fill();
        g.stroke();
      }
    }
    for (const c of world.carts) {
      const [x, y] = toMap(c.x, c.y);
      g.fillStyle = c.puller ? '#f6d28a' : '#b98a4f';
      g.fillRect(x - 1.1, y - 1.1, 2.2, 2.2);
    }
    for (const s of world.sites) {
      const [x, y] = toMap(s.x + s.w / 2, s.y + s.h / 2);
      g.strokeStyle = '#f3b95f';
      g.lineWidth = 1;
      g.setLineDash([1.5, 1.5]);
      g.strokeRect(x - 2.6, y - 1.9, 5.2, 3.8);
      g.setLineDash([]);
    }

    // people by household colour
    const colour = new Map<number, string>();
    for (const hh of world.households) colour.set(hh.id, HOUSEHOLD_COLORS[hh.color % HOUSEHOLD_COLORS.length]);
    for (const p of world.persons) {
      if (!p.alive || p.id === game.selectedId) continue;
      const [x, y] = toMap(p.x, p.y);
      g.fillStyle = colour.get(p.hhId) ?? '#ffffff';
      g.fillRect(x - 1, y - 1, 2, 2);
    }
    for (const a of world.animals) {
      const [x, y] = toMap(a.x, a.y);
      g.fillStyle = '#ff4d45';
      g.beginPath();
      g.arc(x, y, 1.7, 0, Math.PI * 2);
      g.fill();
    }

    // the selection: a white ring around it, a larger dot if it is a person
    const sel = game.selectedId ? world.byId.get(game.selectedId) : undefined;
    if (sel) {
      let wx = 0;
      let wy = 0;
      if (sel.ent === 'building' || sel.ent === 'site') {
        wx = sel.x + sel.w / 2;
        wy = sel.y + sel.h / 2;
      } else {
        wx = (sel as { x: number }).x + (sel.ent === 'person' || sel.ent === 'animal' || sel.ent === 'cart' ? 0 : 0.5);
        wy = (sel as { y: number }).y + (sel.ent === 'person' || sel.ent === 'animal' || sel.ent === 'cart' ? 0 : 0.5);
      }
      const [x, y] = toMap(wx, wy);
      if (sel.ent === 'person') {
        g.fillStyle = colour.get(sel.hhId) ?? '#ffffff';
        g.beginPath();
        g.arc(x, y, 2.4, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(x, y, 4.6, 0, Math.PI * 2);
      g.stroke();
    }

    // the visible area
    const c = canvasEl();
    if (c) {
      const r = c.getBoundingClientRect();
      const cam = game.camera;
      const hw = r.width / (2 * cam.zoom);
      const hh = r.height / (2 * cam.zoom);
      const x0 = mx(cam.x - hw);
      const x1 = mx(cam.x + hw);
      const y0 = my(cam.y - hh);
      const y1 = my(cam.y + hh);
      g.save();
      g.beginPath();
      g.rect(0.5, 0.5, size - 1, size - 1);
      g.clip();
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.strokeStyle = 'rgba(255,255,255,0.92)';
      g.lineWidth = 1.3;
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      g.restore();
    }
    dirty = false;
  }

  // ───────── interaction: click or drag to move the camera ─────────
  let dragging = false;
  const pan = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const v = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    game.camera.x = SX_MIN + u * SX_SPAN;
    game.camera.y = v * SY_SPAN;
    game.fly = null;
    if (game.following) game.setFollow(false);
    dirty = true;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* a pointer that is not active (synthetic events): dragging still works while it stays over the map */
    }
    pan(e);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) pan(e);
  });
  const end = (e: PointerEvent) => {
    dragging = false;
    try {
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* nothing to release */
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  function applyOpen(): void {
    panel.dataset.open = String(open);
    setBool(foldBtn, 'aria-expanded', open);
    view.hidden = !open;
    if (open) {
      fitCanvas();
      dirty = true;
    }
  }

  const ro = new ResizeObserver(() => {
    if (open) fitCanvas();
  });
  ro.observe(canvas);
  // browser zoom changes the pixel ratio without changing the element's CSS size
  const onResize = () => {
    if (open) fitCanvas();
  };
  window.addEventListener('resize', onResize);
  applyOpen();
  if (open) draw();

  const slow = new Every(0.25);
  const camTick = new Every(0.05);

  return {
    update(dt) {
      if (!open) return;
      const cam = game.camera;
      const key = `${cam.x.toFixed(1)},${cam.y.toFixed(1)},${cam.zoom.toFixed(3)}`;
      const moved = key !== lastCam;
      if (slow.step(dt) || dirty) {
        lastCam = key;
        draw();
      } else if (moved && camTick.step(dt)) {
        lastCam = key;
        draw();
      }
    },
    onGame(e) {
      if (e === 'restart') {
        terrain = null;
        dirty = true;
      }
      if (e === 'select') dirty = true;
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      panel.remove();
    },
  };
}
