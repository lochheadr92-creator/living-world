// Procedural sprites: everything in the world that does not change shape is painted once to an
// offscreen canvas (at 2x resolution) and then blitted. No image files are needed.
import { hashUnit } from '../sim/rng';

export const RES = 2;

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** anchor (the point that sits on the ground) in logical px from the sprite's top-left */
  ax: number;
  ay: number;
  w: number;
  h: number;
}

// ───────────────────────── colour helpers ─────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  if (hex.charCodeAt(0) === 114) {
    // "rgb(r,g,b)" / "rgba(r,g,b,a)" as produced by rgb(), so colours can be shaded again after they have been shaded once
    const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(hex);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgb(r: number, g: number, b: number, a = 1): string {
  return a >= 1 ? `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})` : `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

export function mix(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

export function shade(c: string, f: number): string {
  const a = hexToRgb(c);
  return rgb(Math.min(255, a[0] * f), Math.min(255, a[1] * f), Math.min(255, a[2] * f));
}

export function alpha(c: string, a: number): string {
  const v = hexToRgb(c);
  return rgb(v[0], v[1], v[2], a);
}

// ───────────────────────── cache ─────────────────────────
export class SpriteCache {
  private map = new Map<string, Sprite>();

  /**
   * `draw` receives a context whose origin is the ground anchor and whose units are logical px
   * (y grows downward, so things that stand up have negative y).
   */
  get(key: string, w: number, h: number, ax: number, ay: number, draw: (ctx: CanvasRenderingContext2D) => void): Sprite {
    let s = this.map.get(key);
    if (s) return s;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * RES);
    canvas.height = Math.ceil(h * RES);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(RES, RES);
    ctx.translate(ax, ay);
    draw(ctx);
    s = { canvas, ax, ay, w, h };
    this.map.set(key, s);
    return s;
  }
}

export function blit(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale = 1): void {
  ctx.drawImage(s.canvas, x - s.ax * scale, y - s.ay * scale, s.w * scale, s.h * scale);
}

// ───────────────────────── drawing primitives ─────────────────────────
export type Pt = readonly [number, number];

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string | CanvasGradient, stroke?: string, lw = 1): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Soft ground shadow. */
export function groundShadow(ctx: CanvasRenderingContext2D, rx: number, ry: number, a = 0.28, cy = 0): void {
  const g = ctx.createRadialGradient(0, cy, 1, 0, cy, rx);
  g.addColorStop(0, `rgba(20,30,20,${a})`);
  g.addColorStop(1, 'rgba(20,30,20,0)');
  ctx.save();
  ctx.translate(0, cy);
  ctx.scale(1, ry / rx);
  ctx.translate(0, -cy);
  ctx.beginPath();
  ctx.arc(0, cy, rx, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** A lit, rounded blob of foliage / bush with a highlight toward the upper left. */
export function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, light: string, mid: string, dark: string, squash = 0.86): void {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.42, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, light);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, dark);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * squash, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

// ───────────────────────── trees ─────────────────────────
const LEAF = { light: '#a6dc7a', mid: '#6fb552', dark: '#3f8140' };
const LEAF_B = { light: '#c3e48b', mid: '#8cc460', dark: '#4f9244' };
const PINE = { light: '#5aa468', mid: '#3a8052', dark: '#245c3e' };

function trunk(ctx: CanvasRenderingContext2D, h: number, wBase: number, wTop: number, c1: string, c2: string, lean = 0): void {
  const g = ctx.createLinearGradient(-wBase, 0, wBase, 0);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.beginPath();
  ctx.moveTo(-wBase, 1);
  ctx.quadraticCurveTo(-wBase * 0.8 + lean * 0.3, -h * 0.4, -wTop + lean, -h);
  ctx.lineTo(wTop + lean, -h);
  ctx.quadraticCurveTo(wBase * 0.8 + lean * 0.3, -h * 0.4, wBase, 1);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  // little root flare
  ctx.beginPath();
  ctx.ellipse(0, 1, wBase * 1.35, 2.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = c2;
  ctx.fill();
}

export function treeSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 4;
  return cache.get(`tree${v}`, 96, 122, 48, 104, (ctx) => {
    groundShadow(ctx, 24, 9, 0.3, 2);
    if (v === 1) {
      // pine
      trunk(ctx, 22, 4, 2.6, '#7a5434', '#4f361f');
      const tiers = [
        { y: -16, w: 28, h: 26 },
        { y: -34, w: 23, h: 24 },
        { y: -52, w: 18, h: 22 },
        { y: -68, w: 12, h: 20 },
      ];
      for (const t of tiers) {
        const g = ctx.createLinearGradient(-t.w, 0, t.w, 0);
        g.addColorStop(0, PINE.light);
        g.addColorStop(0.55, PINE.mid);
        g.addColorStop(1, PINE.dark);
        ctx.beginPath();
        ctx.moveTo(0, t.y - t.h);
        ctx.quadraticCurveTo(t.w * 0.45, t.y - t.h * 0.3, t.w, t.y);
        ctx.quadraticCurveTo(t.w * 0.5, t.y + 3, 0, t.y + 5);
        ctx.quadraticCurveTo(-t.w * 0.5, t.y + 3, -t.w, t.y);
        ctx.quadraticCurveTo(-t.w * 0.45, t.y - t.h * 0.3, 0, t.y - t.h);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,50,35,0.35)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      return;
    }
    if (v === 3) {
      // birch: pale trunk with dark marks, airy canopy
      trunk(ctx, 44, 3.6, 2.4, '#e9e4d4', '#bdb7a2', 1);
      ctx.fillStyle = '#4a4338';
      for (let i = 0; i < 6; i++) ctx.fillRect(-2.5 + (i % 2) * 1.2, -6 - i * 6.5, 2.2, 1.4);
      const c = LEAF_B;
      blob(ctx, -9, -58, 14, c.light, c.mid, c.dark);
      blob(ctx, 9, -61, 14, c.light, c.mid, c.dark);
      blob(ctx, 0, -72, 15, c.light, c.mid, c.dark);
      blob(ctx, -2, -52, 13, c.light, c.mid, c.dark);
      return;
    }
    // oak family
    const big = v === 2;
    trunk(ctx, big ? 36 : 30, big ? 5.5 : 4.6, big ? 3.6 : 3.2, '#8a603a', '#573a22', big ? -1 : 1);
    // branches
    ctx.strokeStyle = '#6b4a2c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(-9, -38);
    ctx.moveTo(1, -28);
    ctx.lineTo(10, -40);
    ctx.stroke();
    const c = LEAF;
    const cy = big ? -62 : -54;
    const R = big ? 1.12 : 1;
    // back to front, so the lit blobs overlap the shaded ones
    blob(ctx, -16 * R, cy + 8, 15 * R, c.light, c.mid, c.dark);
    blob(ctx, 16 * R, cy + 8, 15 * R, c.light, c.mid, c.dark);
    blob(ctx, 0, cy - 13 * R, 18 * R, c.light, c.mid, c.dark);
    blob(ctx, -9 * R, cy - 2, 17 * R, c.light, c.mid, c.dark);
    blob(ctx, 10 * R, cy - 3, 17 * R, c.light, c.mid, c.dark);
    blob(ctx, 0, cy + 9, 15 * R, c.mid, c.mid, c.dark);
    // highlights and leafy edge flecks
    for (let i = 0; i < 16; i++) {
      const a = hashUnit(v, i, 3) * Math.PI * 2;
      const rr = 8 + hashUnit(v, i, 4) * 22 * R;
      const px = Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.75 - 2;
      ctx.beginPath();
      ctx.ellipse(px, py, 3.2, 2.4, a, 0, Math.PI * 2);
      ctx.fillStyle = hashUnit(v, i, 5) > 0.5 ? 'rgba(200,240,150,0.5)' : 'rgba(40,90,40,0.28)';
      ctx.fill();
    }
  });
}

/** fruit tree: a rounder, lower, brighter orchard tree */
export function fruitTreeSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 2;
  return cache.get(`fruittree${v}`, 84, 96, 42, 80, (ctx) => {
    groundShadow(ctx, 22, 8, 0.3, 2);
    trunk(ctx, 22, 4.4, 3, '#8a603a', '#573a22', v ? -1 : 1);
    const c = { light: '#b8e47e', mid: '#7ec25a', dark: '#468c40' };
    blob(ctx, -13, -40, 14, c.light, c.mid, c.dark);
    blob(ctx, 13, -40, 14, c.light, c.mid, c.dark);
    blob(ctx, 0, -52, 16, c.light, c.mid, c.dark);
    blob(ctx, -4, -34, 15, c.light, c.mid, c.dark);
    blob(ctx, 6, -36, 14, c.light, c.mid, c.dark);
    for (let i = 0; i < 10; i++) {
      const a = hashUnit(v, i, 9) * Math.PI * 2;
      const rr = 6 + hashUnit(v, i, 10) * 20;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * rr, -42 + Math.sin(a) * rr * 0.7, 3, 2.3, a, 0, Math.PI * 2);
      ctx.fillStyle = hashUnit(v, i, 11) > 0.5 ? 'rgba(210,245,160,0.45)' : 'rgba(40,90,40,0.25)';
      ctx.fill();
    }
  });
}

/** where fruit hangs on a fruit tree (relative to the anchor) */
export const FRUIT_SPOTS: Pt[] = [
  [-16, -44], [-8, -56], [3, -62], [14, -52], [18, -40], [8, -34], [-4, -40], [-14, -32], [2, -48], [-20, -50],
];

export function bushSprite(cache: SpriteCache, variant: number): Sprite {
  const v = variant % 3;
  return cache.get(`bush${v}`, 56, 42, 28, 32, (ctx) => {
    groundShadow(ctx, 17, 6, 0.26, 2);
    const c = v === 1 ? { light: '#9dd36e', mid: '#5fa646', dark: '#33773a' } : { light: '#8dcc68', mid: '#4f9a45', dark: '#2f6f37' };
    blob(ctx, -9, -9, 10, c.light, c.mid, c.dark);
    blob(ctx, 9, -9, 10, c.light, c.mid, c.dark);
    blob(ctx, 0, -15, 11, c.light, c.mid, c.dark);
    blob(ctx, -2, -6, 10, c.light, c.mid, c.dark);
    blob(ctx, 5, -5, 9, c.mid, c.mid, c.dark);
    for (let i = 0; i < 10; i++) {
      const a = hashUnit(v, i, 21) * Math.PI * 2;
      const rr = 3 + hashUnit(v, i, 22) * 13;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * rr, -11 + Math.sin(a) * rr * 0.6, 2.6, 1.8, a, 0, Math.PI * 2);
      ctx.fillStyle = hashUnit(v, i, 23) > 0.5 ? 'rgba(200,240,150,0.45)' : 'rgba(30,80,40,0.25)';
      ctx.fill();
    }
  });
}

export const BERRY_SPOTS: Pt[] = [
  [-12, -9], [-4, -17], [6, -14], [13, -8], [-8, -3], [1, -8], [8, -2], [-15, -14],
];

// ───────────────────────── rocks ─────────────────────────
export function rockSprite(cache: SpriteCache, variant: number, stage: 0 | 1 | 2): Sprite {
  const v = variant % 3;
  return cache.get(`rock${v}_${stage}`, 64, 52, 32, 40, (ctx) => {
    groundShadow(ctx, 20 + stage * 3, 7, 0.3, 3);
    const s = [0.55, 0.8, 1][stage];
    const chunk = (cx: number, cy: number, w: number, h: number, tone: number) => {
      // faceted boulder: top plane (light), left plane (mid), right plane (dark)
      const top: Pt[] = [[cx - w * 0.5, cy - h * 0.5], [cx - w * 0.1, cy - h], [cx + w * 0.45, cy - h * 0.8], [cx + w * 0.55, cy - h * 0.35], [cx, cy - h * 0.25]];
      const left: Pt[] = [[cx - w * 0.5, cy - h * 0.5], [cx, cy - h * 0.25], [cx + w * 0.05, cy], [cx - w * 0.55, cy - h * 0.05]];
      const right: Pt[] = [[cx, cy - h * 0.25], [cx + w * 0.55, cy - h * 0.35], [cx + w * 0.5, cy - h * 0.02], [cx + w * 0.05, cy]];
      poly(ctx, left, shade('#a8a79f', 0.88 * tone), 'rgba(40,40,40,0.35)', 0.8);
      poly(ctx, right, shade('#8e8d86', 0.82 * tone), 'rgba(40,40,40,0.35)', 0.8);
      poly(ctx, top, shade('#c9c8bf', tone), 'rgba(40,40,40,0.3)', 0.8);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(cx - w * 0.2, cy - h * 0.75, w * 0.18, 1.4);
    };
    if (stage === 0) {
      chunk(-6, 0, 14, 9, 0.98);
      chunk(7, 2, 11, 7, 0.9);
      chunk(0, -1, 9, 6, 1);
      return;
    }
    chunk(-9 * s, 1, 24 * s, 24 * s, 0.97);
    chunk(11 * s, 3, 20 * s, 18 * s, 0.9);
    chunk(1 * s, -1, 18 * s, 22 * s, 1.02);
    if (v === 1) chunk(-2, 4, 12 * s, 9 * s, 0.94);
    // mossy flecks
    ctx.fillStyle = 'rgba(100,150,70,0.4)';
    for (let i = 0; i < 4; i++) ctx.fillRect(-14 + hashUnit(v, i, 31) * 26, -4 - hashUnit(v, i, 32) * 14, 3, 1.6);
  });
}

// ───────────────────────── buildings ─────────────────────────
/** the three original home / store sprites; the full set of building drawings lives in structures.ts */
export type ClassicKind = 'lean_to' | 'hut' | 'storehouse';

export function mk(w: number, h: number) {
  return (x: number, y: number, z = 0): Pt => [((x - w / 2) - (y - h / 2)) * 32, ((x - w / 2) + (y - h / 2)) * 16 - z];
}

export function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function plankLines(ctx: CanvasRenderingContext2D, p: (x: number, y: number, z?: number) => Pt, face: 'L' | 'R', x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, n: number, color: string): void {
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (face === 'L') line(ctx, p(x0 + (x1 - x0) * t, y1, z0), p(x0 + (x1 - x0) * t, y1, z1), color, 0.8);
    else line(ctx, p(x1, y0 + (y1 - y0) * t, z0), p(x1, y0 + (y1 - y0) * t, z1), color, 0.8);
  }
}

export function classicBuildingSprite(cache: SpriteCache, kind: ClassicKind, variant: number): Sprite {
  const v = variant % 4;
  if (kind === 'lean_to') {
    return cache.get(`lean${v}`, 84, 76, 42, 56, (ctx) => {
      const p = mk(1, 1);
      groundShadow(ctx, 30, 11, 0.3, 2);
      const hide = ['#c2a06c', '#7fae58', '#b98f5e', '#9aa86a'][v];
      const hideDark = shade(hide, 0.8);
      const pole = '#7a5434';
      // bedding on the ground
      poly(ctx, [p(0.25, 0.45), p(0.8, 0.45), p(0.8, 0.9), p(0.25, 0.9)], '#d8c68a');
      for (let i = 0; i < 5; i++) line(ctx, p(0.3 + i * 0.1, 0.5), p(0.3 + i * 0.1, 0.85), 'rgba(160,130,60,0.5)', 0.8);
      // back poles + side
      line(ctx, p(0.08, 0.1, 0), p(0.08, 0.1, 40), pole, 2.4);
      line(ctx, p(0.92, 0.1, 0), p(0.92, 0.1, 40), pole, 2.4);
      // right side drape (triangle between back height and front height)
      poly(ctx, [p(0.92, 0.1, 0), p(0.92, 0.1, 40), p(0.92, 0.92, 16), p(0.92, 0.92, 0)], shade(hide, 0.74), 'rgba(40,30,20,0.35)', 0.8);
      // front poles
      line(ctx, p(0.08, 0.92, 0), p(0.08, 0.92, 17), pole, 2.4);
      line(ctx, p(0.92, 0.92, 0), p(0.92, 0.92, 17), pole, 2.4);
      // sloping roof panel
      const g = ctx.createLinearGradient(...p(0.5, 0.1, 40), ...p(0.5, 0.95, 14));
      g.addColorStop(0, hide);
      g.addColorStop(1, hideDark);
      poly(ctx, [p(0.04, 0.08, 41), p(0.96, 0.08, 41), p(0.98, 0.98, 15), p(0.02, 0.98, 15)], g, 'rgba(40,30,20,0.4)', 0.9);
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        line(ctx, p(0.03, 0.08 + 0.9 * t, 41 - 26 * t), p(0.97, 0.08 + 0.9 * t, 41 - 26 * t), 'rgba(60,40,20,0.26)', 0.9);
      }
      // lashings
      ctx.fillStyle = '#5a3d26';
      ctx.fillRect(...p(0.08, 0.1, 40), 2.4, 2.4);
    });
  }
  if (kind === 'hut') {
    return cache.get(`hut${v}`, 168, 150, 84, 112, (ctx) => {
      const p = mk(2, 2);
      groundShadow(ctx, 62, 24, 0.32, 4);
      const x0 = 0.12, x1 = 1.88, y0 = 0.12, y1 = 1.88, ym = 1.0;
      const wallL = ['#d9b47c', '#d2ad74', '#dcb985', '#cfa66d'][v];
      const wallR = shade(wallL, 0.8);
      const roof = ['#dcbc66', '#cfae5e', '#d6b46a', '#c8a85a'][v];
      const trim = '#6e4a2c';
      // stone plinth
      poly(ctx, [p(x0 - 0.04, y1 + 0.04, 0), p(x1 + 0.04, y1 + 0.04, 0), p(x1 + 0.04, y1 + 0.04, 6), p(x0 - 0.04, y1 + 0.04, 6)], '#a9a79e', 'rgba(40,40,40,0.3)', 0.7);
      poly(ctx, [p(x1 + 0.04, y0 - 0.04, 0), p(x1 + 0.04, y1 + 0.04, 0), p(x1 + 0.04, y1 + 0.04, 6), p(x1 + 0.04, y0 - 0.04, 6)], '#8b8981', 'rgba(40,40,40,0.3)', 0.7);
      // walls
      poly(ctx, [p(x0, y1, 6), p(x1, y1, 6), p(x1, y1, 28), p(x0, y1, 28)], wallL, 'rgba(60,40,20,0.4)', 0.8);
      poly(ctx, [p(x1, y0, 6), p(x1, y1, 6), p(x1, y1, 28), p(x1, y0, 28)], wallR, 'rgba(60,40,20,0.4)', 0.8);
      plankLines(ctx, p, 'L', x0, x1, y0, y1, 6, 28, 9, 'rgba(90,60,30,0.35)');
      plankLines(ctx, p, 'R', x0, x1, y0, y1, 6, 28, 9, 'rgba(70,45,22,0.35)');
      // timber frame
      for (const t of [x0, (x0 + x1) / 2, x1]) line(ctx, p(t, y1, 6), p(t, y1, 28), trim, 1.8);
      line(ctx, p(x0, y1, 28), p(x1, y1, 28), trim, 2);
      line(ctx, p(x1, y0, 28), p(x1, y1, 28), trim, 2);
      // gable triangle on the right face
      poly(ctx, [p(x1, y0, 28), p(x1, y1, 28), p(x1, ym, 54)], shade(wallL, 0.74), 'rgba(60,40,20,0.4)', 0.8);
      // door (left face)
      const dx0 = 0.38, dx1 = 0.8;
      poly(ctx, [p(dx0, y1, 6), p(dx1, y1, 6), p(dx1, y1, 22), p(dx0 + 0.21, y1, 25), p(dx0, y1, 22)], '#4e3421', '#2c1d12', 0.9);
      ctx.fillStyle = '#d8b34a';
      ctx.beginPath();
      ctx.arc(...p(dx1 - 0.06, y1, 14), 1, 0, Math.PI * 2);
      ctx.fill();
      // window (left face)
      const wx0 = 1.25, wx1 = 1.6;
      poly(ctx, [p(wx0, y1, 12), p(wx1, y1, 12), p(wx1, y1, 22), p(wx0, y1, 22)], '#46606f', trim, 1.2);
      line(ctx, p((wx0 + wx1) / 2, y1, 12), p((wx0 + wx1) / 2, y1, 22), trim, 0.9);
      line(ctx, p(wx0, y1, 17), p(wx1, y1, 17), trim, 0.9);
      // chimney (stone)
      const cx = 1.55, cy = ym - 0.18;
      poly(ctx, [p(cx, cy + 0.2, 38), p(cx + 0.2, cy + 0.2, 38), p(cx + 0.2, cy + 0.2, 66), p(cx, cy + 0.2, 66)], '#aaa8a0', 'rgba(40,40,40,0.35)', 0.7);
      poly(ctx, [p(cx + 0.2, cy, 38), p(cx + 0.2, cy + 0.2, 38), p(cx + 0.2, cy + 0.2, 66), p(cx + 0.2, cy, 66)], '#85837c', 'rgba(40,40,40,0.35)', 0.7);
      // roof front slope with overhang
      const ox = 0.14;
      const g = ctx.createLinearGradient(...p(1, ym, 56), ...p(1, y1 + 0.14, 24));
      g.addColorStop(0, shade(roof, 1.06));
      g.addColorStop(1, shade(roof, 0.84));
      poly(ctx, [p(x0 - ox, y1 + 0.14, 24), p(x1 + ox, y1 + 0.14, 24), p(x1 + ox, ym, 56), p(x0 - ox, ym, 56)], g, 'rgba(70,50,20,0.55)', 0.9);
      for (let i = 1; i < 8; i++) {
        const t = i / 8;
        const yy = ym + (y1 + 0.14 - ym) * t;
        const zz = 56 - 32 * t;
        line(ctx, p(x0 - ox, yy, zz), p(x1 + ox, yy, zz), 'rgba(90,65,25,0.32)', 0.9);
      }
      for (let i = 0; i < 26; i++) {
        const t = hashUnit(v, i, 41);
        const s = hashUnit(v, i, 42);
        const yy = ym + (y1 + 0.14 - ym) * t;
        const zz = 56 - 32 * t;
        const xx = x0 + (x1 - x0) * s;
        line(ctx, p(xx, yy, zz), p(xx + 0.05, yy - 0.02, zz + 3), 'rgba(255,240,170,0.28)', 0.8);
      }
      // gable-end roof edge on the right
      poly(ctx, [p(x1 + ox, y1 + 0.14, 24), p(x1 + ox, ym, 56), p(x1 + ox + 0.05, ym, 56), p(x1 + ox + 0.05, y1 + 0.14, 24)], shade(roof, 0.7));
      // ridge cap
      line(ctx, p(x0 - ox, ym, 56.5), p(x1 + ox, ym, 56.5), '#7f6026', 2.4);
    });
  }
  // storehouse
  return cache.get(`store${v}`, 176, 158, 88, 118, (ctx) => {
    const p = mk(2, 2);
    groundShadow(ctx, 66, 25, 0.32, 4);
    const x0 = 0.1, x1 = 1.9, y0 = 0.1, y1 = 1.9, ym = 1.0;
    const wallL = ['#b78c5a', '#af8453', '#bb9462', '#a97f4e'][v];
    const wallR = shade(wallL, 0.78);
    const roof = ['#a8613f', '#9c5a3b', '#b06a44', '#94563a'][v];
    const trim = '#5d3e25';
    poly(ctx, [p(x0 - 0.04, y1 + 0.04, 0), p(x1 + 0.04, y1 + 0.04, 0), p(x1 + 0.04, y1 + 0.04, 7), p(x0 - 0.04, y1 + 0.04, 7)], '#a7a59c', 'rgba(40,40,40,0.3)', 0.7);
    poly(ctx, [p(x1 + 0.04, y0 - 0.04, 0), p(x1 + 0.04, y1 + 0.04, 0), p(x1 + 0.04, y1 + 0.04, 7), p(x1 + 0.04, y0 - 0.04, 7)], '#86847c', 'rgba(40,40,40,0.3)', 0.7);
    poly(ctx, [p(x0, y1, 7), p(x1, y1, 7), p(x1, y1, 34), p(x0, y1, 34)], wallL, 'rgba(50,30,15,0.45)', 0.8);
    poly(ctx, [p(x1, y0, 7), p(x1, y1, 7), p(x1, y1, 34), p(x1, y0, 34)], wallR, 'rgba(50,30,15,0.45)', 0.8);
    plankLines(ctx, p, 'L', x0, x1, y0, y1, 7, 34, 14, 'rgba(70,45,22,0.4)');
    plankLines(ctx, p, 'R', x0, x1, y0, y1, 7, 34, 14, 'rgba(50,32,16,0.4)');
    for (const t of [x0, 0.7, 1.3, x1]) line(ctx, p(t, y1, 7), p(t, y1, 34), trim, 1.8);
    line(ctx, p(x0, y1, 34), p(x1, y1, 34), trim, 2.2);
    line(ctx, p(x1, y0, 34), p(x1, y1, 34), trim, 2.2);
    poly(ctx, [p(x1, y0, 34), p(x1, y1, 34), p(x1, ym, 66)], shade(wallL, 0.7), 'rgba(50,30,15,0.45)', 0.8);
    // hay loft opening on the gable
    poly(ctx, [p(x1, ym - 0.2, 40), p(x1, ym + 0.2, 40), p(x1, ym + 0.2, 52), p(x1, ym - 0.2, 52)], '#2f2118', trim, 1);
    // big double door on the left face
    poly(ctx, [p(0.55, y1, 7), p(1.45, y1, 7), p(1.45, y1, 28), p(0.55, y1, 28)], '#4a311e', '#241810', 1);
    line(ctx, p(1.0, y1, 7), p(1.0, y1, 28), '#241810', 1.2);
    line(ctx, p(0.55, y1, 7), p(1.45, y1, 28), 'rgba(20,12,6,0.55)', 1);
    line(ctx, p(1.45, y1, 7), p(0.55, y1, 28), 'rgba(20,12,6,0.55)', 1);
    // roof
    const ox = 0.14;
    const g = ctx.createLinearGradient(...p(1, ym, 68), ...p(1, y1 + 0.14, 30));
    g.addColorStop(0, shade(roof, 1.08));
    g.addColorStop(1, shade(roof, 0.8));
    poly(ctx, [p(x0 - ox, y1 + 0.14, 30), p(x1 + ox, y1 + 0.14, 30), p(x1 + ox, ym, 68), p(x0 - ox, ym, 68)], g, 'rgba(60,30,18,0.6)', 0.9);
    for (let r = 1; r < 9; r++) {
      const t = r / 9;
      const yy = ym + (y1 + 0.14 - ym) * t;
      const zz = 68 - 38 * t;
      line(ctx, p(x0 - ox, yy, zz), p(x1 + ox, yy, zz), 'rgba(50,22,12,0.4)', 0.9);
      for (let c = 0; c < 9; c++) {
        const xx = x0 - ox + ((x1 - x0 + 2 * ox) * (c + (r % 2 ? 0.5 : 0))) / 9;
        line(ctx, p(xx, yy, zz), p(xx, yy + (y1 + 0.14 - ym) / 9, zz - 38 / 9), 'rgba(50,22,12,0.28)', 0.7);
      }
    }
    poly(ctx, [p(x1 + ox, y1 + 0.14, 30), p(x1 + ox, ym, 68), p(x1 + ox + 0.05, ym, 68), p(x1 + ox + 0.05, y1 + 0.14, 30)], shade(roof, 0.66));
    line(ctx, p(x0 - ox, ym, 68.5), p(x1 + ox, ym, 68.5), '#5e3320', 2.6);
  });
}

export const BUILDING_SIZES: Record<ClassicKind, { w: number; h: number }> = { lean_to: { w: 1, h: 1 }, hut: { w: 2, h: 2 }, storehouse: { w: 2, h: 2 } };

// ───────────────────────── small things ─────────────────────────
export function stumpSprite(cache: SpriteCache, variant: number): Sprite {
  return cache.get(`stump${variant % 2}`, 36, 26, 18, 16, (ctx) => {
    groundShadow(ctx, 11, 4, 0.25, 1);
    const g = ctx.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, '#8d643b');
    g.addColorStop(1, '#5a3d24');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-7, 1);
    ctx.lineTo(-6.4, -7);
    ctx.lineTo(6.4, -7);
    ctx.lineTo(7, 1);
    ctx.ellipse(0, 1, 7, 3, 0, 0, Math.PI);
    ctx.fill();
    ellipse(ctx, 0, -7, 6.4, 3.2, '#d3ad73');
    ctx.strokeStyle = 'rgba(120,80,40,0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, -7, 4.2, 2.1, 0, 0, Math.PI * 2);
    ctx.moveTo(2, -7);
    ctx.ellipse(0, -7, 2, 1, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

export function graveSprite(cache: SpriteCache): Sprite {
  return cache.get('grave', 48, 48, 24, 36, (ctx) => {
    groundShadow(ctx, 14, 5, 0.25, 2);
    ellipse(ctx, 0, -1, 12, 5, '#7b5e3c');
    ellipse(ctx, 0, -3, 10, 4, '#8f7048');
    // headstone
    ctx.beginPath();
    ctx.moveTo(-5, -4);
    ctx.lineTo(-5, -20);
    ctx.quadraticCurveTo(0, -27, 5, -20);
    ctx.lineTo(5, -4);
    ctx.closePath();
    const g = ctx.createLinearGradient(-5, 0, 5, 0);
    g.addColorStop(0, '#c9c8bf');
    g.addColorStop(1, '#9a998f');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,40,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,70,65,0.7)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(0, -10);
    ctx.moveTo(-3, -16);
    ctx.lineTo(3, -16);
    ctx.stroke();
    // flowers
    const cols = ['#e86a8a', '#f5d44e', '#9ad0f5'];
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-9 + i * 5.5, -2 + (i % 2) * 1.5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = cols[i % 3];
      ctx.fill();
    }
  });
}
