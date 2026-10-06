// Piles and stacks of goods, painted once per (kind, count) and blitted wherever stock is shown: beside construction
// sites, at workshops and storehouses, in heaps on the ground. What you see is a function of the real quantity.
import { hashUnit } from '../sim/rng';
import type { ItemKind } from '../sim/types';
import { boxTones, box, coursesL, coursesR, jointsL, jointsR } from './iso3d';
import type { P3 } from './iso3d';
import { SpriteCache, alpha, ellipse, line, mk, poly, shade } from './sprites';
import type { Sprite } from './sprites';

type Ctx = CanvasRenderingContext2D;

/** A round log lying along the x axis. */
function log(ctx: Ctx, p: P3, x0: number, x1: number, y: number, z: number, r: number, tone: number): void {
  const a = p(x0, y, z);
  const b = p(x1, y, z);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(25,15,8,0.55)';
  ctx.lineWidth = r * 2 + 1.1;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = shade('#a07040', tone);
  ctx.lineWidth = r * 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,180,0.28)';
  ctx.lineWidth = r * 0.7;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] - r * 0.55);
  ctx.lineTo(b[0], b[1] - r * 0.55);
  ctx.stroke();
  // the sawn end that faces the viewer
  ctx.save();
  ctx.translate(b[0], b[1]);
  ctx.rotate(0.35);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.82, r * 1.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#dcb67e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,70,30,0.7)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.4, r * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Logs piled in a pyramid, up to ten of them. */
export function logPile(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(10, Math.round(n)));
  return cache.get(`g:logs:${k}`, 76, 60, 38, 46, (ctx) => {
    const p = mk(1, 0.72);
    ellipse(ctx, 0, 2, 26, 8, 'rgba(20,28,18,0.22)');
    const rows = [4, 3, 2, 1];
    let placed = 0;
    for (let r = 0; r < rows.length && placed < k; r++) {
      const c = Math.min(rows[r], k - placed);
      // a partial row is centred
      for (let i = 0; i < c; i++) {
        const y = 0.36 + (i - (c - 1) / 2) * 0.17;
        log(ctx, p, 0.06, 0.94, y, 2.9 + r * 4.6, 2.7, 0.9 + hashUnit(r, i, 3) * 0.22);
        placed++;
      }
    }
  });
}

/** A stack of boards, up to fourteen. */
export function plankStack(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(14, Math.round(n)));
  return cache.get(`g:planks:${k}`, 64, 70, 32, 54, (ctx) => {
    const p = mk(0.95, 0.42);
    ellipse(ctx, 0, 2, 24, 8, 'rgba(20,28,18,0.22)');
    const H = 1.9 * k + 1.4;
    // two bearers under the stack
    box(ctx, p, 0.12, 0.2, 0.04, 0.38, 0, 1.4, boxTones('#6e4d2e'));
    box(ctx, p, 0.75, 0.83, 0.04, 0.38, 0, 1.4, boxTones('#6e4d2e'));
    const st = { top: '#ecd2a0', left: '#d8b680', right: '#b08a58', stroke: 'rgba(60,38,14,0.45)' };
    box(ctx, p, 0.03, 0.92, 0.02, 0.4, 1.4, H, st);
    coursesL(ctx, p, 0.03, 0.92, 0.4, 1.4, H, k, 'rgba(90,58,24,0.5)', 0.7);
    coursesR(ctx, p, 0.92, 0.02, 0.4, 1.4, H, k, 'rgba(70,44,18,0.5)', 0.7);
    // wood grain on the top board
    for (let i = 0; i < 3; i++) line(ctx, p(0.1, 0.1 + i * 0.1, H), p(0.84, 0.1 + i * 0.1, H), 'rgba(120,80,36,0.28)', 0.6);
    // a few boards sit a little proud
    if (k > 3) {
      const z = 1.4 + 1.9 * (k - 2);
      box(ctx, p, 0.0, 0.8, 0.05, 0.37, z, z + 1.9, { top: '#f0d9ac', left: '#dcbb86', right: '#b8915e', stroke: 'rgba(60,38,14,0.45)' });
    }
  });
}

/** Fired bricks stacked in layers of six. */
export function brickStack(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(30, Math.round(n)));
  return cache.get(`g:bricks:${k}`, 56, 64, 28, 48, (ctx) => {
    const p = mk(0.6, 0.42);
    ellipse(ctx, 0, 2, 20, 7, 'rgba(20,28,18,0.22)');
    const full = Math.floor(k / 6);
    const rem = k - full * 6;
    const lh = 3.4;
    const st = { top: '#cf6a4a', left: '#b4573f', right: '#8c4130', stroke: 'rgba(50,20,12,0.5)' };
    if (full > 0) {
      box(ctx, p, 0.02, 0.58, 0.02, 0.4, 0, full * lh, st);
      coursesL(ctx, p, 0.02, 0.58, 0.4, 0, full * lh, full, 'rgba(235,200,170,0.5)', 0.7);
      coursesR(ctx, p, 0.58, 0.02, 0.4, 0, full * lh, full, 'rgba(235,200,170,0.4)', 0.7);
      for (let c = 0; c < full; c++) {
        jointsL(ctx, p, 0.02, 0.58, 0.4, c * lh, (c + 1) * lh, 1, 3, 'rgba(235,200,170,0.4)', 0.6);
        jointsR(ctx, p, 0.58, 0.02, 0.4, c * lh, (c + 1) * lh, 1, 2, 'rgba(235,200,170,0.35)', 0.6);
      }
    }
    if (rem > 0) {
      const w = 0.04 + (rem / 6) * 0.52;
      const z0 = full * lh;
      box(ctx, p, 0.02, w, 0.02, 0.4, z0, z0 + lh, st);
      jointsL(ctx, p, 0.02, w, 0.4, z0, z0 + lh, 1, Math.max(1, Math.ceil(rem / 2)), 'rgba(235,200,170,0.4)', 0.6);
    }
  });
}

/** Squared blocks of cut stone: up to nine, in a little pyramid. */
export function cutStone(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(9, Math.round(n)));
  return cache.get(`g:cut:${k}`, 76, 64, 38, 48, (ctx) => {
    const p = mk(1.1, 0.7);
    ellipse(ctx, 0, 2, 30, 10, 'rgba(20,28,18,0.2)');
    const slots: [number, number, number][] = [
      [0.05, 0.08, 0],
      [0.4, 0.08, 0],
      [0.75, 0.08, 0],
      [0.05, 0.38, 0],
      [0.4, 0.38, 0],
      [0.75, 0.38, 0],
      [0.2, 0.2, 1],
      [0.56, 0.2, 1],
      [0.38, 0.28, 2],
    ];
    // back to front, bottom to top
    const order = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => i < k).sort((a, b) => slots[a][2] - slots[b][2] || slots[a][1] - slots[b][1] || slots[a][0] - slots[b][0]);
    for (const i of order) {
      const [x, y, lvl] = slots[i];
      const tone = 0.93 + hashUnit(i, 7, 1) * 0.12;
      const z0 = lvl * 7.4;
      box(ctx, p, x, x + 0.31, y, y + 0.27, z0, z0 + 7.4, { top: shade('#e4e1d6', tone), left: shade('#cbc8bc', tone), right: shade('#a4a196', tone), stroke: 'rgba(60,58,50,0.5)' });
      line(ctx, p(x + 0.04, y + 0.27, z0 + 5.4), p(x + 0.27, y + 0.27, z0 + 5.4), 'rgba(255,255,255,0.35)', 0.6);
    }
  });
}

/** A rough heap of loose stones. */
export function stoneHeap(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(16, Math.round(n)));
  return cache.get(`g:stones:${k}`, 64, 48, 32, 34, (ctx) => {
    ellipse(ctx, 0, 1, 22, 8, 'rgba(20,28,18,0.22)');
    for (let i = 0; i < k; i++) {
      const layer = i < 7 ? 0 : i < 12 ? 1 : 2;
      const ang = hashUnit(i, 2, 5) * Math.PI * 2;
      const rad = layer === 0 ? 5 + hashUnit(i, 3, 5) * 12 : layer === 1 ? 3 + hashUnit(i, 3, 6) * 7 : 1 + hashUnit(i, 3, 7) * 3;
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad * 0.5 - layer * 4.2 - 2.4;
      const r = 3.4 + hashUnit(i, 4, 5) * 2;
      ellipse(ctx, x + 0.6, y + 1.4, r + 0.6, r * 0.78, 'rgba(25,25,22,0.4)');
      ellipse(ctx, x, y, r, r * 0.8, shade('#aaa89f', 0.82 + hashUnit(i, 5, 5) * 0.3));
      ellipse(ctx, x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.32, 'rgba(255,255,255,0.28)');
    }
  });
}

interface LumpKit {
  base: string;
  hi: string;
  dark: string;
  fleck?: string;
}

const LUMPS: Partial<Record<ItemKind, LumpKit>> = {
  clay: { base: '#c98557', hi: '#e8aa7c', dark: '#8e5632' },
  ore: { base: '#55535e', hi: '#8a8894', dark: '#2b2a31', fleck: '#d98f3c' },
  charcoal: { base: '#2c2926', hi: '#5a5650', dark: '#141210' },
};

/** A heap of clay, ore or charcoal lumps. */
export function lumpHeap(cache: SpriteCache, kind: ItemKind, n: number): Sprite {
  const kit = LUMPS[kind] ?? LUMPS.clay!;
  const k = Math.max(1, Math.min(16, Math.round(n)));
  return cache.get(`g:lumps:${kind}:${k}`, 60, 46, 30, 32, (ctx) => {
    ellipse(ctx, 0, 1, 21, 8, 'rgba(20,28,18,0.22)');
    // a squat mound under the lumps
    if (kind === 'clay') {
      ellipse(ctx, 0, -2, 14 + k * 0.5, 5.5 + k * 0.15, shade(kit.base, 0.85));
    }
    for (let i = 0; i < k; i++) {
      const layer = i < 7 ? 0 : i < 12 ? 1 : 2;
      const ang = hashUnit(i, 2, 15) * Math.PI * 2;
      const rad = layer === 0 ? 3 + hashUnit(i, 3, 15) * 11 : layer === 1 ? 2 + hashUnit(i, 3, 16) * 6 : hashUnit(i, 3, 17) * 3;
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad * 0.5 - layer * 3.6 - 2;
      const r = 2.8 + hashUnit(i, 4, 15) * 1.8;
      const pts: [number, number][] = [];
      const sides = 6;
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2 + hashUnit(i, s, 18) * 0.7;
        const rr = r * (0.75 + hashUnit(i, s, 19) * 0.45);
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.78]);
      }
      poly(ctx, pts, shade(kit.base, 0.88 + hashUnit(i, 5, 15) * 0.26), alpha(kit.dark, 0.7), 0.7);
      ctx.fillStyle = alpha(kit.hi, kind === 'clay' ? 0.55 : 0.42);
      ctx.beginPath();
      ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.45, r * 0.27, -0.3, 0, Math.PI * 2);
      ctx.fill();
      if (kit.fleck && hashUnit(i, 6, 15) > 0.35) {
        ctx.fillStyle = kit.fleck;
        ctx.fillRect(x + r * 0.15, y + r * 0.05, 1.5, 1.2);
        ctx.fillRect(x - r * 0.4, y + r * 0.25, 1.1, 1.1);
      }
    }
  });
}

/** Iron bars stacked criss-cross. */
export function ironBars(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(12, Math.round(n)));
  return cache.get(`g:iron:${k}`, 56, 50, 28, 36, (ctx) => {
    const p = mk(0.75, 0.6);
    ellipse(ctx, 0, 1, 18, 6, 'rgba(20,28,18,0.2)');
    const perLayer = 3;
    for (let i = 0; i < k; i++) {
      const layer = Math.floor(i / perLayer);
      const idx = i % perLayer;
      const z = 1.6 + layer * 2.9;
      if (layer % 2 === 0) {
        const y = 0.13 + idx * 0.17;
        box(ctx, p, 0.04, 0.7, y, y + 0.1, z - 1.6, z + 1.2, { top: '#8f95a3', left: '#656b79', right: '#454a56', stroke: 'rgba(15,15,22,0.55)' });
      } else {
        const x = 0.12 + idx * 0.21;
        box(ctx, p, x, x + 0.1, 0.04, 0.56, z - 1.6, z + 1.2, { top: '#8f95a3', left: '#656b79', right: '#454a56', stroke: 'rgba(15,15,22,0.55)' });
      }
    }
  });
}

/** One to four sacks, flour-white, grain-gold or soot-black. */
export function sackPile(cache: SpriteCache, kind: 'flour' | 'grain' | 'charcoal' | 'clay' | 'ore' | 'seeds', n: number): Sprite {
  const k = Math.max(1, Math.min(4, Math.round(n)));
  const body: Record<string, [string, string, string]> = {
    flour: ['#f5eddc', '#d9ceb4', '#a89f88'],
    grain: ['#e0c98a', '#bfa263', '#8a7440'],
    charcoal: ['#4a4641', '#2e2b28', '#171513'],
    clay: ['#d99a68', '#b6764a', '#85502e'],
    ore: ['#6b6a76', '#4a4954', '#2c2b33'],
    seeds: ['#c9b27a', '#a58d58', '#756138'],
  };
  const [c1, c2, c3] = body[kind] ?? body.grain;
  return cache.get(`g:sacks:${kind}:${k}`, 56, 54, 28, 40, (ctx) => {
    ellipse(ctx, 0, 1, 19, 7, 'rgba(20,28,18,0.22)');
    const spots: [number, number, number][] = [
      [-7, 0, 0],
      [7, 1, 0],
      [0, -3, 1],
      [-1, 3, 0],
    ];
    const order = [0, 1, 3, 2].filter((i) => i < k);
    for (const i of order) {
      const [x, y, lvl] = spots[i];
      const cy = y - lvl * 8.5;
      const g = ctx.createRadialGradient(x - 3, cy - 8, 1, x, cy - 5, 9);
      g.addColorStop(0, c1);
      g.addColorStop(0.65, c2);
      g.addColorStop(1, c3);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 5.5, cy);
      ctx.quadraticCurveTo(x - 8.5, cy - 7, x - 3, cy - 11);
      ctx.lineTo(x + 3, cy - 11);
      ctx.quadraticCurveTo(x + 8.5, cy - 7, x + 5.5, cy);
      ctx.quadraticCurveTo(x, cy + 2.2, x - 5.5, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,28,14,0.5)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // tied neck
      ctx.fillStyle = shade(c2, 0.82);
      ctx.fillRect(x - 3.4, cy - 11.6, 6.8, 2.2);
      ctx.strokeStyle = 'rgba(70,45,20,0.8)';
      ctx.beginPath();
      ctx.moveTo(x - 3.4, cy - 9.6);
      ctx.lineTo(x + 3.4, cy - 9.6);
      ctx.stroke();
    }
  });
}

/** A basket of loaves. */
export function breadBasket(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(9, Math.round(n)));
  return cache.get(`g:bread:${k}`, 52, 44, 26, 32, (ctx) => {
    ellipse(ctx, 0, 1, 16, 6, 'rgba(20,28,18,0.22)');
    // loaves heaped above the rim
    for (let i = 0; i < k; i++) {
      const row = i < 4 ? 0 : i < 7 ? 1 : 2;
      const col = i < 4 ? i - 1.5 : i < 7 ? i - 4 - 1 : 0;
      const x = col * 6.4;
      const y = -9.5 - row * 3.6 + (i % 2) * 0.6;
      ctx.fillStyle = '#7a4a1e';
      ctx.beginPath();
      ctx.ellipse(x, y + 0.7, 4.6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(x - 1.5, y - 1.5, 0.5, x, y, 5);
      g.addColorStop(0, '#f1c274');
      g.addColorStop(1, '#c4863c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 4.4, 2.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110,60,20,0.6)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 1);
      ctx.lineTo(x - 0.8, y + 1);
      ctx.moveTo(x + 0.4, y - 1.3);
      ctx.lineTo(x + 1.6, y + 0.8);
      ctx.stroke();
    }
    // the basket
    ctx.fillStyle = '#b98a4f';
    ctx.strokeStyle = 'rgba(70,45,20,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-11, -9);
    ctx.lineTo(11, -9);
    ctx.lineTo(8.8, 0);
    ctx.quadraticCurveTo(0, 3, -8.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,45,20,0.5)';
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-10 + i * 0.3, -9 + i * 2.2);
      ctx.lineTo(10 - i * 0.3, -9 + i * 2.2);
      ctx.stroke();
    }
  });
}

/** A wooden tray of smoked fish, golden brown. */
export function smokedFishTray(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(9, Math.round(n)));
  return cache.get(`g:smoked:${k}`, 52, 44, 26, 32, (ctx) => {
    ellipse(ctx, 0, 1, 15, 5.5, 'rgba(20,28,18,0.22)');
    // the tray
    ctx.fillStyle = '#7a5a38';
    ctx.strokeStyle = 'rgba(40,25,10,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(12, -6);
    ctx.lineTo(10.4, 0.6);
    ctx.lineTo(-10.4, 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // the fish lie in rows, head to tail, each a little different
    for (let i = 0; i < k; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = (col - 1) * 7.4 + (row % 2) * 1.6;
      const y = -8.6 - row * 3.4;
      const g = ctx.createLinearGradient(x - 4.4, y - 2, x + 4.4, y + 2);
      g.addColorStop(0, i % 2 ? '#d8a45a' : '#e0b068');
      g.addColorStop(1, i % 2 ? '#a8742e' : '#b4803a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 4.5, 2.1, i % 2 ? 0.08 : -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9a6a2c';
      ctx.beginPath();
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 6.6, y - 1.8);
      ctx.lineTo(x + 6.6, y + 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(40,24,8,0.7)';
      ctx.fillRect(x - 3.2, y - 0.5, 0.9, 0.9);
    }
  });
}

/** A bundle of tool handles. */
export function handleBundle(cache: SpriteCache, n: number): Sprite {
  const k = Math.max(1, Math.min(14, Math.round(n)));
  return cache.get(`g:handles:${k}`, 48, 48, 24, 36, (ctx) => {
    const p = mk(0.7, 0.4);
    ellipse(ctx, 0, 1, 15, 5, 'rgba(20,28,18,0.2)');
    const cols = Math.min(5, Math.ceil(Math.sqrt(k) * 1.2));
    for (let i = 0; i < k; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const y = 0.08 + col * 0.06 + (row % 2) * 0.03;
      const z = 1.4 + row * 2.2;
      const a = p(0.02, y, z);
      const b = p(0.66, y, z);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(40,25,10,0.5)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#c89a62' : '#d8ae78';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // a cord around the middle
    const m0 = p(0.34, 0.0, 0.3);
    const m1 = p(0.34, 0.4, 0.3 + Math.ceil(k / cols) * 1.2);
    ctx.strokeStyle = '#6b5a3a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(m0[0], m0[1]);
    ctx.lineTo(m1[0], m1[1] - 2);
    ctx.stroke();
  });
}

/** Short names the stock code in scenery.ts and construction.ts uses. */
export type StackKind = 'wood' | 'planks' | 'bricks' | 'stone' | 'cutstone' | 'clay' | 'ore' | 'charcoal' | 'iron' | 'flour' | 'grain' | 'bread' | 'handles' | 'smoked';

export function stackSprite(cache: SpriteCache, kind: StackKind, n: number): Sprite {
  switch (kind) {
    case 'wood':
      return logPile(cache, n);
    case 'planks':
      return plankStack(cache, n);
    case 'bricks':
      return brickStack(cache, n);
    case 'stone':
      return stoneHeap(cache, n);
    case 'cutstone':
      return cutStone(cache, n);
    case 'clay':
    case 'ore':
      return lumpHeap(cache, kind, n);
    case 'charcoal':
      return lumpHeap(cache, 'charcoal', n);
    case 'iron':
      return ironBars(cache, n);
    case 'flour':
    case 'grain':
      return sackPile(cache, kind, n);
    case 'bread':
      return breadBasket(cache, n);
    case 'handles':
      return handleBundle(cache, n);
    case 'smoked':
      return smokedFishTray(cache, n);
  }
}
