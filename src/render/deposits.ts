// Natural deposits: clay pits (a walkable patch of wet clay), ore veins (dark rock with metal flecks) and big pale
// stone outcrops (layered ledges). Each shrinks as it is worked, so you can see which are nearly spent.
import { hashUnit } from '../sim/rng';
import { SpriteCache, alpha, ellipse, groundShadow, line, poly, shade } from './sprites';
import type { Pt, Sprite } from './sprites';

type Ctx = CanvasRenderingContext2D;

/** a squat patch of clay: `stage` 0 nearly dug out, 1 half, 2 full */
export function clayPitSprite(cache: SpriteCache, variant: number, stage: 0 | 1 | 2): Sprite {
  const v = variant % 4;
  return cache.get(`clay${v}_${stage}`, 80, 48, 40, 28, (ctx) => {
    const rx = 28 + stage * 2;
    // damp rim of trodden earth
    ellipse(ctx, 0, 1, rx + 5, (rx + 5) * 0.46, 'rgba(92,68,44,0.5)');
    ellipse(ctx, 0, 0, rx + 1.5, (rx + 1.5) * 0.47, '#9a6c45');
    if (stage === 0) {
      // dug down into a hollow with a puddle in it
      const g = ctx.createLinearGradient(0, -10, 0, 10);
      g.addColorStop(0, '#7a4f33');
      g.addColorStop(1, '#a86f45');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, rx - 4, (rx - 4) * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ellipse(ctx, 3, 1.5, 11, 4.2, 'rgba(96,120,134,0.75)');
      ellipse(ctx, 1, 0.5, 4.5, 1.6, 'rgba(210,230,240,0.5)');
    } else {
      const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, rx);
      g.addColorStop(0, '#e8a874');
      g.addColorStop(0.6, '#cf8350');
      g.addColorStop(1, '#a8603a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -0.5, rx - 3, (rx - 3) * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // wet sheen
      ctx.fillStyle = 'rgba(255,225,190,0.35)';
      ctx.beginPath();
      ctx.ellipse(-7, -4.5, 9, 2.8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(8, 2, 6, 1.9, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // spade marks and cracks
    ctx.strokeStyle = 'rgba(90,50,26,0.45)';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 5; i++) {
      const a = hashUnit(v, i, 61) * Math.PI * 2;
      const r = 5 + hashUnit(v, i, 62) * (rx - 12);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.45;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (hashUnit(v, i, 63) - 0.5) * 7, y + (hashUnit(v, i, 64) - 0.5) * 2.5);
      ctx.stroke();
    }
    // dug-out lumps of clay left lying about
    const lumps = stage === 0 ? 1 : stage === 1 ? 3 : 5;
    for (let i = 0; i < lumps; i++) {
      const a = hashUnit(v, i, 65) * Math.PI * 2;
      const r = 6 + hashUnit(v, i, 66) * (rx - 14);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.44 - 1;
      ellipse(ctx, x + 0.5, y + 1.4, 3.8, 2, 'rgba(60,34,20,0.35)');
      ellipse(ctx, x, y, 3.6, 2.6, shade('#c07a4c', 0.9 + hashUnit(v, i, 67) * 0.25));
      ellipse(ctx, x - 1, y - 1, 1.6, 0.9, 'rgba(255,225,190,0.55)');
    }
    // a reed or two on the damp side
    for (let i = 0; i < 3; i++) {
      const x = -rx + 4 + i * 3;
      line(ctx, [x, -2], [x - 1 + i, -10 - i * 2], '#6f8f45', 1.2);
    }
  });
}

type Facet = { pts: Pt[]; tone: number };

/** a faceted boulder in three planes, as used by the loose rocks */
function chunk(ctx: Ctx, cx: number, cy: number, w: number, h: number, tone: number, top: string, left: string, right: string, stroke: string): void {
  const topP: Pt[] = [[cx - w * 0.5, cy - h * 0.5], [cx - w * 0.1, cy - h], [cx + w * 0.45, cy - h * 0.8], [cx + w * 0.55, cy - h * 0.35], [cx, cy - h * 0.25]];
  const leftP: Pt[] = [[cx - w * 0.5, cy - h * 0.5], [cx, cy - h * 0.25], [cx + w * 0.05, cy], [cx - w * 0.55, cy - h * 0.05]];
  const rightP: Pt[] = [[cx, cy - h * 0.25], [cx + w * 0.55, cy - h * 0.35], [cx + w * 0.5, cy - h * 0.02], [cx + w * 0.05, cy]];
  poly(ctx, leftP, shade(left, tone), stroke, 0.8);
  poly(ctx, rightP, shade(right, tone), stroke, 0.8);
  poly(ctx, topP, shade(top, tone), stroke, 0.8);
}

/** dark solid rock shot through with metal: `stage` 0 nearly worked out .. 2 full */
export function oreVeinSprite(cache: SpriteCache, variant: number, stage: 0 | 1 | 2): Sprite {
  const v = variant % 4;
  return cache.get(`ore${v}_${stage}`, 80, 76, 40, 54, (ctx) => {
    groundShadow(ctx, 24 + stage * 4, 8, 0.34, 3);
    const s = [0.62, 0.84, 1][stage];
    const top = '#6d6a77';
    const left = '#4b4955';
    const right = '#34323d';
    const st = 'rgba(12,12,18,0.55)';
    chunk(ctx, -10 * s, 2, 26 * s, 26 * s, 0.98, top, left, right, st);
    chunk(ctx, 12 * s, 4, 21 * s, 20 * s, 0.9, top, left, right, st);
    chunk(ctx, 0, -1, 22 * s, 30 * s, 1.04, top, left, right, st);
    if (stage === 2) chunk(ctx, -3, 5, 14 * s, 11 * s, 0.94, top, left, right, st);
    // seams of ore: jagged copper-and-gold lines across the planes, with bright flecks
    const seam = (x0: number, y0: number, x1: number, y1: number, col: string, lw: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      const n = 5;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        ctx.lineTo(x0 + (x1 - x0) * t + (hashUnit(v, i, 71 + Math.round(x0)) - 0.5) * 3.4, y0 + (y1 - y0) * t + (hashUnit(v, i, 72 + Math.round(y0)) - 0.5) * 3.4);
      }
      ctx.stroke();
    };
    seam(-14 * s, -18 * s, 6 * s, -2, '#b9772f', 1.8);
    seam(-4 * s, -24 * s, 12 * s, -10, '#d89a45', 1.3);
    seam(6 * s, 2, 18 * s, -4, '#a8622a', 1.5);
    seam(-18 * s, -4, -6 * s, 3, '#c98a3c', 1.2);
    const flecks = 8 + stage * 4;
    for (let i = 0; i < flecks; i++) {
      const x = (hashUnit(v, i, 73) - 0.5) * 38 * s;
      const y = -4 - hashUnit(v, i, 74) * 24 * s;
      ctx.fillStyle = hashUnit(v, i, 75) > 0.45 ? '#f4c26a' : '#d9873a';
      ctx.fillRect(x, y, 1.6, 1.3);
      if (hashUnit(v, i, 76) > 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(x + 0.2, y - 0.6, 0.8, 0.8);
      }
    }
    // pick marks where it has been dug at
    if (stage < 2) {
      ctx.strokeStyle = 'rgba(190,190,200,0.45)';
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) {
        const x = -8 + i * 6;
        line(ctx, [x, -5 - (i % 2) * 5], [x + 2.5, -8 - (i % 2) * 5], 'rgba(190,190,200,0.45)', 0.9);
      }
    }
  });
}

/** a big pale outcrop in layered ledges: `stage` 0 mostly cut away .. 2 untouched */
export function outcropSprite(cache: SpriteCache, variant: number, stage: 0 | 1 | 2): Sprite {
  const v = variant % 4;
  return cache.get(`outcrop${v}_${stage}`, 112, 96, 56, 66, (ctx) => {
    groundShadow(ctx, 36 + stage * 6, 11, 0.32, 3);
    const top = '#ece9de';
    const left = '#d2cfc2';
    const right = '#a9a699';
    const st = 'rgba(70,68,60,0.5)';
    const ledge = (x0: number, y0: number, w: number, h: number, tone: number) => {
      // a slab: top face, a lit front and a shaded side, with strata lines
      const dx = w * 0.5;
      const dy = w * 0.24;
      poly(ctx, [[x0 - dx, y0], [x0, y0 + dy], [x0, y0 + dy - h], [x0 - dx, y0 - h]], shade(left, tone), st, 0.9);
      poly(ctx, [[x0, y0 + dy], [x0 + dx, y0], [x0 + dx, y0 - h], [x0, y0 + dy - h]], shade(right, tone), st, 0.9);
      poly(ctx, [[x0 - dx, y0 - h], [x0, y0 + dy - h], [x0 + dx, y0 - h], [x0, y0 - dy - h]], shade(top, tone), st, 0.9);
      ctx.strokeStyle = 'rgba(90,86,76,0.35)';
      ctx.lineWidth = 0.7;
      const rows = Math.max(1, Math.floor(h / 6));
      for (let i = 1; i <= rows; i++) {
        const yy = y0 - (h * i) / (rows + 1);
        ctx.beginPath();
        ctx.moveTo(x0 - dx, yy);
        ctx.lineTo(x0, yy + dy);
        ctx.lineTo(x0 + dx, yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x0 - dx * 0.5, y0 - h + dy * 0.5 - 0.5, dx * 0.5, 1.2);
    };
    if (stage === 2) {
      ledge(-10, 4, 46, 12, 0.95);
      ledge(14, 2, 38, 18, 0.98);
      ledge(-6, -4, 34, 14, 1.02);
      ledge(6, -12, 24, 12, 1.05);
      ledge(-2, -20, 14, 8, 1.08);
    } else if (stage === 1) {
      ledge(-8, 4, 44, 11, 0.95);
      ledge(14, 2, 32, 14, 0.98);
      ledge(-4, -3, 28, 11, 1.02);
    } else {
      ledge(-4, 4, 38, 8, 0.95);
      ledge(14, 3, 24, 7, 0.99);
    }
    // chisel and wedge marks where the stone has been cut (more as it is worked)
    if (stage < 2) {
      ctx.fillStyle = 'rgba(40,38,32,0.6)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-20 + i * 9, -4 + (i % 2) * 3, 1.6, 2.2);
    }
    // rubble and a patch of moss
    for (let i = 0; i < 5 + (2 - stage) * 3; i++) {
      const a = hashUnit(v, i, 81) * Math.PI * 2;
      const r = 24 + hashUnit(v, i, 82) * 14;
      ellipse(ctx, Math.cos(a) * r, 5 + Math.sin(a) * r * 0.32, 2.6 + hashUnit(v, i, 83) * 2.4, 1.8, shade('#cfccbe', 0.8 + hashUnit(v, i, 84) * 0.3));
    }
    ctx.fillStyle = alpha('#6f9a52', 0.35);
    ctx.fillRect(-26, 3, 6, 1.6);
  });
}

export function stageOf(amount: number, max: number): 0 | 1 | 2 {
  const f = max > 0 ? amount / max : 0;
  return f > 0.62 ? 2 : f > 0.28 ? 1 : 0;
}

void (null as unknown as Facet);
